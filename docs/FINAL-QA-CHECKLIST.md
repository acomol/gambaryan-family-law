# Финальный чек-лист проекта

**Версия:** `1.3.3`

**Обновлено:** `2026-08-11`

**Ветка:** `claude/website-development-kb0fu0`

**Функциональный baseline:** `8ccc8201e9b77e8c8069fed8cc548e50df497aa8`

**Функциональный baseline `final-dev1`:** `51e9b8241fae3acdf693c569156e21c50a71ac50`

**Независимая приёмка baseline:** `51e9b8241fae3acdf693c569156e21c50a71ac50`

**Клиентский Preview release:** `98374c133f91a7c47112561f86debbcec2129f6c`

**Preview release `final-dev3`:** `88efa2ce0fb9dc5903e1f435310b372383a20d09`

**Кандидат `final-dev3 v1.1.0`:** `LIVE PASS`

**Handoff task/base:** `e48bd08a66d5e38be7dae9105333f080d0e3c4d1`

Этот документ объединяет принятые владельцем решения, ошибки проекта,
регрессионные проверки и незакрытые production-пункты. Он предназначен для
финального прогона Codex/Claude и не заменяет тематические спецификации.

## Как читать статусы

- `[x]` — проверено кодом и/или живым readback на указанном baseline.
- `[ ] BLOCKER` — без этого нельзя считать соответствующий production-поток
  готовым.
- `[ ] OPEN` — известный долг или расхождение; не скрывать в отчёте.
- `[ ] MANUAL` — требуется физическое устройство или внешняя система.
- `[ ] CLARIFY` / `[ ] CLIENT` — требуется явное решение владельца/заказчика;
  агент не выбирает вариант самостоятельно.
- `PARTIAL` — часть критерия реализована, но точная приёмка не закрыта.

Статус относится к состоянию на дату документа. После изменения исходников,
версии контракта, Cloudflare deployment или внешней настройки пункт проверяется
заново.

## Текущий итог

| Контур | Статус на `2026-08-11` |
|---|---|
| Десять Preview | **LIVE PASS:** commit `98374c1`, Action Bar `2.3.1`, Client Preview Mobile `1.0.0`; локальные 100/100 + 50/50 + 6/6 и live HTTP/browser readback 10/10 прошли |
| `final-dev1` | **LIVE PASS:** Hero `1.3.0`, Precedent Copy `1.0.0` и исходные assets сохранены; marker `FINAL-DEV1-DESIGN` отсутствует |
| `final-dev3` | **LIVE PASS `v1.1.0`:** commit `88efa2c`, deployment `52a9addb-0166-4f78-8c7d-5f1b0ed2ad07`, live `15/15`, локальная карта `173/173`, Hero business-hours и isolation PASS. `v1.0.0` сохранён как исторический release |
| Production | **Не обновлён финальными Preview-функциями намеренно:** нет live lead hook/логотипа, `og:image` относительный |
| Albato | **BLOCKED:** secret, Catch, destination dedup и конечный readback не выполнены |
| Privacy | **BLOCKED:** утверждённого notice/policy рядом с формой нет |
| Аналитика | **OPEN:** GTM/GA4 не подключены; конфликт события form anchor не решён |
| Реальные устройства | **MANUAL:** iPhone safe-area, WhatsApp/Telegram preview и GTM mobile clicks |
| Инженерный долг | Font docs/weight, CI coverage, PR metadata и npm audit |

## Приоритет требований и принятые исключения

При конфликте документов использовать такой порядок:

1. последнее явное решение владельца;
2. задания от `2026-08-10` и их секции «Приёмка»;
3. versioned-контракты и карта Preview;
4. более ранние композиционные и исследовательские документы.

| Тема | Принятое решение | Что оно переопределяет |
|---|---|---|
| Фото адвокатов | На mobile обе рамки `16/15`; для Александра разрешён `object-position: center 16%`, чтобы макушки были на одном уровне | Первоначальное «object-position не менять» в задаче на фото; последующее прямое требование владельца о симметрии имеет приоритет |
| Desktop-фото | Сохраняется `4/5`; desktop не меняется | Полная desktop-симметрия потребовала бы новых перекадрированных исходников и вышла бы за приёмку |
| Hero | Два разных действия: запись и звонок; WhatsApp вынесен из Hero | Раннюю композиционную запись о паре «форма + мессенджер» |
| Action Bar | Зонная модель плюс расписание `Asia/Jerusalem`: вс–чт `[09:00, 18:00)` — 3 действия, остальное время — запись и WhatsApp; Preview demo-switch показывает оба состояния; версия `2.3.1` синхронно меняет верхнюю подпись и нижний состав | Первую реализацию с порогом/направлением, постоянный состав из трёх действий и прежнее ограничение только отдельным вариантом `action-bar` |
| Production | Action Bar не внедряется в `site/index.html`; production не изменяется при сборке Preview | Желание показать панель клиенту реализуется через производные Preview, а не через боевой источник |
| `final-dev` | Использует тот же канонический артефакт, что `action-bar`, но публикуется отдельным alias | Создание второго идентичного build-каталога |
| `final-dev1` | Отдельный desktop Hero без дублирующего телефона в шапке; на mobile фото увеличено `1.15×` и сдвинуто на `7%` влево, интервалы сохраняют обе CTA от `360×600`; desktop proof/note увеличены до читаемых `12/13px` и `13/14px` | Перезапись `final-dev`, production или общего action-bar artifact |
| `final-dev3` | Исторический `v1.0.0` — strict clone `final-dev1`. Кандидат `v1.1.0` сохраняет Playfair Display + Onest, текущие тексты и Action Bar `2.3.1`, но синхронно меняет Hero-контакт: открыто — текущий телефон; закрыто — `Написать в WhatsApp` со ссылкой/иконкой | Вторые часы, timer или отдельная карта состояния Hero; подмешивание font-preview implementation; правки `site/`, production или прежних десяти Preview |
| Social preview | Готовый versioned PNG `1200×630` и обычные OG/Twitter meta; отдельный Chromium-рендерер не нужен | Более сложный воспроизводимый генератор, удалённый после решения владельца «просто сделать подходящее изображение» |
| Lead hook | Код и контракт готовы, но доставка не считается live до secret, Catch, dedup и readback | Любое утверждение «форма уже отправляет в Albato» только по наличию endpoint |
| Версии | Любое изменение требований меняет SemVer и дату во всех источниках соответствующего контракта | Неверсионированные устные изменения |

## 1. Git, границы проекта и секреты

- [x] Работа ведётся в `acomol/gambaryan-family-law`, ветка
  `claude/website-development-kb0fu0`, не в `main`.
- [x] Функциональные commits запушены в
  `origin/claude/website-development-kb0fu0`: все десять Preview опубликованы
  из клиентского release `98374c1`.
- [x] После docs-only commit различать новый PR head и deployed functional SHA:
  документационный commit сам по себе не означает новый deployment.
- [x] На handoff task/base `e48bd08` ветка опережает `origin/main` на 79
  коммитов и не отстаёт от него (`git rev-list --left-right --count` = `0 79`).
  Перед итоговым commit/push ведущий агент обязательно пересчитывает значение;
  прогноз не считать доказательством, потому что `origin/main` может измениться.
- [x] Рабочее дерево после push было чистым.
- [x] `.dev.vars*`, `.wrangler/`, Python cache и локальные credentials не
  коммитятся.
- [x] `ALBATO_WEBHOOK_URL` читается только из Cloudflare encrypted secret.
- [x] Чужой `src/components/StickyBar.tsx` с контактами шаблона удалён вместе с
  импортом из `src/app/page.tsx`.
- [ ] OPEN Обновить заголовок и описание PR №2: сейчас они описывают только Hero
  и ошибочно утверждают, что Cloudflare-деплоя не было.
- [ ] OPEN PR остаётся Draft; переводить в Ready только после согласования
  production-блокеров этого документа.

Доказательства: GitHub PR №2, GitHub compare `main...branch`, локальные
`git status`/`git rev-parse`, `.gitignore`, `functions/api/lead.js`.

## 2. Версии контрактов

Перед каждым релизом значения должны совпадать между документацией, исходниками
и производными:

| Контракт | Версия | Дата | Источники |
|---|---:|---:|---|
| Social preview | `1.0.2` | `2026-08-10` | `docs/SOCIAL-PREVIEW.md`, meta-комментарий и versioned PNG |
| Mobile Hero | `1.0.1` | `2026-08-10` | карта Preview и marker `HERO-MOBILE` в source/derived CSS |
| Action Bar | `2.3.1` | `2026-08-11` | HTML/CSS/JS addon, task, manifest, verifier |
| Client Preview Mobile | `1.0.0` | `2026-08-11` | `client-preview.css`, manifest и verifier |
| Desktop Hero `final-dev1` | `1.3.0` | `2026-08-10` | builder, HTML/CSS marker, task, reference PNG |
| Текст прецедента `final-dev1` | `1.0.0` | `2026-08-11` | builder, HTML marker, task, browser readback |
| Дизайн-кандидат `final-dev3` | `1.1.0` (`LIVE PASS`) | `2026-08-11` | task, source, builder, verifier, deploy и live-readback |
| Lead hook | `1.1.0` | `2026-08-10` | `site/lead-contract.js`, Function, документация |
| Карта Preview | `2.4.0` | `2026-08-11` | board и `scripts/client-preview-map.json` |
| Browser QA клиентских Preview | `1.2.1` | `2026-08-11` | задача, композиционная спецификация и этот чек-лист |
| Build tools | `1.1.1` | `2026-08-11` | `requirements-build.txt` |
| Browser QA runner | `1.2.0` | `2026-08-11` | `scripts/qa-browser-matrix.py` |
| Этот чек-лист | `1.3.3` | `2026-08-11` | текущий файл |

- [x] Все локальные и live marker Action Bar синхронизированы на `2.3.1`;
  исторический `final-dev3 v1.0.0` прошёл отдельный Preview readback.
- [x] Marker/source/generator/live `FINAL-DEV3-DESIGN v1.1.0 | 2026-08-11`
  согласованы.
- [x] Lead browser/Function используют единую карту `1.1.0`.
- [x] Все social meta указывают на PNG `v1.0.2`.
- [ ] При следующем изменении требований одновременно увеличить версию,
  обновить дату, пересобрать производные и повторить live-readback.

## 3. Контент и композиция

- [x] Утверждённый текст не удаляется из HTML ради одного брейкпойнта; mobile-
  различия делаются CSS-правилом.
- [x] На одном экране не остаются две одинаковые винные кнопки к одной цели.
- [x] Формулировка основного CTA — «Записаться на консультацию».
- [x] Опубликованный `final-dev3 v1.0.0` и прежние варианты ведут из Hero к
  форме и звонку.
- [x] LIVE В `final-dev3 v1.1.0` закрытое состояние заменяет только
  Hero-телефон на `Написать в WhatsApp`; одновременно телефон и WhatsApp в
  одном Hero-состоянии не показываются.
- [x] Адрес ведёт в Google Maps по адресу без непроверенных координат.
- [x] Вариант Hero C с мини-формой снят решением владельца и не публикуется.
- [x] `review-numbered` содержит 102 уникальных подписи для согласования текста.
- [ ] OPEN Перед изменением фактов, стажа, лицензии, биографий или юридических
  формулировок свериться с `CONTENT-APPROVED/MISSING/EXTRA`; не исправлять по
  предположению.

## 4. Hero и адаптивная вёрстка

- [x] На мобильном Hero построен полосами без наложения текста на лица.
- [x] Фото Hero занимает полную доступную ширину без бокового смещения.
- [x] Обе мобильные CTA имеют одинаковую ширину и помещаются без horizontal
  overflow на 390 px.
- [x] На широких экранах `object-position` проверялся отдельно; макушки не
  должны срезаться на 1440/1920/2560.
- [x] Пустой чёрный промежуток перед карточкой прецедента устранён на ширинах,
  где абсолютный портрет скрыт.
- [x] Hero A сохраняет порядок «действия перед фотографией».
- [x] Hero B сохраняет звонок как главное действие.
- [x] `final-dev1`: на desktop после CTA идут разделитель, расширенный звонок,
  три преимущества и только затем длинное пояснение.
- [x] `final-dev1`: дублирующий телефон справа в desktop-шапке удалён; меню
  центрировано, Hero-телефон и мобильный звонок в шторке сохранены.
- [x] `final-dev1` v1.3.0: на ширине до 860 px и высоте от 600 px фото поднято,
  обе Hero CTA целиком входят минимум на 360×600/360×668/390×724; прежний
  mobile asset внутри окна увеличен `1.15×` и сдвинут на `7%` влево, Action Bar
  не регрессировал; на 861 px transform отсутствует.
- [x] `final-dev1` v1.3.0: desktop proof/note имеют минимум `12/13px` на
  961–1200 px и `13/14px` от 1201 px; проверены 1024×768 и 1280×720 без
  clipping, пересечений и horizontal overflow.
- [x] `final-dev1` `FINAL-DEV1-PRECEDENT-COPY v1.0.0`: дословно проверены
  «ВПЕРВЫЕ / СОЗДАН ПРЕЦЕДЕНТ… / Добились возвращения…», обязательные
  переносы, отсутствие clipping/overflow и неизменные фото/CTA на mobile и
  desktop; stable alias и deployment URL прошли live readback.
- [x] HISTORICAL LOCAL `final-dev3` `FINAL-DEV3-DESIGN v1.0.0 | 2026-08-11`: strict clone
  `final-dev1` с Playfair Display + Onest, текущими текстами и Action Bar
  `2.3.1`; нормализованные HTML/CSS и общие assets/scripts/fonts совпадают.
- [x] HISTORICAL LOCAL `final-dev1 ↔ final-dev3 v1.0.0` pixel-identical на `1293×724` и
  `390×844`; служебный marker/body class не меняет rendered-композицию.
- [x] LOCAL `final-dev3 v1.1.0`: открытое состояние сохраняет текущий
  Hero-телефон, закрытое показывает точный текст `Написать в WhatsApp`,
  WhatsApp-ссылку и WhatsApp-иконку; остальная геометрия Hero не меняется.
- [x] Landscape высотой ниже 600 px остаётся отдельной прокручиваемой
  композицией: требование «обе CTA в первом экране» к нему не применяется;
  обязательны отсутствие horizontal overflow и штатный static Action Bar.
- [ ] MANUAL После новых изменений повторить скриншоты 360/390/768/1024/1280/
  1600 и проверить `scrollWidth === innerWidth`.
- [ ] OPEN Mobile preload без `media` скачивает desktop Hero crop примерно
  19 КБ, хотя `<picture>` показывает mobile crop; это даёт одно консольное
  предупреждение и конкурирует с нужным изображением при загрузке.
- [ ] OPEN **Accessibility, не привязано к отменённой v1.4.0.**
  `@media (max-width: 960px)` в `final-dev1` скрывает `.hero__call-help`
  и `.hero__proofs` целиком, а этих текстов («Конфиденциальность и защита
  интересов», «Индивидуальный подход к каждому делу») больше нигде на
  странице нет — это потеря контента, а не переупаковка. Браузерный zoom
  считается в CSS px, поэтому при 200% под правило попадают все типовые
  десктопы включительно до 1920 (1280→640, 1440→720, 1920→960). Нарушены
  WCAG 2.2 SC 1.4.4 Resize text и SC 1.4.10 Reflow — полный WCAG AA PASS
  для `final-dev1` выдавать нельзя. Правило залочено контрактом
  (`final_dev1_contract.py` → `MOBILE_FALLBACK_SNIPPETS`), снятие требует
  правки контракта и решения владельца. Разбор и расчёты:
  `docs/reviews/2026-08-11-final-dev1-v1.4.0-spec-validation.md`
  (документ HISTORICAL в части типографики, но эта находка — действующая).
- [ ] OPEN `final-dev3` наследует тот же zoom-200% дефект из базы `final-dev1`;
  вариантное переключение Hero-контакта `v1.1.0` его не исправляет. Локальный
  native-viewport PASS не является полным WCAG AA PASS для этих вариантов.
- [ ] OPEN Общий Hero-raster содержит людей с немного разной высотой макушек.
  CSS не может независимо передвинуть две головы внутри одного изображения;
  для полной симметрии нужен новый asset.
- [ ] CLARIFY В этой реализации требование владельца «головы на одном уровне,
  полная симметрия» применено к отдельным карточкам `#attorney`. Если речь шла
  также об общем Hero-raster, пункт выше становится BLOCKER до нового asset.

## 5. Фото адвокатов

- [x] На 390×844 обе `.attorney-photo` имеют отношение высоты к ширине
  `0.9375 ± 2px`, то есть `aspect-ratio: 16 / 15`.
- [x] Обе карточки сохраняют одинаковые окно и масштаб; лица полностью видны.
- [x] Mobile-коррекция первого портрета выравнивает макушки примерно до 1 px.
- [x] Горизонтального переполнения нет.
- [x] На 1280 px остаётся `aspect-ratio: 4 / 5`.
- [x] Desktop не менялся в рамках задачи.
- [x] Live-readback выполнен отдельно: production CSS после задачи на фото и
  `review-numbered` Preview содержат правило `16 / 15`.
- [ ] При замене исходников повторить геометрию, визуальный скриншот и проверку
  desktop; старые проценты `object-position` не переносить автоматически.

## 6. Шрифты

- [x] Базовый сайт использует локальные Playfair Display + Onest с кириллицей.
- [x] Все четыре Preview-набора используют локальные `.woff2`, не Google CDN.
- [x] Кириллица `U+0400–045F` проверяется по cmap-файла, а фактический рендер —
  через CDP `CSS.getPlatformFontsForNode`.
- [x] Live-проверка подтвердила custom fonts во всех четырёх вариантах:
  Playfair/Onest, Lora/Inter, Literata/Manrope, PT Serif/Golos Text.
- [x] Action Bar присутствует и работает вместе с каждым шрифтовым набором.
- [ ] OPEN `docs/FONT-VARIANTS.md` завышает диапазоны части наборов относительно
  builder: Inter фактически 400–800, Literata 400–700, Manrope 400–800.
- [ ] OPEN Таблица веса шрифтов считает не все реально загружаемые italic/
  normal Cyrillic-файлы и занижает итоговый объём.
- [ ] OPEN PT Serif имеет только 400/700, тогда как сайт запрашивает 500;
  браузер подбирает 400. До выбора варианта 4 либо добавить подходящий face/
  изменить токен, либо явно принять визуальный результат.
- [x] Python-зависимости генераторов закреплены в `requirements-build.txt`;
  чистая установка и контрольная сборка описаны в `docs/RESUME.md`.
- [ ] OPEN Статус в `docs/FONT-VARIANTS.md` устарел: документ всё ещё говорит,
  что варианты 2–4 не опубликованы, хотя четыре Preview уже live.

## 7. Action Bar: historical baseline v2.3.0 / current Preview v2.3.1

### Состав и single source

- [x] Единственный источник: `site-addons/action-bar/`.
- [x] Все четыре генератора подключают addon через
  `scripts/action_bar_addon.py` после собственных преобразований.
- [x] HTML содержит ровно одну панель и три исходных действия в порядке:
  телефон → запись → WhatsApp; расписание меняет состав, не дублируя nav.
- [x] WhatsApp использует заранее заполненный текст с указанием источника.
- [x] CSS/JS в производных побайтово совпадают с single source.
- [x] Высота панели измерена Chrome и равна 60 px; body и scroll padding
  используют тот же token.

### Зонная модель

- [x] На Hero панель скрыта.
- [x] После ухода `.hero__phone` вверх панель появляется не позднее 300 мс.
- [x] При видимости формы минимум на 15% панель скрывается.
- [x] При открытом mobile menu панель скрывается и возвращается после закрытия.
- [x] При фокусе в `input/textarea/select` панель скрывается.
- [x] Прямой заход `/#contact` оставляет панель скрытой.
- [x] После ухода от формы вверх панель снова появляется.
- [x] Микроскролл ±10 px в зоне чтения не меняет состояние.
- [x] Состояние не зависит от направления прокрутки; listener события `scroll`
  отсутствует.
- [x] Два `IntersectionObserver`: Hero и форма.
- [x] Instant anchor при `prefers-reduced-motion: reduce` исправлен через
  geometry resync на `scrollend/hashchange/pageshow`.
- [x] Fallback без `IntersectionObserver` оставляет панель видимой в зоне
  чтения и сохраняет menu/focus overlays после geometry fix.
- [ ] OPEN Без `IntersectionObserver` fallback не умеет определить видимость
  формы и поэтому не скрывает панель по contact-zone; это деградация legacy-
  браузера, а не эквивалент основной зонной модели.

### Рабочее время Израиля

- [x] Единая карта находится в `action-bar.js`: `Asia/Jerusalem`, открытые дни
  Sun–Thu, начало `09:00` включительно, окончание `18:00` исключительно.
- [x] Рабочее состояние сохраняет текущие три равные колонки и тексты:
  `Позвонить` → `Записаться` → `WhatsApp`.
- [x] Нерабочее состояние скрывает телефон через `hidden` и показывает две
  равные колонки: `Записаться` → `Написать в WhatsApp`.
- [x] `href`, `data-action` и `data-method` записи/WhatsApp одинаковы в обоих
  состояниях; смена времени не отправляет событие аналитики.
- [x] Состояние обновляется на следующей минуте, `pageshow`, возврате вкладки и
  фокусе окна; при ошибке `Intl` выбирается безопасное нерабочее состояние.
- [x] LIVE Проверены `08:59:59/09:00:00/17:59:59/18:00:00`, пятница/суббота и
  DST на каноническом baseline Preview `2.3.0`; кандидат `2.3.1` не меняет
  расчёт времени и повторно прошёл локальную deterministic-проверку.
- [x] LIVE На всех десяти Preview проверен open/closed smoke на 360/390/768px:
  3/2 focusable action, высота 60px, равные колонки, панель без собственного
  overflow.
- [x] LOCAL Старый overflow устранён в source/generator: `v2-lora-inter` и
  `review-numbered` имеют `scrollWidth === clientWidth` на 360/390 px; у
  `review-numbered` сохранены 102 уникальных номера.

### Preview demo-switch

- [x] Переключатель существует только в производных Preview; `site/` и
  production его не содержат.
- [x] До первого клика действует автоматическое расписание; клик вручную
  переключает open/closed, повторный клик возвращает второе состояние.
- [x] Перезагрузка сбрасывает ручной выбор и снова применяет `Asia/Jerusalem`.
- [x] `role=switch` имеет стабильное имя «Рабочее время»;
  `aria-checked=true` означает рабочее состояние, а видимые `Авто/Демо` и
  `Рабочее/Нерабочее время` синхронно отражают режим и состояние. Скрытие зоны
  удаляет control из Tab-порядка.
- [x] Переключение не меняет URL, ссылки/методы и не отправляет аналитику.
- [x] LOCAL Action Bar `2.3.1`: на всех десяти Preview переключение проверено
  как `Авто/Демо · Рабочее время ↔ Авто/Демо · Нерабочее время` вместе с
  `3 ↔ 2`, `aria-checked`, focus, неизменным URL и нулём analytics events.
- [x] LIVE Action Bar `2.3.1` опубликована и интерактивно проверена на всех
  десяти alias: верхняя подпись, `3 ↔ 2`, focus, URL и analytics согласованы.
- [x] LOCAL `final-dev3 v1.1.0`: автоматическое расписание и demo-switch
  одновременно меняют Action Bar и Hero-контакт. Action Bar `2.3.1` остаётся
  единственным владельцем `Asia/Jerusalem`, open/closed state и timer; Hero не
  создаёт второй clock, timer или карту состояния.

### Доступность и ложные клики

- [x] Начальная разметка скрыта и `inert`, поэтому до callback нет flash или
  попадания Tab.
- [x] Скрытое состояние использует transform, opacity, delayed visibility,
  `pointer-events: none` и `inert`.
- [x] Клики включаются после `transitionend` с fallback 400 мс; уходящая
  анимация не включает панель обратно.
- [x] `viewport-fit=cover` присутствует только в Preview-сборках с панелью.
- [x] До 960 px панель mobile; на 1280×900 она отсутствует.
- [x] При высоте до 400 px панель `position: static`, компенсация body равна 0.
- [ ] MANUAL Проверить safe-area и боковые landscape-insets на реальном iPhone.
- [ ] MANUAL Проверить `tel:` во встроенном браузере Google App.
- [ ] При добавлении cookie banner/чата повторно проверить перекрытия и шкалу
  z-index: Action Bar 40, header 50.

## 8. Форма: autofill, проверка и ошибки

- [x] Поля имеют явные `label`, `name` и нативный autofill:
  `autocomplete=name|tel|email`.
- [x] Телефон использует `type=tel`, `inputmode=tel`, диапазон 6–15 цифр;
  email использует `type=email`, `inputmode=email`.
- [x] Имя и телефон обязательны, email необязателен.
- [x] Ошибка показана рядом с конкретным полем, а не только общим сообщением.
- [x] Неверное поле получает `aria-invalid`, `aria-errormessage`, заметную
  рамку/фон; фокус переводится на первое неверное поле.
- [x] Summary имеет `role=alert`/live-region и перечисляет, что исправить.
- [x] Разделены причины: validation, offline, timeout, rate limit, временная
  недоступность и общий delivery failure.
- [x] Во время отправки кнопка disabled, текст меняется, `aria-busy` включён;
  double submit блокируется.
- [x] При ошибке введённые значения сохраняются; повтор неизменённых данных
  сохраняет `submission_id`.
- [x] Success показывается только после HTTP `2xx` от `/api/lead`.
- [ ] MANUAL Проверить реальное заполнение сохранённого контакта в iOS Safari и
  Android Chrome; наличие атрибутов `autocomplete` не доказывает UI autofill.
- [ ] OPEN Текст `.lead-form__legal` использует `--ink-4` с недостаточным
  контрастом на белом фоне; повысить контраст минимум до WCAG AA.

## 9. Lead hook и Albato

### Кодовый контракт

- [x] Browser отправляет same-origin `POST /api/lead`.
- [x] Payload allowlist содержит версию/дату, UUID, время, форму, path,
  язык, name/phone/email, referrer host и first-touch UTM/click IDs.
- [x] IP, User-Agent, полный URL/referrer, cookies, case text и PII в
  `dataLayer` не отправляются.
- [x] Function принимает только POST/JSON, валидирует поля и возвращает
  allowlisted 422 codes без отражения введённых данных.
- [x] Body ограничен 8192 байт потоковым чтением до JSON parse; oversized
  stream прекращается.
- [x] Upstream timeout 10 с меньше browser timeout 12 с.
- [x] Ошибки upstream не раскрывают webhook URL, PII или исходный body.
- [x] `node scripts/verify-lead-hook.mjs` проходил на baseline.
- [x] Live Preview readback: `/lead-contract.js` отдаёт схему `1.1.0`,
  `GET /api/lead` — `405`, JSON и `Allow: POST`.
- [x] Cloudflare API на дату проверки показывал пустые Preview и Production
  variables; `ALBATO_WEBHOOK_URL` ещё не настроен ни в одном environment.
- [x] Контрольный POST в Preview без secret возвращает ожидаемый
  `503 temporarily_unavailable`, а не ложный success.
- [ ] BLOCKER На текущем production `/lead-contract.js` и `/api/lead` ещё
  отдаются как HTML fallback старой версии; production-форма не считается
  подключённой к Function/Albato до отдельного deployment и readback.

### До production остаётся

- [ ] BLOCKER Утвердить privacy notice/policy рядом с формой: обязательность,
  цель, controller/contact, processors/recipients, retention и права человека.
- [ ] BLOCKER Установить разные encrypted `ALBATO_WEBHOOK_URL` для Preview и
  Production и сделать новый deployment.
- [ ] BLOCKER Выполнить Albato Catch на синтетическом payload `1.1.0`.
- [ ] BLOCKER Настроить dedup/upsert по `submission_id` в destination и доказать,
  что повтор не создаёт вторую запись.
- [ ] BLOCKER Сделать контрольный POST, проверить Automation Log и readback
  конечной CRM/Sheet-записи. HTTP 202 сам по себе этого не доказывает.
- [ ] MANUAL После подключения Catch проверить live 4xx/5xx/timeout: поля
  остаются заполненными, причина видна, success не появляется.
- [ ] OPEN Rate limit/Turnstile отсутствует; endpoint доступен bot/spam.
- [ ] OPEN `OPTIONS /api/lead` возвращает 405. Для текущего same-origin POST это
  допустимо; для будущего cross-origin источника потребуется CORS/preflight.
- [ ] OPEN После выбора destination проверить formula injection, processor/DPA,
  регион передачи и срок хранения.
- [ ] OPEN У stream-body есть byte cap, но нет отдельного ingress read deadline;
  оценить после подключения rate limit.

## 10. Аналитика

- [x] Action Bar пишет `contact_click` с `method=phone|form_anchor|whatsapp` и
  `placement=action_bar` напрямую на каждой ссылке.
- [x] `generate_lead` отправляется только после успеха; `form_error` — после
  ошибки; PII в событии нет.
- [ ] OPEN Разрешить конфликт контрактов: задача Action Bar требует
  `contact_click + method=form_anchor`, а `docs/TRACKING-REQUIREMENTS.md`
  требует отдельное `form_anchor_click`. До настройки GTM выбрать одну схему и
  синхронизировать код, документацию и отчёты.
- [ ] OPEN Обновить секцию «Чего сейчас нет» в
  `docs/TRACKING-REQUIREMENTS.md`: Action Bar уже имеет прямые listeners, хотя
  остальные контактные ссылки всё ещё ждут GTM/обёртки.
- [ ] BLOCKER Для измерения конверсий подключить GTM/GA4/Google Ads: сейчас
  `dataLayer` накапливает события, но сам их никуда не отправляет.
- [ ] MANUAL В GTM Preview и GA4 DebugView прокликать телефон, WhatsApp, карту,
  form anchor и submit на реальном мобильном устройстве.
- [ ] OPEN Если нужна атрибуция звонков по источникам, статического `tel:` мало;
  отдельно выбрать call tracking/DNI.

## 11. Social preview при пересылке ссылки

- [x] Используется готовый `site/social-preview-logo-v1.0.2-1200x630.png`.
- [x] Размер 1200×630, PNG, versioned filename, вес меньше 5 MB.
- [x] Визуал повторяет логотип: белый wordmark, золотой `&`, линия и подпись
  «АДВОКАТЫ» на фоне `#101214`.
- [x] OG и Twitter имеют абсолютные HTTPS image URL, width/height/type/alt.
- [x] Все десять Preview получили одинаковые metadata и изображение.
- [x] Standalone сохраняет обычный absolute social image URL и не вшивает его
  в `data:` URI.
- [ ] OPEN Текущий production был сохранён на более раннем deployment; новый
  social preview подтверждён для десяти клиентских Preview, но не для
  production URL.
- [ ] MANUAL Во всех Preview `og:url` пока указывает production URL. Только
  проверка реального мессенджера/debugger докажет, что scraper не
  канонизирует карточку на старый production deployment.
- [ ] OPEN/MAJOR `og:url` указывает production, а `og:image` — Preview-host
  `final-dev`. Удаление этого alias сломает изображения всех карточек; перед
  финалом выбрать один устойчивый публичный origin и вернуть автоматический
  gate равенства host.
- [ ] OPEN/MAJOR На текущем production `og:image` относительный и указывает Hero,
  а не фирменный логотип. Для Open Graph нужен абсолютный URL.
- [ ] MANUAL Проверить карточку в реальных WhatsApp и Telegram, а также Facebook
  Sharing Debugger, LinkedIn Post Inspector и X; учесть их кеш.
- [ ] При публикации финального домена заменить image origin, увеличить версию
  и filename; снятие `noindex` — отдельное решение.

## 12. Сборка производных

Запускать из корня репозитория в таком порядке:

```powershell
python -m pip install -r requirements-build.txt
python -m playwright install chromium
python scripts/build-preview.py site/gambarian-standalone.html --standalone
python scripts/build-font-variants.py
python scripts/build-hero-variants.py
python scripts/build-action-bar.py
python scripts/build-review-numbered.py
python scripts/verify-client-previews.py
node scripts/verify-lead-hook.mjs
node --check site-addons/action-bar/action-bar.js
npm run check
git diff --check
```

- [x] Каждый builder копирует `site/`, выполняет собственную замену, затем
  устанавливает общий Action Bar.
- [x] `verify-client-previews.py` проверяет точную карту одиннадцати
  `branch → directory`, наличие build directories, version/date, единственный
  bar, byte-identical CSS/JS, viewport metadata и versioned reference
  `final-dev1`.
- [x] Для исторического `final-dev3 v1.0.0` verifier проверял marker/body class,
  нормализованное равенство HTML/CSS с `final-dev1`, идентичность общих
  assets/scripts/fonts и связь marker с task/board.
- [x] LOCAL Для `v1.1.0` verifier проверяет единственный
  Hero business-hours adapter и разрешает только эту versioned разницу.
- [ ] OPEN Локальный verifier не проверяет variant-marker каждого старого
  output или живые Cloudflare aliases; это отдельный API/HTTP/browser readback.
- [x] Windows stdout verifier принудительно UTF-8 и проходит даже при cp1252.
- [x] `final-dev` и `action-bar` намеренно используют один build directory.
- [ ] После любой правки `site/`, addon, metadata или standalone повторить все
  зависимые builders; старый `build/` не считать доказательством.
- [x] `requirements-build.txt` закрепляет `fonttools`, `playwright` и `brotli`;
  после установки manifest отдельно устанавливается Playwright Chromium.
- [x] Воспроизводимый browser runner сохранён как
  `scripts/qa-browser-matrix.py` v1.2.0: принимает base URL, переключает и
  проверяет оба Hero business-state `final-dev3`, выдаёт машинный PASS/FAIL по
  каждой ячейке и итоговый счёт; карта из одиннадцати вариантов ожидает
  `110 + 55 + 8 = 173` ячейки.
- [ ] OPEN `verify-fact-cards.mjs` требует не объявленный `playwright-core` и
  сейчас не является воспроизводимым gate.

## 13. Cloudflare deployment

### Правила безопасности

- [x] Существующий проект — `gambarian-landing`; новый Pages-проект не создавать.
- [x] Аккаунт клиентских лендингов подтверждён отдельно от аккаунта отчётов.
- [x] Preview публикуется прямым Wrangler с явным `--branch=<slug>`.
- [x] Ручной production-пример в `docs/DEPLOY.md` исправлен: использует pinned
  Wrangler и явный `--branch=main`.
- [x] Команда запускается из корня repo с `--cwd`, иначе корневая `functions/`
  не попадёт в deployment.
- [x] Wrangler для карты Preview закреплён как `4.120.0`.
- [x] `scripts/deploy-pages.ps1` предназначен для production branch; не
  использовать его с Preview-каталогом, иначе можно перезаписать production.
- [x] После deploy проверяется не только ответ команды, но и живое содержимое.
- [ ] OPEN Production deploy scripts при неуспешном marker-readback печатают
  warning, но не завершаются с non-zero exit; CI/automation может принять такой
  deploy за успешный.
- [ ] OPEN История Cloudflare token в `docs/DEPLOY.md` конфликтует с более
  поздним handoff: сначала IP restriction запрещал cloud deploy, затем filter
  был снят/расширен и deploy прошёл. Перед каждым запуском проверять token через
  live API, а не считать любой из исторических статусов вечным.
- [ ] Перед production-deploy снять baseline HTML/asset/API и после deploy
  доказать ожидаемые изменения и отсутствие неожиданных.

Шаблон Preview-команды:

```powershell
npx --yes wrangler@4.120.0 pages deploy "<directory>" `
  --cwd "<repo-root>" `
  --project-name=gambarian-landing `
  --branch="<branch>" `
  --commit-dirty=true
```

### Десять Preview — текущий клиентский release `98374c1`

| Preview | URL | Deployment | Контракты |
|---|---|---:|---|
| Финальная Dev | https://final-dev.gambarian-landing.pages.dev/ | `76d3778a-46b9-4996-ba2d-7d3c4f7d95ec` | Action Bar `2.3.1`; mobile `1.0.0` |
| Финальная Dev 1 | https://final-dev1.gambarian-landing.pages.dev/ | `69fa4640-c137-4cf9-afd8-37bfd4462c5d` | Hero `1.3.0`; Precedent Copy `1.0.0`; Action Bar `2.3.1`; mobile `1.0.0` |
| Playfair + Onest | https://v1-playfair-onest.gambarian-landing.pages.dev/ | `d402e2ca-cc8c-485d-ae04-653d9b77bc95` | Action Bar `2.3.1`; mobile `1.0.0` |
| Lora + Inter | https://v2-lora-inter.gambarian-landing.pages.dev/ | `308cad66-555e-4b94-af50-89469b6061bd` | Action Bar `2.3.1`; mobile `1.0.0` |
| Literata + Manrope | https://v3-literata-manrope.gambarian-landing.pages.dev/ | `8a182caa-e22c-41f9-9a67-6005a68eb344` | Action Bar `2.3.1`; mobile `1.0.0` |
| PT Serif + Golos Text | https://v4-ptserif-golos.gambarian-landing.pages.dev/ | `80ba9adf-b5e8-4c4f-9277-8502acaf1d88` | Action Bar `2.3.1`; mobile `1.0.0` |
| Hero A | https://hero-a-actions-first.gambarian-landing.pages.dev/ | `930f558c-0755-4dfb-a3d9-9f73feee2056` | Action Bar `2.3.1`; mobile `1.0.0` |
| Hero B | https://hero-b-call-first.gambarian-landing.pages.dev/ | `b4e3c1de-b801-4c97-a70c-0d5903eed5b0` | Action Bar `2.3.1`; mobile `1.0.0` |
| Action Bar | https://action-bar.gambarian-landing.pages.dev/ | `f5b76f77-4212-4754-b590-b0d9387df083` | Action Bar `2.3.1`; mobile `1.0.0` |
| Текст с номерами | https://review-numbered.gambarian-landing.pages.dev/ | `aaa2e734-486f-4433-82b3-34fdadb3a683` | Action Bar `2.3.1`; mobile `1.0.0` |

Все deployment status `success`, commit `98374c1`. Для каждого URL
подтверждены HTTP 200, `noindex`, Action Bar `2.3.1`, Client Preview Mobile
`1.0.0`, одна панель, `viewport-fit=cover`, высота 60px, расписание
`Asia/Jerusalem`, demo-switch, lead contract `1.1.0` и Function GET=405/Allow
POST. HTTP/assets/Functions и live browser smoke прошли 10/10; полный отчёт:
`docs/reviews/2026-08-11-client-preview-live-release.md`.

- [x] HISTORICAL До release `98374c1` deployment `final-dev1` имел commit
  `51e9b82`, остальные девять Preview — `8ccc820`.
- [x] Production `https://gambarian-landing.pages.dev/` не обновлялся вместе с
  этими Preview: HTML SHA-256 до/после совпал
  `656cbcd0635952899e79b847d5c262724979d21f548ca66e13fe3a7d2ec13e22`;
  Action Bar/demo отсутствуют, `/api/lead` остаётся старым HTML fallback 200.
- [ ] OPEN `docs/DEPLOY.md` содержит историческую фразу, что аккаунт Pages не
  проверен живым API; в этой сессии аккаунт и проект уже подтверждены.
- [ ] MANUAL Перед отправкой заказчику открыть все одиннадцать ссылок в обычном
  мобильном браузере, исключив кеш/авторизацию/anti-bot экран.

### `final-dev3 v1.0.0` — HISTORICAL LIVE PASS

| Preview | Исторический immutable URL | Deployment | Контракты |
|---|---|---:|---|
| Финальная Dev 3 | https://2f20dc33.gambarian-landing.pages.dev/ | `2f20dc33-714f-4b3a-86ea-b51880e33f05` | commit `78f429d`; `FINAL-DEV3-DESIGN v1.0.0`; Playfair Display + Onest; текущие тексты; Action Bar `2.3.1`; mobile `1.0.0` |

- [x] LOCAL Каталог входит в Preview-карту `2.4.0` и воспроизводимо собирается
  из `final-dev1`.
- [x] Branch `final-dev3` опубликован отдельно; HTTP 200, `noindex`, MIME/assets,
  markers, `/lead-contract.js`, Function GET=405/Allow POST и browser `15/15`
  прошли.
- [x] Cloudflare API и HTTP SHA подтвердили: десять исторических Preview и
  production не изменились.

### `final-dev3 v1.1.0` — LIVE PASS

- [x] Commit `88efa2c`, CI `31486509765`, deployment
  `52a9addb-0166-4f78-8c7d-5f1b0ed2ad07` и marker `v1.1.0` подтверждены.
- [x] Open/closed Hero, demo-sync, единственный state/timer Action Bar и
  изоляция production/прежних десяти Preview подтверждены отдельно.

### Полная browser/responsive-приёмка всех Preview

Контракт: `PREVIEW-BROWSER-QA v1.2.1 | 2026-08-11`.

| Preview | Локальный кандидат | Live после публикации |
|---|---|---|
| `final-dev` | `[x] PASS` | `[x] PASS` |
| `final-dev1` | `[x] PASS`; Hero `1.3.0`, Precedent Copy `1.0.0`, design leak отсутствует | `[x] PASS` |
| `v1-playfair-onest` | `[x] PASS`; Playfair Display + Onest | `[x] PASS` |
| `v2-lora-inter` | `[x] PASS`; Lora + Inter, прежний overflow `+3px` закрыт | `[x] PASS` |
| `v3-literata-manrope` | `[x] PASS`; Literata + Manrope | `[x] PASS` |
| `v4-ptserif-golos` | `[x] PASS`; PT Serif + Golos Text; выбор веса 500 остаётся OPEN | `[x] PASS` |
| `hero-a-actions-first` | `[x] PASS`; действия до фотографии | `[x] PASS` |
| `hero-b-call-first` | `[x] PASS`; звонок — главное действие | `[x] PASS` |
| `action-bar` | `[x] PASS`; byte-identical с `final-dev` | `[x] PASS` |
| `review-numbered` | `[x] PASS`; 102 уникальных номера, прежний overflow закрыт | `[x] PASS` |
| `final-dev3 v1.0.0` | `[x] HISTORICAL PASS`; strict clone `final-dev1`, single `15/15`, pixel-identical на двух контрольных viewport | `[x] HISTORICAL PASS` |
| `final-dev3 v1.1.0` | `[x] PASS`; оба Hero business-state, demo-sync, single `15/15`, форма центрирована | `[x] LIVE PASS` |

- [x] Выполнено `100/100` ячеек: десять Preview × `360×600`, `360×668`,
  `390×724`, `390×844`, `720×760`, `860×760`, `861×760`, `1024×768`,
  `1280×720`, `1440×900`.
- [x] Во всех ячейках `scrollWidth === clientWidth`, загружены заявленные
  семейства шрифтов, marker версий совпадают, console errors/warnings `0`.
- [x] На коротких portrait viewport все Hero CTA входят целиком; минимальный
  нижний запас `8.7px`, для `review-numbered` — `14.7px`.
- [x] Дополнительная граница/landscape `50/50`: `960×760`, `961×760`,
  `960×400`, `960×401`, `844×390`; статический/фиксированный режим панели и
  breakpoint `960/961` работают без overflow.
- [x] Дополнительный large-desktop прогон `6/6`: базовый Hero, Hero A и Hero B
  на `1920×1080`/`2560×1440`, overflow и console errors/warnings `0`.
- [x] Проверены зоны Action Bar на `final-dev` и `final-dev1`: Hero, чтение,
  меню, focus поля, форма и возврат; отдельно прошли reduced-motion anchor и
  fallback без `IntersectionObserver`.
- [x] Проверены autofill `name/tel/email`, focus первого невалидного поля,
  inline-сообщения и визуальное summary ошибки.
- [x] Геометрия и DOM-состояние проверены для каждой ячейки; агрегат, матрица,
  thresholds и окружение записаны в versioned local-QA отчёте,
  репрезентативные screenshots сохранены вне Git.
- [x] LIVE HTTP/marker/function readback и mobile+desktop Action Bar smoke
  прошли на каждом из десяти stable alias. Реальный POST в Albato не выполнялся.

Исторические числа выше (`100/100 + 50/50 + 6/6`) относятся к release десяти
опубликованных Preview и сохраняются без пересчёта. Результат карты `2.4.0` с
runner `1.1.0` относится к опубликованному `final-dev3 v1.0.0`:

- [x] `110/110` основных ячеек;
- [x] `55/55` breakpoint/landscape-ячеек;
- [x] `8/8` large-desktop-ячеек;
- [x] общий локальный результат `173/173`, включая `final-dev3 v1.0.0` single `15/15`;
- [x] pixel-equivalence `final-dev1 ↔ final-dev3 v1.0.0` на `1293×724` и `390×844`;
- [x] LIVE `final-dev3 v1.0.0` прошёл `15/15`, asset/Function readback и проверку
  изоляции десяти старых alias/production.
- [x] LOCAL Полная матрица `v1.1.0` прошла `173/173`, single `15/15`; проверены
  auto open/closed, оба demo-состояния Hero/Action Bar и центрирование формы.
- [x] LIVE `15/15` и isolation readback после deploy прошли.

## 14. GitHub и CI

- [x] Release commit `98374c1` запушен в
  `origin/claude/website-development-kb0fu0` до Preview deploy.
- [x] GitHub Actions CI run `31469797937` для `98374c1` завершён `success`.
- [x] GitHub Actions CI run `31473373506` для handoff task/base `e48bd08`
  завершён `success`.
- [x] GitHub Actions CI run `31482179779` для `final-dev3` commit `78f429d`
  завершён `success`.
- [x] Локальный release-candidate: `npm run check` завершён с exit `0`;
  lint без errors, TypeScript и Next build прошли.
- [x] GitHub Actions run `31433776655` для `51e9b82` завершён `success`;
  lint, typecheck и Next build прошли.
- [x] GitHub Actions run `31394432909` для `dd6af2d` завершён `success`.
- [x] GitHub Actions run `31389047603` завершён `success`; lint, typecheck и
  Next build прошли.
- [x] В PR нет review submissions и unresolved review threads.
- [ ] OPEN В чистом CI ожидаются 8 lint warnings: семь unused catch variables
  в Pages/Action Bar клиентском коде и один Next custom-font warning. Локальный
  рабочий каталог дополнительно содержит ignored `.wrangler/`/`temp/`, поэтому
  их производные warnings не считать source-регрессией.
- [ ] OPEN Next build предупреждает об отсутствующем `metadataBase`.
- [ ] OPEN `npm audit --omit=dev`: 15 уязвимостей — 10 high, 3 moderate,
  2 low; прямая `next@16.2.1`, доступен non-major update `16.3.0`.
- [ ] OPEN Текущий Cloudflare runtime публикует `site/ + functions/`, поэтому
  Next vulnerabilities не являются прямым runtime-блокером Preview. Но перед
  любым Next/Vercel deployment зависимости обязательны к обновлению.
- [ ] OPEN CI проверяет Next template, но не запускает builders, lead verifier,
  client-preview verifier, Wrangler Functions build или live readback. Ручной
  PASS не заменяет merge gate — добавить эти проверки отдельной задачей.
- [ ] OPEN Deploy scripts используют mutable `wrangler@latest`; для новых
  автоматизаций применять версию из manifest.

## 15. Исторические ошибки → постоянные regression gates

| Ошибка | Причина | Постоянная проверка |
|---|---|---|
| Кириллица рисовалась системным шрифтом | Archivo/Archivo Narrow не содержали нужные глифы | cmap + CDP platform fonts; не доверять только `@font-face loaded` |
| Портрет обрезался до головы | Фиксированная альбомная высота + portrait + cover | `aspect-ratio`, `height:auto`, screenshot обеих карточек |
| Самодельная вырезка давала артефакты/пропавшие руки | Сегментация и чёрный фон съедали тёмный костюм | Использовать полный студийный raster; проверять края и руки на реальном фоне |
| Макушки срезались на wide Hero | `object-position` применялся к растущему crop surplus | 1440/1920/2560 |
| Mobile Hero CTA уходила ниже первого экрана | Слишком высокий photo strip и отступы | `final-dev1` v1.3.0: 360×600/360×668/390×724 и 420/659/660/860/861 boundaries; обе CTA целиком, bottom-safe ≥8px, height-aware crop только когда 4:3 не помещается |
| На mobile слева от пары оставалось лишнее пустое поле | `object-position` по X не работает, когда source уже окна и `cover` режет только высоту | Final-dev1-only `translateX(-7%) scale(1.15)` до 860 px; проверять головы/волосы, CTA geometry, overflow и отсутствие transform на 861 px |
| Desktop proof-блок был микротекстом | Размеры 10/11 px выбрали ради искусственного вмещения блока | Двухступенчатые 12/13 px и 13/14 px; обязательные 1024×768 и 1280×720 с text-fit и Hero bottom readback |
| CSS будто не применялся | `<picture>` закрывался `</figure>` | Счётчики парных тегов/HTML parse до настройки CSS |
| Fact-card accordion имел вложенные/слишком широкие интерактивы | Вся карточка была control вместо нативной кнопки | Семантическая button, keyboard/ARIA и отсутствие nested interactive |
| Mobile-правка изменила desktop | Удаление текста из HTML вместо media query | Desktop before/after + утверждённый контент сохранять |
| Искали новый Vercel/GitHub Pages | Не проверили существующий Cloudflare project | Сначала `docs/DEPLOY.md` и live project readback |
| Wrangler создал Preview вместо production | Не указан `--branch` | Всегда явный production/preview branch и post-deploy readback |
| Cloudflare диагностика шла не тем аккаунтом/token | Глобальная env указывала на аккаунт отчётов; PowerShell `curl` — alias; встречались IP/non-ASCII ограничения | Явный account ID, token verify + `/accounts`, `curl.exe`/Invoke-RestMethod, ASCII check |
| Можно было затронуть production Preview-каталогом | Production script сам выбирает production branch | Для Preview только прямая pinned Wrangler-команда |
| Светлый фон ломал standalone/artifact | Wrapper переопределял только `body` | Фон на `:root` и `body` в обеих темах |
| Пустой чёрный промежуток на mobile | Скрыли absolute portrait, но оставили reserve spacing | Проверять геометрию на 390/768/1024/1200/1201 |
| Две винные CTA в первом экране | Одна цель дублировалась разными формулировками | Один primary CTA на экран |
| Артефакты и решения терялись в чатах | Они не были в Git | Versioned docs, Related, commit до окончания задачи |
| Вывод о market pattern оказался неверным | Перекошенная выборка одинаковых сайтов | Разные регионы/движки и отделение данных от гипотез |
| Scroll-direction панель дребезжала/заклинивала | Мёртвые ветки, нулевая delta, sticky `formVisible` | Зонная модель и browser state matrix |
| Safe-area существовал только в комментарии | Не было `viewport-fit=cover` | Live HTML marker + real iPhone |
| Скрытая панель получала Tab/click | Только transform/opacity | visibility + pointer none + inert + Tab test |
| Instant anchor оставлял панель hidden | IO не сообщил о прыжке nonintersecting→nonintersecting | reduced-motion anchor browser test |
| Fix instant anchor сломал no-IO fallback | Geometry handlers работали без IO | Отдельный тест без `IntersectionObserver` |
| Все варианты разошлись по Action Bar | Панель инжектилась только одним builder | single-source installer + 10-entry manifest/verifier |
| Windows verifier падал после PASS | stdout cp1252 не печатал кириллицу | Внутренняя UTF-8 reconfigure + cp1252 test |
| Lead body limit срабатывал после full buffer | `request.text()` читался до проверки | bounded stream reader + oversized chunk test |
| Ошибка формы была непонятна | Общий generic error без привязки к полям | inline message, visual state, summary, focus first invalid |
| Social renderer стал сложнее задачи | Пытались детерминировать Chromium/font hinting | Готовый versioned PNG; не возвращать генератор без запроса |
| PR/CI выглядели зелёными, но не отражали Pages runtime | Workflow собирает Next template | Отдельные deployable-artifact и Function gates |

## 16. Незакрытый дизайн-аудит и решения клиента

Зелёный результат двух задач `2026-08-10` не закрывает более ранний аудит
`docs/tasks/2026-08-04-design-fixes.md`.

| ID | Статус | Что проверить/решить |
|---|---|---|
| A1 | PARTIAL | Lead error теперь заметен и связан с полями, но ссылка общего error-блока не получила требуемое подчёркивание |
| A2 | PASS | Mobile-gap перед прецедентом устранён |
| A3 | OPEN | Двухслойный focus indicator на кремовом и золотом фоне |
| A4 | OPEN | `.lead-form__legal`: `--ink-4` → контраст AA |
| A5 | OPEN | `.site-footer__legal` alpha `.4` → контраст AA |
| A6 | OPEN | `[id] { scroll-margin-top: 90px; }` и навигация под sticky header |
| B1 | OPEN | Убрать `outline:none`/доказать ≥3:1 focus ring инпутов |
| B2 | OPEN | Только радиусы кнопок 8/12; сейчас остаются 6/10 |
| B3 | OPEN | Высота/padding service CTA равны базовой wine CTA ±1 px |
| B4 | OPEN | Внешняя высота gold/ghost в прецеденте одинакова; сейчас border даёт расхождение |
| B5 | OPEN | Не более двух системных пар размер/tracking у надстрочников |
| B6 | OPEN | `.svc-media__label` ≥4.5:1 |
| B7 | OPEN | Hover/transition у tabs и dots карусели |
| B8 | OPEN | Нечётная fact-card занимает всю строку в двухколоночном диапазоне |
| B9 | PASS | Mobile Hero CTA возвращён в первый экран |
| C1 | OPEN | Удалить dead `.hero-slide` JS |
| C2 | OPEN | Удалить orphan `attorney-photo--yulia` class |
| C3 | OPEN | Заменить связанные hardcoded colors на tokens/документировать исключение |
| C4 | OPEN | `text-wrap: balance` у `.section-title` |
| C5 | OPEN | `line-height: 1.25` у success title |
| C6 | OPEN | Нижний отступ precedent через `--section-pad` |
| C7 | OPEN | Placeholder `--ink-4` → доступный цвет |
| C8 | OPEN | SVG `stroke=#F0AE1F` → `currentColor` + container color |

Отдельные решения по будущему финальному варианту:

- [x] OWNER `2026-08-11`: для отдельного `final-dev3` выбраны
  Playfair Display + Onest.
- [x] OWNER `2026-08-11`: база `final-dev3` — `final-dev1`, а не
  экспериментальные Hero A/B.
- [x] OWNER `2026-08-11`: сохранить текущие тексты, включая текущую композицию
  Hero H1/lede, и Action Bar `2.3.1`.
- [x] LOCAL `final-dev3 v1.0.0` собран и прошёл strict-clone/verifier/browser/pixel
  гейты; marker `FINAL-DEV3-DESIGN v1.0.0 | 2026-08-11`.
- [x] LIVE `final-dev3`: deployment `2f20dc33-714f-4b3a-86ea-b51880e33f05`;
  readback исторического `v1.0.0` прошёл без изменения старых
  Preview/production.
- [x] OWNER `2026-08-11`: в `final-dev3 v1.1.0` Hero сохраняет текущий телефон
  в рабочее время и показывает `Написать в WhatsApp` со ссылкой/иконкой в
  нерабочее; Action Bar `2.3.1` — единственный источник расписания/state/timer,
  demo-switch синхронизирует Hero и панель.
- [x] LOCAL Реализация и локальная приёмка
  `FINAL-DEV3-DESIGN v1.1.0 | 2026-08-11`: `173/173`, single `15/15`,
  verifier `11/11`.
- [x] Commit/push и live deployment/readback `v1.1.0` прошли: `88efa2c`,
  `52a9addb-0166-4f78-8c7d-5f1b0ed2ad07`.
- [ ] CLIENT Решить, нужна ли отсутствующая секция «Подготовка к консультации».
- [ ] CLIENT Решить состав формы: topic вместо email, четвёртым полем или без
  topic.
- [ ] CLIENT Согласовать расширение top-line на уголовное/миграционное право и
  добавленные секционные/служебные формулировки.
- [x] Блок Юлии Саакян отдельно подтверждён владельцем `2026-08-10`.
- [x] «Более 30 лет» и исходный порядок карточек фактов подтверждены владельцем.

Legacy-документы читать как историю, а не current-state без сверки с этим
чек-листом: `ACTION-BAR-REVIEW.md` описывает дефекты v1,
`FONT-VARIANTS.md` содержит старый publish status, `DEPLOY.md` — исторические
auth/IP-состояния, `TRACKING-REQUIREMENTS.md` — частично старый wrapper-status,
`SCREEN-COMPOSITION.md` — старое mobile `4/5` для фото адвокатов,
`boards/2026-08-06-versions-screenshots.md` — поведение Action Bar v1, а
`tasks/2026-08-06-session-handoff.md` — уже закрытые задачи как открытые.

## 17. Финальная передача заказчику

- [x] Клиентская карта `2.4.0` содержит `final-dev3`, прежние финальные версии,
  четыре шрифта, два Hero, эталон панели и текст с номерами.
- [x] На каждой версии показана одинаковая мобильная нижняя панель.
- [x] Краткое описание конверсионного пути находится в карте Preview.
- [ ] Перед отправкой явно пометить, что Albato delivery и аналитика ещё не
  включены; не демонстрировать success как доказательство CRM-записи.
- [ ] Перед отправкой выбрать, какие OPEN-пункты принимаются как долг, а какие
  должны быть закрыты до Ready/merge.
- [ ] CLARIFY Выбрать production-архитектуру Action Bar. Публикация штатного
  `site/ + functions/` добавит lead/social, но намеренно оставит production без
  панели. Для панели нужен канонический action-bar artifact либо отдельный
  production build pipeline.
- [ ] BLOCKER После этого выбора опубликовать правильный утверждённый artifact
  + `functions/`, повторить Function/social/Action Bar readback и только затем
  сообщать, что основной URL содержит текущий функционал.
- [ ] BLOCKER До финальной клиентской ссылки устранить расхождение
  `og:url/og:image` host и абсолютный production `og:image`.
- [ ] BLOCKER При переходе на `www.gambarian.com` заменить canonical/social
  origin, поднять версии metadata и снять `noindex` только после проверки
  реального домена.
- [ ] После исправлений обновить версию/дату этого чек-листа и приложить новый
  commit SHA и GitHub Actions URL.

## Related

- [Журнал ошибок](ERRORS.md)
- [Карта одиннадцати Preview и URL](boards/2026-08-06-versions-links.md)
- [Задание Final Dev 1](tasks/2026-08-10-final-dev1-desktop-hero.md)
- [Задание Final Dev 3](tasks/2026-08-11-final-dev3-design-system.md)
- [Live release final-dev3](reviews/2026-08-11-final-dev3-live-release.md)
- [Полная browser/responsive-приёмка Preview](tasks/2026-08-10-all-previews-browser-qa.md)
- [Задание на фото](tasks/2026-08-10-attorney-photos-mobile.md)
- [Задание Action Bar](tasks/2026-08-10-action-bar-v2.md)
- [Разбор Action Bar](ACTION-BAR-REVIEW.md)
- [Lead webhook contract](LEAD-WEBHOOK-CONTRACT.md)
- [Social preview](SOCIAL-PREVIEW.md)
- [Варианты шрифтов](FONT-VARIANTS.md)
- [Deployment runbook](DEPLOY.md)
- [Композиция экранов](SCREEN-COMPOSITION.md)
- [Аналитика](TRACKING-REQUIREMENTS.md)
- [Независимая приёмка двух задач](reviews/2026-08-10-action-bar-v2-acceptance.md)
