/**
 * CorrectionChain.gs — разрешение цепочек исправлений контактов.
 * Design: docs/MINI-CRM-DESIGN.md §5.4.
 *
 * Запись (record) — плоский объект из «Входящих»:
 *   { submission_id, corrects_submission_id (может отсутствовать = корень),
 *     submitted_at (ISO-строка или Date), name, phone, email }
 */

/**
 * Идёт от recordId к корню по corrects_submission_id.
 * @return {{status:'ok', rootId:string, chain:string[]}
 *         | {status:'missing', missingId:string, chainSoFar:string[]}
 *         | {status:'cycle', ids:string[]}}
 */
function findChainRoot_(recordId, recordsById, maxHops) {
  maxHops = maxHops || 1000;
  var visited = {};
  var order = [];
  var currentId = recordId;
  var hops = 0;
  while (true) {
    if (visited[currentId]) {
      return { status: 'cycle', ids: order };
    }
    visited[currentId] = true;
    order.push(currentId);
    hops++;
    if (hops > maxHops) return { status: 'cycle', ids: order };
    var rec = recordsById[currentId];
    if (!rec) return { status: 'missing', missingId: currentId, chainSoFar: order.slice(0, -1) };
    if (!rec.corrects_submission_id) return { status: 'ok', rootId: currentId, chain: order };
    currentId = rec.corrects_submission_id;
  }
}

/**
 * Строит план применения цепочки исправлений для листового submission_id.
 *
 * - Если корень ещё не пришёл -> {status:'waiting_for_original'} (не создавать заявку, §5.4).
 * - Если обнаружен цикл -> {status:'cycle'} (ошибка одной заявки не должна останавливать остальные).
 * - Иначе -> вся цепочка (корень..лист), применяется в порядке submitted_at (не в порядке
 *   обнаружения/доставки — "реверсивный порядок доставки" не должен ломать итог),
 *   с учётом уже применённых id (idempotent повторный tick).
 *
 * @param {string} leafId
 * @param {Object<string,Object>} recordsById
 * @param {string[]} [alreadyApplied]
 */
function buildCorrectionPlan_(leafId, recordsById, alreadyApplied) {
  var found = findChainRoot_(leafId, recordsById);
  if (found.status === 'cycle') {
    return { status: 'cycle', ids: found.ids };
  }
  if (found.status === 'missing') {
    return { status: 'waiting_for_original', missingId: found.missingId, chainSoFar: found.chainSoFar };
  }

  var records = found.chain.map(function (id) { return recordsById[id]; });
  records.sort(function (a, b) {
    return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
  });

  var appliedSet = {};
  (alreadyApplied || []).forEach(function (id) { appliedSet[id] = true; });
  var toApplyIds = records
    .filter(function (r) { return !appliedSet[r.submission_id]; })
    .map(function (r) { return r.submission_id; });

  var last = records[records.length - 1];
  return {
    status: 'ok',
    rootId: found.rootId,
    orderedIds: records.map(function (r) { return r.submission_id; }),
    toApplyIds: toApplyIds,
    finalContacts: { name: last.name, phone: last.phone, email: last.email, submission_id: last.submission_id }
  };
}
