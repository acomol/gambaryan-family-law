"""Сборка основной версии (production) для lp.gambarian.com из final-dev5.

PRODUCTION-BUILD v1.3.0 | 2026-09-23

Основная версия = утверждённое превью final-dev5 с шестью отличиями:
  1. без демо-переключателя «Авто / Демо» рабочего времени — это инструмент показа
     режимов панели владельцу, посетителю его видеть нельзя (action-bar.js работает
     без кнопки: все обращения под `if (demoToggle)`);
  2. og:url = https://lp.gambarian.com/;
  3. картинка превью ссылки (og:image, twitter:image) — с lp, а не с alias final-dev.
  4. GTM загружается только на lp.gambarian.com; на pages.dev не выполняется;
  5. перед GTM — согласие по умолчанию: EEA/UK/CH denied, остальным granted, ad_personalization denied везде.
  6. v1.3.0: SEO/sharing-слой по плейбуку ADFIX §1.5 и head эталона Ассуты — canonical, author,
     hreflang ru/x-default, favicon PNG 32×32 и apple-touch-icon 180×180 вместо SVG data-URI,
     квадрат превью 1254×1254 первым og:image (1200×630 — вторым, twitter остаётся 1200×630),
     JSON-LD LegalService + url/alternateName/logo/image/geo. Картинки — site-addons/production/
     (только lp; превью и site/ не меняются). FAQPage нет: на странице нет блока вопросов.
gambarian-standalone.html в основную версию не входит: это копия страницы для
согласования, отдельный адрес ей на lp не нужен. noindex остаётся (docs/LAUNCH-LP-GAMBARIAN.md).

Запуск из корня репозитория после сборки превью:
  python -B scripts/build-production.py
"""
import hashlib
import io
import json
import re
import shutil
import struct
from pathlib import Path

SRC = Path('build/variants/final-dev5')
DST = Path('build/production')
OG_URL = 'https://lp.gambarian.com/'
SKIP = {'gambarian-standalone.html'}
# Картинки только для lp. Квадрат отрисован тем же способом, что и 1200×630 (Chromium + Onest,
# вёрстка удалённого scripts/build-social-preview.py, e3bfaa0^): холст 1200×1200 при DPR 1.045.
# Иконки — растр SVG data-URI из scripts/action_bar_addon.py.
ADDON = Path('site-addons/production')
SQUARE = 'social-preview-logo-v1.1.0-1254x1254.png'
ASSETS = {SQUARE: (1254, 1254), 'favicon.png': (32, 32), 'apple-touch-icon.png': (180, 180)}
SQUARE_URL = OG_URL + SQUARE
WIDE_URL = OG_URL + 'social-preview-logo-v1.0.2-1200x630.png'
# Офис «Карлибах 10, Тель-Авив» (קרליבך 10, תל אביב–יפו), замер 2026-09-23: Nominatim и Photon —
# 32.069233, 34.783136 (узел OSM 2078972258); ArcGIS World Geocoder (PointAddress) — 32.069150,
# 34.783259; расхождение 14.8 м. Округлено до 5 знаков.
GEO = {'@type': 'GeoCoordinates', 'latitude': 32.06923, 'longitude': 34.78314}
LD_ADD = {'alternateName': ['Gambarian & Partners'], 'url': OG_URL, 'logo': SQUARE_URL, 'image': SQUARE_URL}
# Согласие по умолчанию — до GTM (developers.google.com/tag-platform/security/guides/consent:
# «If your consent code is called out of order, consent defaults won't work»).
# EEA/UK/CH — всё denied (баннера нет, эти посетители не измеряются); остальным — granted,
# кроме ad_personalization: для темы развода персонализация рекламы запрещена политикой
# Google («Relationship hardships»), поэтому denied везде. План: docs/TRACKING-REQUIREMENTS.md §8.
CONSENT_REGIONS = ("AT BE BG HR CY CZ DK EE FI FR DE GR HU IS IE IT LV LI LT LU MT NL NO PL "
                   "PT RO SK SI ES SE GB CH").split()
GTM_SNIPPET = """<!-- Google Tag Manager -->
<script>
if (location.hostname === 'lp.gambarian.com') {
  window.dataLayer = window.dataLayer || [];
  var gtag = window.gtag || function(){dataLayer.push(arguments);};
  window.gtag = gtag;
  gtag('consent', 'default', {ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', region: [%s]});
  gtag('consent', 'default', {ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied', analytics_storage: 'granted'});
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':""" % ", ".join("'%s'" % r for r in CONSENT_REGIONS) + """
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-MFLHW63Q');
}
</script>
<!-- End Google Tag Manager -->"""

if not (SRC / 'index.html').is_file():
    raise SystemExit('Нет сборки %s — сначала собрать превью (scripts/full-checks.sh)' % SRC)
if not all((ADDON / n).is_file() for n in ASSETS):
    raise SystemExit('Нет картинок lp в %s: %s' % (ADDON, ', '.join(ASSETS)))

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

# SEO/sharing-слой lp (v1.3.0). Структура head — как у эталона Ассуты; концы строк — как в сборке.
nl = '\r\n' if '\r\n' in html else '\n'
for name in ASSETS:
    shutil.copyfile(ADDON / name, DST / name)
seo = nl.join([
    '<meta name="author" content="Гамбарян &amp; Партнёры">',
    '<link rel="canonical" href="%s">' % OG_URL,
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '<link rel="alternate" hreflang="ru" href="%s">' % OG_URL,
    '<link rel="alternate" hreflang="x-default" href="%s">' % OG_URL,
])
html, n_seo = re.subn(r'(<meta name="theme-color" content="[^"]*">)(\r?\n)',
                      lambda m: m.group(1) + nl + seo + m.group(2), html)
html, n_svg_icon = re.subn(r'<link rel="icon" href="data:image/svg\+xml,[^"]*">\r?\n', '', html)
# Квадрат для WhatsApp/Telegram — первым og:image, с тем же alt; 1200×630 остаётся вторым набором.
og_alt = re.findall(r'<meta property="og:image:alt" content="([^"]*)">', html)
square = nl.join([
    '<meta property="og:image" content="%s">' % SQUARE_URL,
    '<meta property="og:image:secure_url" content="%s">' % SQUARE_URL,
    '<meta property="og:image:type" content="image/png">',
    '<meta property="og:image:width" content="1254">',
    '<meta property="og:image:height" content="1254">',
    '<meta property="og:image:alt" content="%s">' % (og_alt[0] if og_alt else ''),
]) + nl
html, n_square = re.subn(r'(?=<meta property="og:image" content=")', lambda _: square, html, count=1)
# JSON-LD: только добавить ключи, исходный текст блока не переписывать.
ld_match = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
ld_old = ld_new = ld_match.group(1) if ld_match else ''
ld_name = '"name": "Гамбарян & Партнёры",' + nl
ld_addr = '"addressCountry": "IL"' + nl + '  },' + nl
n_ld_name, n_ld_addr = ld_old.count(ld_name), ld_old.count(ld_addr)
if ld_match and n_ld_name == 1 and n_ld_addr == 1:
    ld_new = ld_new.replace(ld_name, ld_name + ''.join(
        '  %s: %s,%s' % (json.dumps(k), json.dumps(v, ensure_ascii=False), nl) for k, v in LD_ADD.items()))
    ld_new = ld_new.replace(ld_addr, ld_addr + '  "geo": %s,%s' % (json.dumps(GEO), nl))
    html = html[:ld_match.start(1)] + ld_new + html[ld_match.end(1):]


def png_size(path):
    data = path.read_bytes()[:24] if path.is_file() else b''
    if data[:8] != b'\x89PNG\r\n\x1a\n' or data[12:16] != b'IHDR':
        return None
    return struct.unpack('>II', data[16:24])


errors = []
if n_gtm != 1 or html.count(GTM_SNIPPET) != 1 or html.count('GTM-MFLHW63Q') != 1:
    errors.append('GTM: ожидался ровно один сниппет в head')
if html.count("gtag('consent', 'default'") != 2 or html.find("gtag('consent', 'default'") > html.find('gtm.js'):
    errors.append('согласие: ожидались 2 значения по умолчанию, оба до загрузки gtm.js')
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
# SEO/sharing-слой (v1.3.0)
if n_seo != 1:
    errors.append('SEO-блок head: вставлен %d раз, ожидался 1 (после theme-color)' % n_seo)
if re.findall(r'<link rel="canonical" href="([^"]*)">', html) != [OG_URL] or html.count('rel="canonical"') != 1:
    errors.append('canonical: ожидался ровно один, на %s' % OG_URL)
if n_svg_icon != 1 or re.findall(r'<link rel="icon"[^>]*>', html) != [
        '<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png">']:
    errors.append('favicon: ожидалась одна ссылка на /favicon.png вместо SVG data-URI')
if html.count('rel="apple-touch-icon"') != 1:
    errors.append('apple-touch-icon: ожидался ровно один')
if re.findall(r'<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">', html) != [('ru', OG_URL), ('x-default', OG_URL)]:
    errors.append('hreflang: ожидались ровно ru и x-default на %s' % OG_URL)
if html.count('<meta name="author" content="Гамбарян &amp; Партнёры">') != 1 or html.count('name="author"') != 1:
    errors.append('author: ожидался ровно один')
if re.search(r'http-equiv="(cache-control|pragma|expires)"', html, re.I):
    errors.append('в head попали no-cache meta стейджинга')
og = {k: re.findall(r'<meta property="og:image%s" content="([^"]*)">' % k, html)
      for k in ('', ':secure_url', ':type', ':width', ':height', ':alt')}
if n_square != 1 or og[''] != [SQUARE_URL, WIDE_URL] or og[':secure_url'] != [SQUARE_URL, WIDE_URL]:
    errors.append('og:image: %r, ожидалось ровно 2 — квадрат первым, затем 1200×630' % og[''])
if og[':type'] != ['image/png'] * 2 or og[':width'] != ['1254', '1200'] or og[':height'] != ['1254', '630']:
    errors.append('og:image type/width/height не совпадают с [1254×1254, 1200×630]')
if len(og[':alt']) != 2 or og[':alt'][0] != og[':alt'][1] or not og[':alt'][0]:
    errors.append('og:image:alt: ожидались два одинаковых непустых')
if re.findall(r'<meta name="twitter:image" content="([^"]*)">', html) != [WIDE_URL] or \
        '<meta name="twitter:card" content="summary_large_image">' not in html:
    errors.append('twitter: ожидалась summary_large_image с картинкой 1200×630')
for name, size in ASSETS.items():
    if png_size(DST / name) != size:
        errors.append('%s: нет в сборке или размер не %d×%d' % ((name,) + size))
if png_size(DST / WIDE_URL[len(OG_URL):]) != (1200, 630):
    errors.append('картинка 1200×630 из og:image не найдена в сборке')
if not ld_match or n_ld_name != 1 or n_ld_addr != 1:
    errors.append('JSON-LD: не найден блок или якоря name/address (найдено %d/%d)' % (n_ld_name, n_ld_addr))
else:
    try:
        ld = json.loads(ld_new)
        if ld != dict(json.loads(ld_old), geo=GEO, **LD_ADD):
            errors.append('JSON-LD: изменено что-то кроме url/alternateName/logo/image/geo')
        if ld.get('@type') != 'LegalService' or not all(k in ld for k in ('url', 'alternateName', 'geo')):
            errors.append('JSON-LD: нет LegalService с url/alternateName/geo')
    except ValueError as exc:
        errors.append('JSON-LD не парсится: %s' % exc)
if errors:
    raise SystemExit('ОТКАЗ: ' + '; '.join(errors))

io.open(page, 'w', encoding='utf-8', newline='').write(html)
digest = hashlib.sha256(html.encode('utf-8')).hexdigest()[:16]
print('PASS PRODUCTION-BUILD v1.3.0: %s -> %s; без демо-переключателя; GTM ровно 1, только lp.gambarian.com; og:url и картинка превью на %s; '
      'SEO: canonical 1, og:image 2 (квадрат первым), hreflang ru/x-default, favicon PNG, JSON-LD url/alternateName/geo; index.html sha256 %s'
      % (SRC, DST, OG_URL, digest))
