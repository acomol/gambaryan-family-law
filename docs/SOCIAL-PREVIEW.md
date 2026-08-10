# Предпросмотр ссылки

**Версия контракта:** `1.0.0`
**Обновлено:** `2026-08-10`

При пересылке URL лендинга карточка ссылки должна показывать фирменный
логотип «Гамбарян & Партнёры — Адвокаты», а не фотографию hero.

## Карта изменений

| Элемент | Единый источник | Производные |
|---|---|---|
| Версия и дата | комментарий `SOCIAL-PREVIEW` в `site/index.html` | проверяются builder-скриптом |
| Title/description/image/alt | Open Graph + Twitter block в `site/index.html` | все `build/font-variants/*` и `build/variants/*` |
| Визуал логотипа | `scripts/build-social-preview.py` | `site/social-preview-logo-v1.0.0-1200x630.png` |
| Публичный origin | абсолютные URL в metadata block | сейчас `https://gambarian-landing.pages.dev` |

При изменении визуала, размера, текста, URL или требований платформ:

1. установить pinned build tools: `python -m pip install -r requirements-build.txt`
   и `python -m playwright install chromium`;
2. увеличить SemVer и обновить дату в `site/index.html` и этом документе;
3. изменить versioned filename в `og:image` и `twitter:image`;
4. выполнить `python scripts/build-social-preview.py`;
5. пересобрать standalone и восемь вариантов штатными генераторами;
6. выполнить `python scripts/build-social-preview.py --check` и live-readback.

При подключении `www.gambarian.com` заменить только публичный origin во всех
URL metadata block; `noindex` снимается отдельно по инструкции `docs/DEPLOY.md`.

## Приёмка

- `og:url` и `og:image` — абсолютные HTTPS URL;
- PNG имеет размер `1200×630`, MIME `image/png`, versioned filename и вес до
  5 MB;
- присутствуют `og:image:secure_url`, `type`, `width`, `height`, `alt`;
- Twitter Card использует тот же image/title/description/alt;
- PNG визуально воспроизводит логотип из шапки: белый wordmark, золотой `&`,
  золотая линия и подпись «АДВОКАТЫ» на фоне `#101214`;
- production HTML и PNG возвращают `200`, корректные MIME и не блокируются
  `robots.txt`/авторизацией;
- после деплоя карточка проверена на всех целевых поверхностях: Facebook
  Sharing Debugger, LinkedIn Post Inspector, X, реальный WhatsApp и Telegram;
- при замене изображения используется новый versioned filename, чтобы старый
  preview не оставался в кеше платформ.

## Related

- [Куда публикуется сайт](DEPLOY.md)
- [The Open Graph protocol](https://ogp.me/)
