"""Сборка основной версии (production) для lp.gambarian.com из final-dev5.

PRODUCTION-BUILD v1.1.0 | 2026-09-22

Основная версия = утверждённое превью final-dev5 с четырьмя отличиями:
  1. без демо-переключателя «Авто / Демо» рабочего времени — это инструмент показа
     режимов панели владельцу, посетителю его видеть нельзя (action-bar.js работает
     без кнопки: все обращения под `if (demoToggle)`);
  2. og:url = https://lp.gambarian.com/;
  3. картинка превью ссылки (og:image, twitter:image) — с lp, а не с alias final-dev.
  4. GTM загружается только на lp.gambarian.com; на pages.dev не выполняется.
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
GTM_SNIPPET = """<!-- Google Tag Manager -->
<script>
if (location.hostname === 'lp.gambarian.com') {
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-MFLHW63Q');
}
</script>
<!-- End Google Tag Manager -->"""

if not (SRC / 'index.html').is_file():
    raise SystemExit('Нет сборки %s — сначала собрать превью (scripts/full-checks.sh)' % SRC)

if DST.exists():
    shutil.rmtree(DST)
shutil.copytree(SRC, DST, ignore=lambda d, names: [n for n in names if Path(d) == SRC and n in SKIP])

page = DST / 'index.html'
# newline='' — концы строк сборки сохраняются.
html = io.open(page, encoding='utf-8', newline='').read()
if 'googletagmanager.com' in html or 'GTM-MFLHW63Q' in html:
    raise SystemExit('ОТКАЗ: сниппет GTM уже есть в Preview')
html, n_gtm = re.subn(r'<head>', lambda _: '<head>\n' + GTM_SNIPPET, html)

html, n_toggle = re.subn(r'<button class="mobile-bar-demo".*?</button>\r?\n?', '', html, flags=re.S)
html, n_og = re.subn(r'(<meta property="og:url" content=")[^"]*(">)', r'\g<1>%s\g<2>' % OG_URL, html)
# Картинка превью ссылки в сборке указывает на чужой alias final-dev; на lp — свой файл.
html, n_img = re.subn(r'https://[a-z0-9-]+\.gambarian-landing\.pages\.dev/(social-preview-[^"]+\.png)',
                      OG_URL + r'\g<1>', html)

errors = []
if n_gtm != 1 or html.count(GTM_SNIPPET) != 1 or html.count('GTM-MFLHW63Q') != 1:
    errors.append('GTM: ожидался ровно один сниппет в head')
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
print('PASS PRODUCTION-BUILD v1.1.0: %s -> %s; без демо-переключателя; GTM ровно 1, только lp.gambarian.com; og:url и картинка превью на %s; index.html sha256 %s'
      % (SRC, DST, OG_URL, digest))
