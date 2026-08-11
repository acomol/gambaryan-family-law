# Локальная приёмка десяти клиентских Preview

**Версия:** `CLIENT-PREVIEW-LOCAL-QA v1.0.0`

**Дата:** `2026-08-11`

**Статус:** `PASS LOCAL / LIVE PENDING`

**Проверенная база:** рабочее дерево поверх `43ffeb446cb3ef85a31dfa20cc82b9c348da9058`;
release commit фиксируется отдельным live-отчётом после push/deploy.

## Окружение

- Windows, timezone `Asia/Jerusalem`;
- Python Playwright, системный Chrome `151.0.7922.108`, headless;
- локальный HTTP server из корня репозитория;
- Action Bar `2.3.1 | 2026-08-11`;
- Client Preview Mobile `1.0.0 | 2026-08-11`;
- Preview map `2.3.0 | 2026-08-11`.

## Что выполнено

| Набор | Матрица | Результат |
|---|---|---:|
| Основной | 10 alias × `360×600`, `360×668`, `390×724`, `390×844`, `720×760`, `860×760`, `861×760`, `1024×768`, `1280×720`, `1440×900` | `100/100 PASS` |
| Breakpoint/landscape | 10 alias × `960×760`, `961×760`, `960×400`, `960×401`, `844×390` | `50/50 PASS` |
| Large desktop | базовый Hero, Hero A, Hero B × `1920×1080`, `2560×1440` | `6/6 PASS` |

Для каждой основной/пограничной ячейки в ходе прогона проверялись:

- `scrollWidth === clientWidth`;
- наличие Hero, фото, CTA и version markers;
- computed `font-family` и фактическая загрузка заявленного семейства;
- нижний запас после последней Hero CTA на коротком portrait;
- состояние/высота/режим Action Bar на соответствующем breakpoint;
- variant marker/class и 102 уникальных номера для `review-numbered`;
- browser console warning/error и page errors.

Raw per-cell JSON не коммитился. В репозитории сохраняется проверяемый агрегат,
точная матрица и thresholds; репрезентативные изображения оставлены вне Git в
`%TEMP%\gambarian-client-preview-qa\`.

## Измеренные границы

- минимальный запас после последней CTA: `8.7px`;
- `review-numbered`: минимум `14.7px`;
- Action Bar: `60px`, fixed до `960px`, `display:none` от `961px`, static при
  высоте до `400px`;
- horizontal overflow: `0` во всех `156` ячейках;
- console warnings/errors: `0` во всех `156` ячейках.

## Интеракции

На `final-dev` и `final-dev1` отдельно пройдены:

- Hero hidden/inert → reading visible → form hidden/inert → возврат visible;
- открытие/закрытие menu;
- focus/blur поля без scroll jump;
- reduced-motion переход к `#services`;
- fallback без `IntersectionObserver`;
- demo-switch: Auto/Demo + open/closed, `3 ↔ 2`, focus остаётся на switch,
  URL/storage/dataLayer не меняются;
- native autofill `name/tel/email`, focus первого ошибочного поля, inline error
  и summary.

## Репрезентативные screenshots

- `final-dev1-1440x900.png`;
- `final-dev1-mobile-390x844.png`;
- `final-dev1-validation-390x844.png`;
- `v2-lora-inter-1280x720.png`;
- `review-numbered-360x600-fixed2.png`;
- `review-numbered-390x844.png`.

## Повторяемые статические gates

```powershell
$env:PYTHONUTF8='1'
python -B scripts/verify-client-previews.py
node --check site-addons/action-bar/action-bar.js
node scripts/verify-lead-hook.mjs
npm run check
git diff --check
git diff --exit-code -- site functions
```

## Не закрыто этим отчётом

- live-readback после публикации `2.3.1` на десяти Cloudflare alias;
- реальный POST в Albato;
- iPhone safe-area и реальное системное автозаполнение сохранённого контакта;
- WhatsApp/Telegram social card на физическом клиенте.

## Related

- [Клиентский handoff](../CLIENT-PREVIEW-HANDOFF.md)
- [Browser QA contract](../tasks/2026-08-10-all-previews-browser-qa.md)
- [Итоговый чек-лист](../FINAL-QA-CHECKLIST.md)
- [Live release-отчёт](2026-08-11-client-preview-live-release.md)
