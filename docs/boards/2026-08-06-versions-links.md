# Десять Cloudflare Preview-версий для заказчика

**Версия карты:** `2.2.0`

**Обновлено:** `2026-08-11`

**Ветка:** `claude/website-development-kb0fu0`

Все адреса ниже — стабильные Cloudflare Pages Preview aliases. При повторной
сборке содержимое обновляется, ссылка остаётся прежней. Production
`gambarian-landing.pages.dev` в клиентскую выборку не входит.

Во всех десяти Preview используется **одна и та же Action Bar v2.3.0** из
единственного источника `site-addons/action-bar/`. Версии различаются только
заявленным вариантом — шрифтами, Hero или подписанными номерами. Production
при такой пересборке не изменяется.

## Ссылки

| Версия | Назначение | URL |
|---|---|---|
| `final-dev` | Итоговая базовая версия + Action Bar | https://final-dev.gambarian-landing.pages.dev/ |
| `final-dev1` | Новый Hero без дубля телефона; плотный mobile-кадр пары, читаемый desktop proof-блок, обновлённый текст прецедента, обе CTA на коротком mobile + Action Bar | https://final-dev1.gambarian-landing.pages.dev/ |
| `v1-playfair-onest` | Playfair Display + Onest + Action Bar | https://v1-playfair-onest.gambarian-landing.pages.dev/ |
| `v2-lora-inter` | Lora + Inter + Action Bar | https://v2-lora-inter.gambarian-landing.pages.dev/ |
| `v3-literata-manrope` | Literata + Manrope + Action Bar | https://v3-literata-manrope.gambarian-landing.pages.dev/ |
| `v4-ptserif-golos` | PT Serif + Golos Text + Action Bar | https://v4-ptserif-golos.gambarian-landing.pages.dev/ |
| `hero-a-actions-first` | Действия перед фотографией + Action Bar | https://hero-a-actions-first.gambarian-landing.pages.dev/ |
| `hero-b-call-first` | Звонок как главное действие + Action Bar | https://hero-b-call-first.gambarian-landing.pages.dev/ |
| `action-bar` | Эталонная версия мобильной Action Bar | https://action-bar.gambarian-landing.pages.dev/ |
| `review-numbered` | Копия текста со 102 подписанными номерами + Action Bar | https://review-numbered.gambarian-landing.pages.dev/ |

## Статус полной browser-приёмки

| Preview | Полная visual/responsive-приёмка |
|---|---|
| `final-dev1` | `LIVE PASS`: Hero `FINAL-DEV1-HERO v1.3.0` + `PRECEDENT-COPY v1.0.0` |
| Остальные девять Preview | `PENDING` — обязателен отдельный прогон по `PREVIEW-BROWSER-QA v1.0.0` |

Action Bar smoke уже выполнен на всех десяти URL, но он не заменяет полный
rendered-прогон каждого варианта. `final-dev` и `action-bar` используют общий
артефакт, но матрица и live-readback выполняются на каждом из двух URL.

## Версии контрактов

| Функционал | Версия | Дата |
|---|---:|---:|
| Карточка ссылки и логотип 1200×630 | `1.0.2` | 2026-08-10 |
| Мобильная Hero-полоса | `1.0.1` | 2026-08-10 |
| Нижняя панель | `2.3.0` | 2026-08-10 |
| Desktop Hero `final-dev1` | `1.3.0` | 2026-08-10 |
| Текст прецедента `final-dev1` | `1.0.0` | 2026-08-11 |
| Lead hook / форма | `1.1.0` | 2026-08-10 |
| Карта клиентских preview | `2.2.0` | 2026-08-10 |
| Browser QA клиентских Preview | `1.0.0` | 2026-08-10 |

## Как работает конверсионный путь

- Hero сразу объясняет специализацию и ведёт к форме либо звонку. На мобильном
  фото занимает полную ширину экрана без бокового смещения; CTA остаются
  крупными и доступны без точного попадания.
- Action Bar одинаково работает во всех десяти Preview: скрыта на Hero, видна
  при чтении, снова скрывается у формы, при открытом меню и при фокусе в поле.
  По времени Израиля в воскресенье–четверг с 09:00 включительно до 18:00
  исключительно доступны звонок, запись и WhatsApp. В остальное время телефон
  автоматически убирается, остаются «Записаться» и «Написать в WhatsApp».
  Preview-переключатель рядом с панелью позволяет показать заказчику оба
  состояния; перезагрузка возвращает автоматический режим.
- Поля формы имеют `autocomplete=name|tel|email`, корректные типы и ограничения.
  Ошибка показывается рядом с конкретным полем, а фокус переводится на первое
  место, которое нужно исправить; введённые данные при повторе сохраняются.
- После подключения encrypted secret форма отправляет JSON в `/api/lead`,
  Cloudflare Function валидирует его и передаёт в Albato. Повтор одной заявки
  сохраняет `submission_id`, поэтому downstream можно настроить как upsert.
- Сейчас Cloudflare endpoint и клиентская логика опубликованы, но Albato
  delivery не считается принятым до установки Preview secret, Catch webhook,
  дедупликации и контрольного readback конечной записи.
- При пересылке любой preview-ссылки Open Graph/Twitter используют фирменный
  логотип 1200×630 со стабильного `final-dev` image origin.

## Карта пересборки

| Группа | Источник | Производные |
|---|---|---|
| База | `site/` | исходник для десяти производных; production не изменяется |
| Нижняя панель — single source | `site-addons/action-bar/` | центральный этап сборки добавляет Action Bar во все десять Preview |
| Итоговая Dev | `scripts/build-action-bar.py` | `final-dev` использует тот же канонический `build/variants/action-bar`, что и эталон панели |
| Итоговая Dev 1 | `scripts/build-hero-variants.py dev1` | отдельный `build/variants/final-dev1`; desktop Hero не меняет `site/` и `final-dev` |
| Шрифты | `scripts/build-font-variants.py` + центральный этап Action Bar | четыре `build/font-variants/*` |
| Hero | `scripts/build-hero-variants.py` + центральный этап Action Bar | два `build/variants/hero-*` |
| Эталон панели | `scripts/build-action-bar.py` | `build/variants/action-bar` |
| Номера текста | `scripts/build-review-numbered.py` + центральный этап Action Bar | `build/variants/review-numbered` |

Копии CSS, HTML или JS панели внутри отдельных генераторов не допускаются:
изменение `site-addons/action-bar/` должно попадать во все десять Preview при
одной пересборке.

Исполняемая карта `branch → build directory`, версия Wrangler и дата хранятся в
`scripts/client-preview-map.json`. Версия карты и версия Action Bar хранятся
раздельно: добавление Preview не меняет контракт панели. `final-dev` и `action-bar` намеренно
публикуются из одного канонического артефакта, поэтому их панель не может
разойтись.

После пересборки общий статический гейт запускается командой
`python scripts/verify-client-previews.py`.

## Ограничения Preview

- Все страницы имеют `noindex` и не являются боевым доменом.
- GTM/GA4 ещё не подключены: события Action Bar складываются в `dataLayer`, но
  не уходят в аналитику без контейнера.
- Реальный POST в Albato не выполнять до настройки секрета и Catch webhook.

## Related

- [Куда публикуется сайт](../DEPLOY.md)
- [Контракт lead hook](../LEAD-WEBHOOK-CONTRACT.md)
- [Карточка ссылки](../SOCIAL-PREVIEW.md)
- [Требования аналитики](../TRACKING-REQUIREMENTS.md)
- [Полная browser/responsive-приёмка Preview](../tasks/2026-08-10-all-previews-browser-qa.md)
