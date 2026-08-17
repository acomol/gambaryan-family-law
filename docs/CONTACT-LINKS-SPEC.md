# Кликабельные контакты: проверенные форматы ссылок

Справка по форматам, проверенная по официальной документации 2026-08-06.
Применяется ко всем контактам на лендинге: телефон, WhatsApp, адрес.

**Нормализованные данные практики:**

| Что | Значение |
| --- | --- |
| Телефон, E.164 | `+972545490623` |
| WhatsApp-формат | `972545490623` (без `+`, нулей и дефисов) |
| Адрес, иврит | `קרליבך 10, תל אביב` |
| Адрес, латиница | `Karlibach St 10, Tel Aviv-Yafo` |

---

## 1. Адрес → Google Maps

**Формат: Maps URLs.** Единственный официально задокументированный вариант,
работающий без API-ключа и сам выбирающий приложение или веб.

```
https://www.google.com/maps/search/?api=1&query=<адрес в percent-encoding>
```

Цитаты из `developers.google.com/maps/documentation/urls/get-started`:

- «You don't need a Google API key to use Maps URLs.»
- «If Google Maps app for Android is installed and active, the URL launches
  Google Maps in the Maps app… If the Google Maps app is not installed or is
  disabled, the URL launches Google Maps in a browser.»
- «This parameter is required in every request» — про `api=1`.
- Кодирование: пробел → `+`, запятая → `%2C`, кириллица и иврит → UTF-8
  percent-encoding.

Google прямо рекомендует универсальные Maps URLs вместо схемы
`comgooglemaps://`: «these universal URLs allow for broader handling of the maps
requests no matter which platform the user is on».

**Готовая ссылка для этой практики** (в HTML-атрибуте `&` пишется `&amp;`):

```html
<a href="https://www.google.com/maps/search/?api=1&amp;query=%D7%A7%D7%A8%D7%9C%D7%99%D7%91%D7%9A+10%2C+%D7%AA%D7%9C+%D7%90%D7%91%D7%99%D7%91"
   target="_blank" rel="noopener"
   aria-label="Открыть адрес в Google Maps: Тель-Авив, Карлибах 10">Тель-Авив, Карлибах&nbsp;10</a>
```

Адрес в запросе дан на иврите — в Израиле резолвится надёжнее всего.

**Отвергнутые варианты:**

| Вариант | Почему нет |
| --- | --- |
| `maps.app.goo.gl/…` | не документирован как API-поверхность, генерируется вручную из UI, лишний редирект, содержимое не проверяется из кода |
| `geo:` URI (RFC 5870) | обработка целиком на стороне ОС; на десктопе и в iOS Safari обработчика нет — ссылка умирает |

**`query_place_id`** имеет смысл добавлять, только если у практики есть
подтверждённый Google Business Profile и адресный запрос ведёт не туда (в
бизнес-центре вероятно). Формат: `…&query=<адрес>&query_place_id=ChIJ…`;
`query` остаётся фолбэком — это его роль по документации. Получить ID можно
через Place ID Finder на
`developers.google.com/maps/documentation/places/web-service/place-id`, свой
ключ не нужен. Google предупреждает: «Place IDs may change over time»,
обновлять раз в 12 месяцев.

## 2. Waze — запасной вариант

Документация `developers.google.com/waze/deeplinks`. База `https://waze.com/ul`,
параметры `q=` (поиск), `ll=lat,lon`, `navigate=yes`.

```html
<a href="https://waze.com/ul?ll=32.069233%2C34.783136&amp;navigate=yes"
   target="_blank" rel="noopener">Открыть в Waze</a>
```

**Решение по проекту:** используем только Google Maps. Waze добавляется одной
строкой, если понадобится.

⚠️ **Координаты `32.069233, 34.783136` получены из OpenStreetMap/Nominatim и с
реальным пином офиса не сверены.** До сверки в разметку их не ставим — ошибка в
координатах отправит клиента не в то здание. Ссылка на карту работает по
адресу, координаты ей не нужны.

⚠️ Утверждение «в Израиле все пользуются Waze» проверяемого источника не имеет:
публичной статистики по стране нет, отраслевые сводки дают только глобальные
цифры.

## 3. Телефон

**Только глобальный формат с `+` и кодом страны.** RFC 3966:

- «Globally unique numbers are identified by the leading '+' character.»
- «All phone numbers MUST use the global form unless they cannot be represented
  as such.»

Локальная форма (`tel:054-549-0623`) допустима только для номеров, физически
непредставимых глобально, и требует параметр `phone-context`. К израильскому
мобильному не относится — локальная форма ломает звонок из роуминга и из-за
границы.

```html
<a href="tel:+972545490623">054-549-0623</a>
```

**Текстом ссылки должен быть сам номер**, а не слово «Позвонить»: на десктопе
клик может ничего не дать, и номер нужно прочитать глазами. Это же требование
доступности — скринридеры зачитывают список ссылок вне контекста.

`target="_blank"` на `tel:` **не ставить** — бессмысленно, в части браузеров
даёт мигающую пустую вкладку.

Поведение на десктопе (web.dev, Click to Call): «Desktop browsers that don't
support voice calls open the default telephony app on the computer; for example
Google Voice or Microsoft Communicator». То есть `tel:` на десктопе не мёртв, а
непредсказуем.

## 4. WhatsApp

Официальный формат — `https://wa.me/<number>`. WhatsApp Help Center:

- «Use `https://wa.me/<number>` where the `<number>` is a full phone number in
  international format.»
- «Omit any zeroes, brackets, or dashes when adding the phone number.»
- С текстом: `https://wa.me/<number>?text=<urlencodedtext>`.

`wa.me` редиректит на `api.whatsapp.com/send/?phone=…` — проверено `curl -L`.
Используем короткий канонический `wa.me`.

Предзаполненный текст можно использовать как разметку источника лида — тогда в
переписке видно, с какой страницы пришёл человек.

> **Действующее исключение Gambarian (`2026-08-11`).** Для этого лендинга
> предзаполненный текст не разрешён действующим allowlist-контрактом. Все
> WhatsApp-ссылки текущего кандидата используют ровно
> `https://wa.me/972545490623`, без query `?text=`. Общий синтаксис выше остаётся
> справкой и не является разрешением вернуть prefill в этот проект.

## 5. Доступность и разметка

`Attorney` в schema.org помечен как deprecated: «This type is deprecated -
LegalService is more inclusive and less ambiguous». В JSON-LD лендинга тип
`Attorney` у сотрудников заменён на `Person`.

Google Search Central по LocalBusiness: обязательны `name` и `address`,
рекомендуются `telephone`, `geo`, `url`, `openingHoursSpecification`; телефон —
с кодом страны. Добавлено свойство `hasMap` со ссылкой на карту.

Правила разметки ссылок:

- иконочные ссылки обязаны иметь `aria-label`; SVG внутри — `aria-hidden="true"`;
- текст ссылки на карту — сам адрес, не «здесь» и не «карта»;
- `target="_blank"` уже даёт неявный `rel="noopener"` (MDN), но атрибут
  оставляем как страховку для старых движков;
- `rel="noreferrer"` не ставить — обрежет атрибуцию.

## 6. Аналитика

GA4 Enhanced Measurement считает исходящим кликом только переход «to another
website». Отсюда:

- **`tel:` в автосбор не попадает** — это не http-переход;
- `wa.me`, `google.com/maps` попадают, но обезличенным событием `click`, не
  ключевым, вперемешку с любыми внешними ссылками.

Правильная схема — GTM, триггер *Click — Just Links* с включёнными **Wait for
Tags** (2000 мс) и **Check Validation**, условие по `Click URL`:

```
^tel:|^https?://(wa\.me|api\.whatsapp\.com)|google\.com/maps|waze\.com
```

Тег GA4 с единым событием `contact_click` и параметром `method`
(`phone` / `whatsapp` / `google_maps`). `method` зарегистрировать как custom
dimension, `contact_click` отметить как key event.

На каждой контактной ссылке лендинга есть атрибут `data-action` — точка
подключения без правки разметки.

## Related

- `docs/HERO-CTA-RESEARCH.md` — практика первого экрана, откуда взята иерархия действий
- `docs/CONTENT-EXTRA.md` — какой служебный текст допустим вне 45 клиентских блоков
