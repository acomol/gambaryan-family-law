# Client Preview live release — 2026-08-13

**Версия:** `CLIENT-PREVIEW-LIVE-RELEASE v1.0.0`

**Статус:** `LIVE PASS 11/11 / READY FOR CLIENT / PRODUCTION UNCHANGED`

## Release

- Cloudflare account: `4799e9f76c607e036c430a148d06a80b`;
- project: `gambarian-landing`; production branch: `main`;
- deployed source SHA: `75558d904d2d1d41ffc9af075f2ea363b15c0b91`;
- functional candidate: `d3032b70d327d071ebc82b75b23a860fbba1e74c`;
- Wrangler `4.120.0`; Action Bar `2.3.4`; Client Preview Mobile `1.1.0`;
  `final-dev3 2.0.2`.

## Deployments

| Preview | Stable URL | Immutable URL | Deployment UUID |
|---|---|---|---|
| `final-dev` | https://final-dev.gambarian-landing.pages.dev/ | https://1f16d8f7.gambarian-landing.pages.dev/ | `1f16d8f7-eb47-4bf8-be65-e3b7a6696dfe` |
| `final-dev1` | https://final-dev1.gambarian-landing.pages.dev/ | https://234948f2.gambarian-landing.pages.dev/ | `234948f2-a4f3-480a-a9f4-e65fdf51ccca` |
| `final-dev3` | https://final-dev3.gambarian-landing.pages.dev/ | https://2fd43b6a.gambarian-landing.pages.dev/ | `2fd43b6a-8163-4ff8-9992-c9f58ab240ae` |
| `v1-playfair-onest` | https://v1-playfair-onest.gambarian-landing.pages.dev/ | https://c0dc346f.gambarian-landing.pages.dev/ | `c0dc346f-6e01-418f-a01a-25f22f13ca75` |
| `v2-lora-inter` | https://v2-lora-inter.gambarian-landing.pages.dev/ | https://7d72f545.gambarian-landing.pages.dev/ | `7d72f545-03b4-49cd-a542-9c1ef0e6fe2b` |
| `v3-literata-manrope` | https://v3-literata-manrope.gambarian-landing.pages.dev/ | https://ad8e868b.gambarian-landing.pages.dev/ | `ad8e868b-c6d2-4265-b18a-490c162d6dcb` |
| `v4-ptserif-golos` | https://v4-ptserif-golos.gambarian-landing.pages.dev/ | https://8dbb8ec2.gambarian-landing.pages.dev/ | `8dbb8ec2-8531-4a91-8b49-f9cd6be48be3` |
| `hero-a-actions-first` | https://hero-a-actions-first.gambarian-landing.pages.dev/ | https://b6784377.gambarian-landing.pages.dev/ | `b6784377-9ce5-4d8f-8590-e9f4442aec9e` |
| `hero-b-call-first` | https://hero-b-call-first.gambarian-landing.pages.dev/ | https://fbbcda43.gambarian-landing.pages.dev/ | `fbbcda43-f72b-46ab-bcc6-0ccf7291f6f3` |
| `action-bar` | https://action-bar.gambarian-landing.pages.dev/ | https://7004ea5c.gambarian-landing.pages.dev/ | `7004ea5c-4282-4dbf-b0db-65bb6329b548` |
| `review-numbered` | https://review-numbered.gambarian-landing.pages.dev/ | https://043b16cb.gambarian-landing.pages.dev/ | `043b16cb-59c2-4a65-a553-717b278f3b05` |

Все deployments имеют `stage=deploy`, `status=success`, правильный alias и
commit metadata `75558d904d2d1d41ffc9af075f2ea363b15c0b91`.

## Live readback

- stable и immutable HTML каждого Preview побайтно совпадают с локальным build;
- 11/11: HTTP `200`, Action Bar `2.3.4`, mobile `1.1.0`, `noindex`;
- 11/11: точный блок Юлии присутствует; Email/topic/WhatsApp `?text=` отсутствуют;
- 11/11: `GET /api/lead` возвращает `405` и `Allow: POST`;
- `final-dev3`: marker `2.0.2`, stateful Hero/Action Bar latch PASS;
- live Browser QA runner `1.3.2`: `177/177 PASS` =
  `110 main + 55 breakpoint + 8 large + 4 effective-width`.

## Production isolation

- URL: https://gambarian-landing.pages.dev/;
- deployment UUID: `af10299b-1257-4f65-b66d-4b1e3041bf74`;
- source commit: `cb9135ce9d63e73bab5f01a3aa27ffc5f1fe7a7b`;
- SHA-256 до и после Preview deploy:
  `656CBCD0635952899E79B847D5C262724979D21F548CA66E13FE3A7D2EC13E22`;
- Preview/Action Bar/final-dev markers: `0`.

Production не деплоился и не изменился.

## Остаточные ограничения

- полный WCAG AA PASS не заявляется: zoom 200% остаётся OPEN;
- safe-area на физическом iPhone остаётся ручной проверкой;
- реальный Albato POST/Catch/readback не выполнялся.
