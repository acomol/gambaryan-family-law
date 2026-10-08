/**
 * SyncPlan.gs — план синхронизации «Входящие» -> «Заявки» на каждый tick().
 * Design: docs/MINI-CRM-DESIGN.md §5.3, §9 ("повтор submission_id -> одна строка,
 * одно сообщение").
 *
 * Чистая функция: не читает и не пишет листы — принимает и возвращает данные.
 *
 * @param {Array<{submission_id:string}>} incomingRecords строки из «Входящих» за этот тик
 *   (могут содержать дубликаты одного submission_id — повтор Albato/повторный тик)
 * @param {Object<string, boolean>} existingBySubmissionId submission_id, уже
 *   заведённые в «Заявках» ранее
 * @param {string[]} [alreadyNotifiedIds] submission_id, по которым уведомление уже отправлено
 * @return {{toCreate: Array, toNotify: string[]}}
 */
function computeSyncPlan_(incomingRecords, existingBySubmissionId, alreadyNotifiedIds) {
  var seenThisBatch = {};
  var notifiedSet = {};
  (alreadyNotifiedIds || []).forEach(function (id) { notifiedSet[id] = true; });

  var toCreate = [];
  var toNotify = [];

  (incomingRecords || []).forEach(function (rec) {
    var id = rec && rec.submission_id;
    if (!id) return; // без submission_id обработать нельзя — пропускаем (не наша ошибка тут)
    if ((existingBySubmissionId && existingBySubmissionId[id]) || seenThisBatch[id]) {
      return; // строка уже есть или уже обработана в этом же батче — не создаём вторую
    }
    seenThisBatch[id] = true;
    toCreate.push(rec);
    if (!notifiedSet[id]) {
      toNotify.push(id);
      notifiedSet[id] = true;
    }
  });

  return { toCreate: toCreate, toNotify: toNotify };
}
