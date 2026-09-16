(function (root) {
  "use strict";

  var schemaVersion = "2.3.0";
  root.GAMBARIAN_LEAD_CONTRACT = Object.freeze({
    // Требование владельца: при изменении схемы обновлять и версию, и дату.
    version: schemaVersion,
    schemaVersion: schemaVersion,
    schemaDate: "2026-09-16",
    endpoint: "/api/lead",
    eventName: "lead_form_submit",
    sourceSystem: "gambarian_family_law_landing",
    formId: "family_law_contact",
    landingLanguage: "ru",
    attributionStorageKey: "gambarian_lead_attribution_v1",
    // corrects_submission_id необязателен: пустая строка или UUID v4 принятой заявки.
    isValidSubmissionId: function (value) {
      return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    },
    isValidEmail: function (value) {
      return /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(value);
    },
    attributionFields: Object.freeze([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_id",
      "utm_term",
      "utm_content",
      "gclid",
      "gbraid",
      "wbraid",
      "fbclid",
    ]),
    limits: Object.freeze({
      bodyBytes: 8192,
      name: 100,
      phone: 40,
      email: 120,
      phoneDigitsMin: 6,
      phoneDigitsMax: 15,
      attribution: 255,
      landingPath: 256,
      referrerHost: 255,
    }),
    validation: Object.freeze({
      fieldLabels: Object.freeze({
        name: "Имя",
        phone: "Телефон",
        email: "E-mail",
      }),
      fields: Object.freeze({
        name: Object.freeze({
          required: "Введите имя.",
          tooShort: "Введите минимум 2 символа, не считая пробелов.",
          tooLong: "Имя должно быть не длиннее 100 символов.",
        }),
        phone: Object.freeze({
          required: "Введите номер телефона.",
          invalidFormat: "Введите от 6 до 15 цифр. Можно использовать +, пробелы, скобки, точки и дефисы.",
        }),
        email: Object.freeze({
          required: "Введите e-mail.",
          tooLong: "E-mail должен быть не длиннее 120 символов.",
          invalidFormat: "Введите e-mail в формате name@example.com.",
        }),
      }),
      codes: Object.freeze({
        required: "required",
        tooShort: "too_short",
        tooLong: "too_long",
        invalidFormat: "invalid_format",
      }),
      summaryTitle: "Проверьте выделенные поля",
      summaryText: "Под каждым полем указано, что именно нужно исправить.",
      offlineTitle: "Нет подключения к интернету",
      offlineText: "Проверьте соединение. Введённые данные сохранены — после подключения отправьте форму ещё раз.",
      timeoutTitle: "Сервер не подтвердил отправку вовремя",
      timeoutText: "Заявка могла быть принята, но подтверждение не пришло. Данные сохранены — повторите отправку через несколько секунд.",
      unavailableTitle: "Сервис отправки временно недоступен",
      unavailableText: "Введённые данные сохранены. Повторите отправку позже.",
      invalidRequestTitle: "Не удалось проверить данные",
      invalidRequestText: "Обновите страницу и заполните форму ещё раз. Если ошибка повторится, свяжитесь с нами напрямую.",
      rateLimitTitle: "Слишком много попыток",
      rateLimitText: "Подождите минуту и повторите отправку. Введённые данные сохранены.",
      deliveryTitle: "Не удалось подтвердить отправку",
      deliveryText: "Связь с сервером прервалась. Заявка могла быть принята; данные сохранены для безопасного повтора.",
    }),
    clientTimeoutMs: 12000,
    upstreamTimeoutMs: 10000,
  });
})(globalThis);
