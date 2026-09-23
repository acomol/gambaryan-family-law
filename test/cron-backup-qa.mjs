/* cron-worker backup/reconcile QA — REAL worker code against deterministic
   KV/D1/R2 mocks. No network, no wrangler, no live Cloudflare resources.

   Adapted from clients/luxemed/New Lending/test/cron-backup-qa.mjs
   (digitalhook-os-, feature/luxemed-new-lending@613cdd30) for Gambaryan's
   D1 schema (db/leads-schema.sql: name/phone/email, corrects_submission_id,
   full attribution set — no Assuta medical columns) and env var
   ALBATO_WEBHOOK_URL (unchanged Gambaryan secret name).

   Run: node test/cron-backup-qa.mjs
   Negative proofs:
     node test/cron-backup-qa.mjs --negative-truncated
     node test/cron-backup-qa.mjs --negative-no-archive */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

let DatabaseSync;
let d1Schema;
try {
  ({ DatabaseSync } = await import('node:sqlite'));
  d1Schema = readFileSync(new URL('../db/leads-schema.sql', import.meta.url), 'utf8');
} catch (error) {
  console.error('HARNESS ERROR: node:sqlite or D1 schema unavailable:', error);
  process.exit(2);
}

let worker;
let dumpD1ToR2;
let verifyPreviousDump;
let purgeExpiredDumps;
let probeD1;
let reconcile;
let claimD1Lease;
try {
  ({
    default: worker,
    dumpD1ToR2,
    verifyPreviousDump,
    purgeExpiredDumps,
    probeD1,
    reconcile,
    claimD1Lease,
  } = await import('../cron-worker/src/index.js'));
} catch (error) {
  console.error('HARNESS ERROR: worker module unavailable:', error);
  process.exit(2);
}

const D1_COLUMNS = [
  'submission_id', 'received_at', 'status', 'delivered_at', 'name', 'phone', 'email',
  'corrects_submission_id', 'form_id', 'landing_path', 'referrer_host',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content',
  'gclid', 'gbraid', 'wbraid', 'fbclid', 'payload_json',
];
const encoder = new TextEncoder();
const decoder = new TextDecoder();
let pass = 0;
let fail = 0;
let alerts = [];
let albatoHits = 0;
let sheetIds = [];

function check(name, condition, extra = '') {
  if (condition) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${extra ? `  → ${extra}` : ''}`);
  }
}

global.fetch = async (url, init = {}) => {
  const target = String(url);
  if (target.includes('api.telegram.org')) {
    const body = JSON.parse(String(init.body || '{}'));
    alerts.push(String(body.text || ''));
    return new Response('{}', { status: 200 });
  }
  if (target.startsWith('https://sheet.local/')) {
    return new Response(JSON.stringify({ submission_ids: sheetIds }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  }
  if (target.startsWith('https://albato.local/')) {
    albatoHits++;
    return new Response('OK', { status: 200 });
  }
  throw new Error(`unexpected fetch: ${target}`);
};

function makeKV() {
  const data = new Map();
  return {
    async put(key, value, options = {}) {
      data.set(key, { value: String(value), metadata: options.metadata || {}, options });
    },
    async get(key) { return data.has(key) ? data.get(key).value : null; },
    async delete(key) { data.delete(key); },
    async list({ prefix = '', limit = 1000 } = {}) {
      const keys = [...data.entries()].filter(([key]) => key.startsWith(prefix)).slice(0, limit)
        .map(([name, entry]) => ({ name, metadata: entry.metadata }));
      return { keys, list_complete: true };
    },
    _has(key) { return data.has(key); },
    _entry(key) { return data.get(key); },
  };
}

function bytesOf(value) {
  if (typeof value === 'string') return encoder.encode(value);
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  throw new Error(`unsupported R2 value: ${typeof value}`);
}
function makeR2() {
  const data = new Map();
  const putOrder = [];
  let corruptOnGet = null;
  return {
    async put(key, value) { data.set(key, bytesOf(value)); putOrder.push(key); },
    async get(key) {
      if (!data.has(key)) return null;
      let bytes = data.get(key);
      if (corruptOnGet === key) {
        const corrupt = new Uint8Array(bytes.byteLength + 1);
        corrupt.set(bytes); corrupt[corrupt.length - 1] = 0x20;
        bytes = corrupt;
        corruptOnGet = null;
      }
      return {
        async text() { return decoder.decode(bytes); },
        async arrayBuffer() { return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); },
      };
    },
    async list({ prefix = '' } = {}) {
      return {
        objects: [...data.keys()].filter(key => key.startsWith(prefix)).sort().map(key => ({ key })),
        truncated: false,
      };
    },
    async delete(key) { data.delete(key); },
    _has(key) { return data.has(key); },
    _text(key) { return data.has(key) ? decoder.decode(data.get(key)) : null; },
    _putOrder() { return [...putOrder]; },
    _corruptOnNextGet(key) { corruptOnGet = key; },
  };
}

function makeD1(initial = []) {
  const db = new DatabaseSync(':memory:');
  db.exec(d1Schema);
  let available = true;
  const insertStatement = db.prepare(
    `INSERT OR REPLACE INTO leads (${D1_COLUMNS.join(',')}) VALUES (${D1_COLUMNS.map(() => '?').join(',')})`
  );
  const insert = row => {
    insertStatement.run(...D1_COLUMNS.map(column => row[column] === undefined ? null : row[column]));
  };
  initial.forEach(insert);
  return {
    prepare(sql) {
      if (!available) throw new Error('D1 unavailable');
      const statement = db.prepare(sql.replace(/\?\d+/g, '?'));
      let bound = [];
      return {
        bind(...args) { bound = args.map(value => value === undefined ? null : value); return this; },
        all() { return { results: statement.all(...bound) }; },
        run() {
          const result = statement.run(...bound);
          return { success: true, meta: { changes: Number(result.changes) } };
        },
      };
    },
    _insert: insert,
    _delete(id) { db.prepare('DELETE FROM leads WHERE submission_id=?').run(id); },
    _get(id) { return db.prepare('SELECT * FROM leads WHERE submission_id=?').get(id); },
    _setAvailable(value) { available = value; },
  };
}

function dayOffset(offset) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = type => parts.find(part => part.type === type).value;
  const anchor = new Date(Date.UTC(Number(get('year')), Number(get('month')) - 1,
    Number(get('day')) + offset, 12));
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(anchor);
}
function isoOffset(days = 0) { return new Date(Date.now() + days * 86400000).toISOString(); }
function seedRow(id, receivedAt = isoOffset(-1), status = 'delivered') {
  const payload = { submission_id: id, phone: '+972500000001', name: 'QA' };
  return {
    submission_id: id, received_at: receivedAt, status,
    delivered_at: status === 'delivered' ? receivedAt : null,
    name: 'QA', phone: '+972500000001', email: 'qa@example.test',
    corrects_submission_id: null, form_id: 'family_law_contact',
    landing_path: '/', referrer_host: null, utm_source: 'qa',
    utm_medium: null, utm_campaign: null, utm_id: null, utm_term: null, utm_content: null,
    gclid: null, gbraid: null, wbraid: null, fbclid: null,
    payload_json: JSON.stringify(payload),
  };
}
function kvRecord(id, receivedAt, status = 'delivered') {
  const fields = { submission_id: id, name: 'QA', phone: '+972500000001', form_id: 'family_law_contact' };
  return { submission_id: id, received_at: receivedAt, status, fields };
}
function withAlerts(env) {
  return { ...env, TELEGRAM_TOKEN: 'test-token', TELEGRAM_CHAT_ID: 'test-chat' };
}
function sha256(text) { return createHash('sha256').update(text, 'utf8').digest('hex'); }
async function putBackup(r2, day, rows, storedRows = rows) {
  const full = rows.length ? `${rows.map(row => JSON.stringify(row)).join('\n')}\n` : '';
  const stored = storedRows.length ? `${storedRows.map(row => JSON.stringify(row)).join('\n')}\n` : '';
  const manifest = {
    day, snapshot_at: new Date().toISOString(), row_count: rows.length,
    byte_length: Buffer.byteLength(full), sha256: sha256(full), columns: D1_COLUMNS,
    status_counts: rows.reduce((counts, row) => ({ ...counts, [row.status]: (counts[row.status] || 0) + 1 }), {}),
    min_received_at: rows[0]?.received_at || null, max_received_at: rows.at(-1)?.received_at || null,
    schema_version: 1,
  };
  await r2.put(`backups/d1/${day}/leads.ndjson`, stored);
  await r2.put(`backups/d1/${day}/manifest.json`, `${JSON.stringify(manifest)}\n`);
}
async function runScheduled(cron, env) {
  const pending = [];
  await worker.scheduled({ cron }, env, { waitUntil(promise) { pending.push(promise); } });
  await Promise.all(pending);
}

async function negativeTruncated() {
  alerts = [];
  const rowA = seedRow('neg-a');
  const rowB = seedRow('neg-b');
  const r2 = makeR2();
  await putBackup(r2, dayOffset(-1), [rowA, rowB], [rowA]);
  const result = await verifyPreviousDump(withAlerts({ LEADS_ARCHIVE: r2, LEADS_DB: makeD1([rowA, rowB]) }));
  const alert = alerts.find(text => text.includes('целостность нарушена'));
  console.log('NEGATIVE: truncated NDJSON');
  console.log(`STATE: ${result.state}`);
  console.log(`ALERT: ${alert || '(нет)'}`);
  process.exit(alert && result.state === 2 ? 1 : 2);
}
async function negativeNoArchive() {
  alerts = [];
  const result = await verifyPreviousDump(withAlerts({ LEADS_DB: makeD1() }));
  const alert = alerts.find(text => text.includes('не удалось проверить бэкап'));
  console.log('NEGATIVE: LEADS_ARCHIVE missing');
  console.log(`STATE: ${result.state}`);
  console.log(`ALERT: ${alert || '(нет)'}`);
  process.exit(alert && result.state === 2 ? 1 : 2);
}

async function run() {
  console.log('\n=== CRON BACKUP QA (real worker + mock KV/D1/R2) ===\n');

  const toml = readFileSync(new URL('../cron-worker/wrangler.toml', import.meta.url), 'utf8');
  const cronLine = toml.match(/^crons\s*=\s*\[(.*)\]$/m)?.[1] || '';
  const cronStrings = [...cronLine.matchAll(/"([^"]+)"/g)].map(match => match[1]);
  const r2Blocks = [...toml.matchAll(/\[\[r2_buckets\]\]([\s\S]*?)(?=\r?\n\[|$)/g)]
    .map(match => match[1]);
  check('wrangler.toml has exactly 3 cron strings', cronStrings.length === 3,
    JSON.stringify(cronStrings));
  check('wrangler.toml has LEADS_ARCHIVE R2 binding',
    r2Blocks.some(block => /^binding\s*=\s*"LEADS_ARCHIVE"$/m.test(block)
      && /^bucket_name\s*=\s*"gambarian-leads-archive"$/m.test(block)));

  alerts = []; albatoHits = 0;
  const dispatchKv = makeKV();
  const pendingAt = isoOffset(-1);
  await dispatchKv.put('lead:dispatch-pending', JSON.stringify(kvRecord('dispatch-pending', pendingAt, 'pending')),
    { metadata: { status: 'pending', received_at: pendingAt } });
  const dispatchR2 = makeR2();
  await runScheduled('30 2 * * *', withAlerts({
    LEADS_KV: dispatchKv, LEADS_DB: makeD1([seedRow('dispatch-pending', pendingAt, 'pending')]),
    LEADS_ARCHIVE: dispatchR2, ALBATO_WEBHOOK_URL: 'https://albato.local/hook',
  }));
  check("cron '30 2' calls backupRun and writes a dump", dispatchR2._has(`backups/d1/${dayOffset(0)}/manifest.json`));
  check("cron '30 2' does not call sweep", albatoHits === 0, `Albato hits=${albatoHits}`);
  alerts = []; albatoHits = 0;
  await runScheduled('13 13 * * *', withAlerts({
    LEADS_KV: dispatchKv, LEADS_DB: makeD1(), ALBATO_WEBHOOK_URL: 'https://albato.local/hook',
  }));
  check('unknown cron does not call sweep', albatoHits === 0);
  check('unknown cron alerts explicitly', alerts.includes('⚠️ незнакомый cron: 13 13 * * *'));

  const dumpD1 = makeD1([seedRow('dump-a', isoOffset(-2)), seedRow('dump-b', isoOffset(-1))]);
  const dumpR2 = makeR2();
  const dump = await dumpD1ToR2(withAlerts({ LEADS_DB: dumpD1, LEADS_ARCHIVE: dumpR2 }));
  const base = `backups/d1/${dayOffset(0)}/`;
  const order = dumpR2._putOrder();
  const ndjson = dumpR2._text(`${base}leads.ndjson`);
  let persistedManifest;
  try { persistedManifest = JSON.parse(dumpR2._text(`${base}manifest.json`)); }
  catch (error) { persistedManifest = null; }
  check('dump puts NDJSON before manifest commit marker',
    order.length === 2 && order[0] === `${base}leads.ndjson` && order[1] === `${base}manifest.json`, JSON.stringify(order));
  check('persisted manifest parses as JSON', !!persistedManifest);
  check('persisted manifest sha256 is correct', persistedManifest?.sha256 === sha256(ndjson));
  check('persisted manifest row_count matches D1 rows', persistedManifest?.row_count === 2
    && dump?.manifest?.row_count === persistedManifest?.row_count);
  alerts = [];
  const corruptReadbackR2 = makeR2();
  corruptReadbackR2._corruptOnNextGet(`${base}leads.ndjson`);
  const corruptReadback = await dumpD1ToR2(withAlerts({ LEADS_DB: dumpD1, LEADS_ARCHIVE: corruptReadbackR2 }));
  check('same-run readback corruption alerts and fails integrity', corruptReadback?.integrity_ok === false
    && alerts.some(text => text.includes('same-run sha256 не совпадает')));

  const pagedRows = Array.from({ length: 501 }, (_, index) => seedRow(
    `paged-${String(index).padStart(3, '0')}`, isoOffset(-1)
  ));
  const pagedR2 = makeR2();
  const pagedDump = await dumpD1ToR2(withAlerts({ LEADS_DB: makeD1(pagedRows), LEADS_ARCHIVE: pagedR2 }));
  const persistedPagedRows = pagedR2._text(`${base}leads.ndjson`).trim().split('\n').map(JSON.parse);
  check('dump keyset pagination preserves 501 unique ordered rows', pagedDump?.manifest?.row_count === 501
    && new Set(persistedPagedRows.map(row => row.submission_id)).size === 501
    && persistedPagedRows[0].submission_id === 'paged-000'
    && persistedPagedRows.at(-1).submission_id === 'paged-500');

  alerts = [];
  const truncatedR2 = makeR2();
  const truncA = seedRow('trunc-a'); const truncB = seedRow('trunc-b');
  await putBackup(truncatedR2, dayOffset(-1), [truncA, truncB], [truncA]);
  const truncatedResult = await verifyPreviousDump(withAlerts({
    LEADS_ARCHIVE: truncatedR2, LEADS_DB: makeD1([truncA, truncB]),
  }));
  check('verify truncated NDJSON reports integrity violation',
    truncatedResult.state === 2 && alerts.some(text => text.includes('целостность нарушена')));
  alerts = [];
  const missingResult = await verifyPreviousDump(withAlerts({ LEADS_ARCHIVE: makeR2(), LEADS_DB: makeD1() }));
  check('verify missing manifest alerts', missingResult.state === 1
    && alerts.some(text => text.includes(`дамп за ${dayOffset(-1)} отсутствует`)));
  alerts = [];
  const noArchiveResult = await verifyPreviousDump(withAlerts({ LEADS_DB: makeD1() }));
  check('verify missing LEADS_ARCHIVE uses state-2 alert path', noArchiveResult.state === 2
    && alerts.some(text => text.includes('не удалось проверить бэкап')));

  alerts = [];
  const deletedRow = seedRow('admin-deleted-id');
  const setR2 = makeR2();
  await putBackup(setR2, dayOffset(-1), [deletedRow]);
  const setD1 = makeD1([deletedRow]); setD1._delete('admin-deleted-id');
  await verifyPreviousDump(withAlerts({ LEADS_ARCHIVE: setR2, LEADS_DB: setD1 }));
  check('verify set-diff lists an ID removed from live D1',
    alerts.some(text => text.includes('подтвердите admin-delete') && text.includes('admin-deleted-id')));

  alerts = [];
  const probeKv = makeKV(); const probeDb = makeD1(); probeDb._setAvailable(false);
  const probeEnv = withAlerts({ LEADS_KV: probeKv, LEADS_DB: probeDb });
  await probeD1(probeEnv); await probeD1(probeEnv);
  check('probe failures 1-2 are silent', alerts.length === 0);
  await probeD1(probeEnv);
  check('probe failure 3 alerts', alerts.filter(text => text.includes('D1 недоступен')).length === 1);
  for (let count = 4; count <= 11; count++) await probeD1(probeEnv);
  check('probe failures 4-11 do not repeat alert', alerts.filter(text => text.includes('D1 недоступен')).length === 1);
  for (let count = 12; count <= 14; count++) await probeD1(probeEnv);
  check('probe failures 12-14 remain silent', alerts.filter(text => text.includes('D1 недоступен')).length === 1);
  await probeD1(probeEnv);
  check('probe failure 15 repeats after 12 more failures', alerts.filter(text => text.includes('D1 недоступен')).length === 2);
  probeDb._setAvailable(true); await probeD1(probeEnv);
  check('probe recovery resets keys and alerts once', alerts.filter(text => text.includes('D1 восстановлен')).length === 1
    && !probeKv._has('ops:d1_probe_fail') && !probeKv._has('ops:d1_alerted'));

  alerts = []; sheetIds = [];
  const repairKv = makeKV(); const repairDb = makeD1();
  const oldAt = isoOffset(-20); const repairRecord = kvRecord('repair-id', oldAt);
  await repairKv.put('lead:repair-id', JSON.stringify(repairRecord),
    { metadata: { status: 'delivered', received_at: oldAt, albato_delivered_at: oldAt } });
  await reconcile(withAlerts({
    LEADS_KV: repairKv, LEADS_DB: repairDb, LEADS_ARCHIVE: makeR2(),
    SHEET_COUNT_URL: 'https://sheet.local/count',
  }));
  check('reconcile leg 2 repairs KV lead missing from D1', !!repairDb._get('repair-id'));
  check('reconcile leg 2 alerts repaired ID', alerts.some(text => text.includes('починено') && text.includes('repair-id')));

  alerts = []; sheetIds = [];
  const gapKv = makeKV(); const gapDb = makeD1([seedRow('r2-gap-id', isoOffset(-1))]);
  const gapEnv = withAlerts({
    LEADS_KV: gapKv, LEADS_DB: gapDb, LEADS_ARCHIVE: makeR2(),
    SHEET_COUNT_URL: 'https://sheet.local/count',
  });
  await reconcile(gapEnv); await reconcile(gapEnv);
  check('reconcile leg 4 alerts an R2 gap only once',
    alerts.filter(text => text.includes('R2 presence') && text.includes('r2-gap-id')).length === 1);
  check('reconcile leg 4 stores 30-day marker', gapKv._entry('ops:r2gap:r2-gap-id')?.options.expirationTtl === 30 * 86400);

  alerts = []; sheetIds = [];
  const bulkGapKv = makeKV();
  const bulkGapRows = Array.from({ length: 25 }, (_, index) => seedRow(
    `r2-bulk-${String(index).padStart(2, '0')}`, isoOffset(-1)
  ));
  const bulkGapEnv = withAlerts({
    LEADS_KV: bulkGapKv, LEADS_DB: makeD1(bulkGapRows), LEADS_ARCHIVE: makeR2(),
    SHEET_COUNT_URL: 'https://sheet.local/count',
  });
  await reconcile(bulkGapEnv); await reconcile(bulkGapEnv);
  const bulkGapAlerts = alerts.filter(text => text.includes('R2 presence'));
  check('reconcile leg 4 chunks >20 IDs and marks every delivered alert ID once',
    bulkGapAlerts.length === 2
      && bulkGapAlerts.every(text => (text.match(/r2-bulk-/g) || []).length <= 20)
      && bulkGapRows.every(row => bulkGapAlerts.join('\n').includes(row.submission_id))
      && bulkGapRows.every(row => bulkGapKv._has(`ops:r2gap:${row.submission_id}`)));

  const purgeR2 = makeR2();
  const oldKey = `backups/d1/${dayOffset(-31)}/leads.ndjson`;
  const oldManifest = `backups/d1/${dayOffset(-31)}/manifest.json`;
  const freshKey = `backups/d1/${dayOffset(-29)}/leads.ndjson`;
  await purgeR2.put(oldKey, 'old'); await purgeR2.put(oldManifest, '{}'); await purgeR2.put(freshKey, 'fresh');
  await purgeExpiredDumps({ LEADS_ARCHIVE: purgeR2 });
  check('purge removes objects older than 30 days', !purgeR2._has(oldKey) && !purgeR2._has(oldManifest));
  check('purge preserves fresh objects', purgeR2._has(freshKey));

  /* ============ Review 2026-09-23 (independent Codex review of bd8dc8e) —
     finding 3 (cron-side) and finding 4. See docs/LEAD-PIPELINE.md
     "Review 2026-09-23" table for finding -> fix -> test. */

  // [finding 3, P1] A lead persisted ONLY in D1 (no KV key exists for it at
  // all — e.g. intake happened while KV was fully broken) must still be
  // retried by the cron sweep, not stranded because sweep only lists KV.
  {
    alerts = []; albatoHits = 0;
    const d1OnlyId = 'd1-only-pending-cron';
    const emptyKv = makeKV(); // no lead: key for this id whatsoever
    const d1OnlySweepDb = makeD1([seedRow(d1OnlyId, isoOffset(-1), 'pending')]);
    await runScheduled('*/5 * * * *', withAlerts({
      LEADS_KV: emptyKv, LEADS_DB: d1OnlySweepDb, ALBATO_WEBHOOK_URL: 'https://albato.local/hook',
    }));
    check('cron sweep retries a D1-only pending row missing from KV entirely',
      d1OnlySweepDb._get(d1OnlyId)?.status === 'delivered', JSON.stringify(d1OnlySweepDb._get(d1OnlyId)));
  }

  // [finding 4, P1] claimD1Lease must never regress a LIVE (unexpired)
  // 'forwarding' row back to 'pending' via a stale KV-sourced snapshot, and
  // must not steal the lease while it is still held by another isolate.
  {
    const liveId = 'live-forwarding-race';
    const freshLeaseStart = new Date().toISOString(); // held right now, nowhere near the 15s expiry
    const raceDb = makeD1([{ ...seedRow(liveId, isoOffset(-1), 'forwarding'), delivered_at: freshLeaseStart }]);
    // Cron's own KV-sourced view of this lead is STALE ("pending", as it
    // looked before Pages claimed the D1 lease moments ago).
    const staleRec = kvRecord(liveId, isoOffset(-1), 'pending');
    const claim = await claimD1Lease(withAlerts({ LEADS_DB: raceDb }), staleRec, new Date().toISOString());
    check('claimD1Lease does not steal a live unexpired forwarding lease from a stale pending snapshot',
      claim === 'pending', `claim=${claim}`);
    check('claimD1Lease does not regress the live row status/lease timestamp',
      raceDb._get(liveId)?.status === 'forwarding' && raceDb._get(liveId)?.delivered_at === freshLeaseStart,
      JSON.stringify(raceDb._get(liveId)));
  }

  console.log(`\n=== RESULT: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail ? 1 : 0);
}

const mode = process.argv[2];
if (mode === '--negative-truncated') negativeTruncated().catch(error => {
  console.error('HARNESS ERROR:', error); process.exit(2);
});
else if (mode === '--negative-no-archive') negativeNoArchive().catch(error => {
  console.error('HARNESS ERROR:', error); process.exit(2);
});
else if (mode) {
  console.error(`HARNESS ERROR: unknown argument ${mode}`);
  process.exit(2);
}
else run().catch(error => { console.error('HARNESS ERROR:', error); process.exit(2); });
