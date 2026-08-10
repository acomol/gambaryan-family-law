"""Сборка site/ в одну самодостаточную страницу.

Все картинки, шрифты, стили и скрипт вшиваются в документ как data-URI,
внешних запросов не остаётся. Нужно для публикации превью там, где нет
деплоя ветки, и для проверки страницы одним файлом.

Два режима вывода:

* по умолчанию — **фрагмент** (title + style + разметка + script) без
  doctype/html/head/body. Такой файл ждёт смотрелка artifact: она сама
  оборачивает содержимое в скелет документа;
* `--standalone` — **полный документ** с doctype, head и мета-тегами.
  Открывается двойным кликом и отдаётся веб-сервером как обычная страница.

Запуск из корня репозитория:
    python scripts/build-preview.py [выходной-файл] [--standalone]
"""
import base64
import mimetypes
import os
import re
import sys

SITE = "site"
argv = [a for a in sys.argv[1:] if not a.startswith("--")]
STANDALONE = "--standalone" in sys.argv
OUT = argv[0] if argv else "preview.html"

mimetypes.add_type("font/woff2", ".woff2")


def data_uri(path):
    mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
    return f"data:{mime};base64," + base64.b64encode(open(path, "rb").read()).decode()


def read(name):
    return open(os.path.join(SITE, name), encoding="utf-8").read()


html, css, fontcss, contractjs, js = (
    read("index.html"),
    read("styles.css"),
    read("fonts.css"),
    read("lead-contract.js"),
    read("app.js"),
)

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
html = re.sub(r'\s*<script src="(?:lead-contract|app)\.js"[^>]*></script>', "", html)

title = re.search(r"<title>(.*?)</title>", html, re.S).group(1)
body = re.search(r"<body>(.*)</body>", html, re.S).group(1)

# Страница намеренно одна тёмная тема — фиксируем фон в обеих темах смотрелки.
# Фон задаётся и на body: обёртка смотрелки artifact выставляет светлый
# background именно на body, и правило только для :root им перекрывается —
# страница выходила «светлое на светлом». См. docs/ERRORS.md.
theme = (
    ':root, :root[data-theme="light"], :root[data-theme="dark"]'
    " { color-scheme: dark; background: #101214; }\n"
    'body, :root[data-theme="light"] body, :root[data-theme="dark"] body'
    " { margin: 0; background: #101214; color: #f2efe9; }"
)

style = f"<style>\n{theme}\n{fontcss}\n{css}\n</style>"
script = f"<script>\n{contractjs}\n{js}\n</script>"

if STANDALONE:
    head = re.search(r"<head>(.*?)</head>", html, re.S).group(1).strip()
    # og:image после вшивания превратился бы в мегабайтный data-URI внутри
    # мета-тега: соцсети такое не читают, а вес страницы растёт вдвое.
    head = re.sub(r'\s*<meta property="og:image"[^>]*>', "", head)
    page = ('<!DOCTYPE html>\n<html lang="ru">\n<head>\n'
            f"{head}\n{style}\n</head>\n<body>\n{body}\n{script}\n</body>\n</html>\n")
else:
    page = f"<title>{title}</title>\n{style}\n{body}\n{script}\n"

open(OUT, "w", encoding="utf-8").write(page)

external = re.findall(r'(?:src|href)="(?!data:|#|tel:|https://wa\.me)([^"]*)"', page)
print(f"{OUT}: {len(page.encode()) / 1024 / 1024:.2f} MB")
print(f"внешних ссылок: {len(external)}" + (f" -> {external}" if external else ""))
