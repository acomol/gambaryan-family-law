# Девять Cloudflare Preview-версий для заказчика

**Версия карты:** `2.0.0`

**Обновлено:** `2026-08-10`

**Ветка:** `claude/website-development-kb0fu0`

Все адреса ниже — стабильные Cloudflare Pages Preview aliases. При повторной
сборке содержимое обновляется, ссылка остаётся прежней. Production
`gambarian-landing.pages.dev` в клиентскую выборку не входит.

## Ссылки

| Версия | Назначение | URL |
|---|---|---|
| `final-dev` | Итоговая базовая версия | https://final-dev.gambarian-landing.pages.dev/ |
| `v1-playfair-onest` | Playfair Display + Onest | https://v1-playfair-onest.gambarian-landing.pages.dev/ |
| `v2-lora-inter` | Lora + Inter | https://v2-lora-inter.gambarian-landing.pages.dev/ |
| `v3-literata-manrope` | Literata + Manrope | https://v3-literata-manrope.gambarian-landing.pages.dev/ |
| `v4-ptserif-golos` | PT Serif + Golos Text | https://v4-ptserif-golos.gambarian-landing.pages.dev/ |
| `hero-a-actions-first` | Действия перед фотографией | https://hero-a-actions-first.gambarian-landing.pages.dev/ |
| `hero-b-call-first` | Звонок как главное действие | https://hero-b-call-first.gambarian-landing.pages.dev/ |
| `action-bar` | Мобильная нижняя панель действий | https://action-bar.gambarian-landing.pages.dev/ |
| `review-numbered` | Копия текста со 102 подписанными номерами | https://review-numbered.gambarian-landing.pages.dev/ |

## Версии контрактов

| Функционал | Версия | Дата |
|---|---:|---:|
| Карточка ссылки и логотип 1200×630 | `1.0.2` | 2026-08-10 |
| Мобильная Hero-полоса | `1.0.1` | 2026-08-10 |
| Нижняя панель | `2.0.0` | 2026-08-10 |
| Lead hook / форма | `1.1.0` | 2026-08-10 |
| Карта клиентских preview | `2.0.0` | 2026-08-10 |

## Как работает конверсионный путь

- Hero сразу объясняет специализацию и ведёт к форме либо звонку. На мобильном
  фото занимает полную ширину экрана без бокового смещения; CTA остаются
  крупными и доступны без точного попадания.
- Action Bar существует только в отдельной версии. Она скрыта на Hero, видна
  при чтении, снова скрывается у формы, при открытом меню и при фокусе в поле.
  Действия: звонок, запись, WhatsApp с готовым текстом.
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
| База | `site/` | `final-dev` и все варианты |
| Шрифты | `scripts/build-font-variants.py` | четыре `build/font-variants/*` |
| Hero | `scripts/build-hero-variants.py` | два `build/variants/hero-*` |
| Нижняя панель | `scripts/build-action-bar.py` | `build/variants/action-bar` |
| Номера текста | `scripts/build-review-numbered.py` | `build/variants/review-numbered` |

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
