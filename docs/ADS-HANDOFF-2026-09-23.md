# Ответ лендинга → сессия Google Ads (2026-09-23)

Сессия «Google Ads campaign for Gambaryan» была недоступна для сообщения — текст для пересылки.

## 1. Якоря услуг (порядок вкладок 1–8 совпал)

| Якорь | Вкладка |
|---|---|
| `#svc-divorce` | Развод |
| `#svc-alimony` | Алименты |
| `#svc-property` | Раздел имущества |
| `#svc-children` | Дети |
| `#svc-paternity` | Отцовство |
| `#svc-mediation` | Медиация |
| `#svc-prenup` | Брачный договор |
| `#svc-protection` | Защита при угрозах |

Работают при загрузке и при смене `#` без перезагрузки, с параметрами перед `#`
(`https://lp.gambarian.com/?utm_source=google&…&gclid=…#svc-alimony`). `#services` без уточнения — «Развод».
`service_select` — ровно 1 раз, `via=anchor` (проверено живьём: dataLayer и GA4).

## 2. Деплой

Cloudflare Pages `gambarian-landing`, deployment `e6138308` (main), коммит `0f65bca` на `codex/final-dev5`.
Байт в байт: HTML `lp.gambarian.com` = `build/production/index.html`, sha256 `b30026ff27b0d6bc`.
WhatsApp 5/5 → `wa.me/972587803188` (старых 0); `tel:` 5/5 → `+972545490623`; `GTM-MFLHW63Q` 1×.
Живой клик WhatsApp → `contact_click` (method=whatsapp) → запрос Ads-конверсии label `HEcnCPHu2YEdEOPClMRE`.

## 3. Тестовая заявка

Настоящая форма, трафик помечен internal: `/api/lead` → 202, submission_id `dd9da8b8-26d9-4e70-b88e-9fb1e9b1fe10`
→ строка с тем же id в Google Sheet `Leads_web_LP`, лист «Входящие» (Albato `GAMB_ADV`, 389465)
→ `generate_lead` в GA4 `G-P4MQ85ME2D` (Realtime, поток lp)
→ запрос Ads «Заявка — форма lp.gambarian.com», label `ccbrCO7u2YEdEOPClMRE`, order_id = submission_id.
В отчётах Ads не появится (не было клика по объявлению) — ожидаемо.

По пути: телефон `+972…` ложился в Sheets как `#ERROR!` → сервер ставит `'` перед `= + - @` (`0c299e2`), повторный
тест — телефон текстом. **Пауза сценария GAMB_ADV в Albato теряет заявки** (Albato отвечает 200, после Start не
обрабатывает) — сценарий не ставить на паузу. Серверное хранилище лидов (KV/D1/R2 + повторы) — в доработке после
ревью, выкладка отдельно.

Можно менять конечные URL быстрых ссылок и объявления «Алименты» на якоря.
