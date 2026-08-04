"""Сборка site/ в одну самодостаточную страницу для превью.

Все картинки, шрифты, стили и скрипт вшиваются в документ как data-URI,
внешних запросов не остаётся. Нужно для публикации превью там, где нет
деплоя ветки, и для проверки страницы одним файлом.

Запуск из корня репозитория:
    python scripts/build-preview.py [выходной-файл]
"""
import base64
import mimetypes
import os
import re
import sys

SITE = "site"
OUT = sys.argv[1] if len(sys.argv) > 1 else "preview.html"

mimetypes.add_type("font/woff2", ".woff2")


def data_uri(path):
    mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
    return f"data:{mime};base64," + base64.b64encode(open(path, "rb").read()).decode()


def read(name):
    return open(os.path.join(SITE, name), encoding="utf-8").read()


html, css, fontcss, js = read("index.html"), read("styles.css"), read("fonts.css"), read("app.js")

for font in sorted(set(re.findall(r"fonts/([A-Za-z0-9._-]+)", fontcss)), key=len, reverse=True):
    fontcss = fontcss.replace(f"fonts/{font}", data_uri(os.path.join(SITE, "fonts", font)))

for asset in sorted(set(re.findall(r"assets/[A-Za-z0-9._-]+", html + css)), key=len, reverse=True):
    full = os.path.join(SITE, asset)
    if os.path.exists(full):
        uri = data_uri(full)
        html = html.replace(asset, uri)
        css = css.replace(asset, uri)

# Ресурсы уже внутри документа — preload, внешние стили и скрипт не нужны.
html = re.sub(r'\s*<link rel="(?:preload|stylesheet)"[^>]*>', "", html)
html = re.sub(r'\s*<script src="app\.js"[^>]*></script>', "", html)

title = re.search(r"<title>(.*?)</title>", html, re.S).group(1)
body = re.search(r"<body>(.*)</body>", html, re.S).group(1)

# Страница намеренно одна тёмная тема — фиксируем фон в обеих темах смотрелки.
theme = ':root, :root[data-theme="light"], :root[data-theme="dark"]' \
        " { color-scheme: dark; background: #101214; }"

page = f"<title>{title}</title>\n<style>\n{theme}\n{fontcss}\n{css}\n</style>\n{body}\n<script>\n{js}\n</script>\n"
open(OUT, "w", encoding="utf-8").write(page)

external = re.findall(r'(?:src|href)="(?!data:|#|tel:|https://wa\.me)([^"]*)"', page)
print(f"{OUT}: {len(page.encode()) / 1024 / 1024:.2f} MB")
print(f"внешних ссылок: {len(external)}" + (f" -> {external}" if external else ""))
