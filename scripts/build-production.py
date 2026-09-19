"""Сборка основной версии (production) для lp.gambarian.com из final-dev5.

PRODUCTION-BUILD v1.0.0 | 2026-09-19

Основная версия = утверждённое превью final-dev5 с тремя отличиями:
  1. без демо-переключателя «Авто / Демо» рабочего времени — это инструмент показа
     режимов панели владельцу, посетителю его видеть нельзя (action-bar.js работает
     без кнопки: все обращения под `if (demoToggle)`);
  2. og:url = https://lp.gambarian.com/;
  3. картинка превью ссылки (og:image, twitter:image) — с lp, а не с alias final-dev.
gambarian-standalone.html в основную версию не входит: это копия страницы для
согласования, отдельный адрес ей на lp не нужен. noindex остаётся (docs/LAUNCH-LP-GAMBARIAN.md).

Запуск из корня репозитория после сборки превью:
  python -B scripts/build-production.py
"""
import hashlib
import io
import re
import shutil
from pathlib import Path

SRC = Path('build/variants/final-dev5')
DST = Path('build/production')
OG_URL = 'https://lp.gambarian.com/'
SKIP = {'gambarian-standalone.html'}

if not (SRC / 'index.html').is_file():
    raise SystemExit('Нет сборки %s — сначала собрать превью (scripts/full-checks.sh)' % SRC)

if DST.exists():
    shutil.rmtree(DST)
shutil.copytree(SRC, DST, ignore=lambda d, names: [n for n in names if Path(d) == SRC and n in SKIP])

page = DST / 'index.html'
# newline='' — концы строк сборки (CRLF на Windows) сохраняются, дифф с превью = две правки.
html = io.open(page, encoding='utf-8', newline='').read()

html, n_toggle = re.subn(r'<button class="mobile-bar-demo".*?</button>\r?\n?', '', html, flags=re.S)
html, n_og = re.subn(r'(<meta property="og:url" content=")[^"]*(">)', r'\g<1>%s\g<2>' % OG_URL, html)
# Картинка превью ссылки в сборке указывает на чужой alias final-dev; на lp — свой файл.
html, n_img = re.subn(r'https://[a-z0-9-]+\.gambarian-landing\.pages\.dev/(social-preview-[^"]+\.png)',
                      OG_URL + r'\g<1>', html)

errors = []
if n_toggle != 1:
    errors.append('демо-переключатель: удалено %d, ожидался 1' % n_toggle)
if n_og != 1:
    errors.append('og:url: заменено %d, ожидался 1' % n_og)
if n_img != 3:
    errors.append('картинка превью: заменено %d, ожидалось 3 (og:image, og:image:secure_url, twitter:image)' % n_img)
if re.search(r'https?://[^"\s<>]*pages\.dev', html):
    errors.append('в разметке остался адрес pages.dev')
if 'mobile-bar-demo' in html or 'data-business-demo' in html:
    errors.append('в разметке остались следы демо-переключателя')
if '<meta name="robots" content="noindex">' not in html:
    errors.append('нет noindex')
if any((DST / n).exists() for n in SKIP):
    errors.append('в сборку попал исключённый файл')
if errors:
    raise SystemExit('ОТКАЗ: ' + '; '.join(errors))

io.open(page, 'w', encoding='utf-8', newline='').write(html)
digest = hashlib.sha256(html.encode('utf-8')).hexdigest()[:16]
print('PASS PRODUCTION-BUILD v1.0.0: %s -> %s; без демо-переключателя; og:url и картинка превью на %s; index.html sha256 %s'
      % (SRC, DST, OG_URL, digest))
