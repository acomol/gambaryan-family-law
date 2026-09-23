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
let upsertD1Guarded;
let hourlyRun;
let sweepPending;
try {
  ({
    default: worker,
    dumpD1ToR2,
    verifyPreviousDump,
    purgeExpiredDumps,
    probeD1,
    reconcile,
    claimD1Lease,
    upsertD1Guarded,
    hourlyRun,
    sweepPending,
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
let lastAlbatoBody = null;
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
    try { lastAlbatoBody = JSON.parse(String(init.body || '{}')); } catch (e) { lastAlbatoBody = null; }
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
// Review round 7, finding P1(c) (Codex gpt-6-sol on live 0aaf9e1): real
// Cloudflare KV allows only 1 write per second PER KEY
// (https://developers.cloudflare.com/kv/platform/limits/) — plain makeKV()
// above does not enforce this, so it could not have caught round 6's own
// bug (a same-key, same-second double write silently losing its second
// write in production, but succeeding harmlessly in the unlimited fake).
// A SEPARATE factory, used only where this limit is the point of the test:
// makeKV() itself stays unlimited because several PRE-EXISTING, unrelated
// tests (e.g. probeD1's own "ops:d1_probe_fail" bookkeeping) legitimately
// call put() on the SAME key many times back-to-back, simulating separate
// 5-minutes-apart cron runs without a fake clock — those are not the bug
// this finding is about. Only SUCCESSFUL writes count toward the per-key
// cooldown — a write that itself gets rejected never happened, so it
// cannot also consume the next slot (matches putRecordWithRetry's
// immediate-retry-after-failure use).
const KV_WRITE_COOLDOWN_MS = 1000;
function makeRateLimitedKV() {
  const kv = makeKV();
  const lastWriteAt = new Map();
  const originalPut = kv.put.bind(kv);
  kv.put = async (key, value, options = {}) => {
    const now = Date.now();
    const last = lastWriteAt.get(key);
    if (last != null && now - last < KV_WRITE_COOLDOWN_MS) {
      throw new Error(`KV rate limit: 1 write/sec per key exceeded for "${key}"`);
    }
    lastWriteAt.set(key, now);
    return originalPut(key, value, options);
  };
  return kv;
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
async function runScheduled(cron, env, scheduledTime) {
  const pending = [];
  await worker.scheduled({ cron, scheduledTime: scheduledTime ?? Date.now() }, env,
    { waitUntil(promise) { pending.push(promise); } });
  await Promise.all(pending);
}
// UTC timestamp for a given hour "today" — used to deterministically pick
// which branch of hourlyRun() a "0 * * * *" firing resolves to.
// The date is Jerusalem's "today" (same source as dayOffset(0)), not UTC's:
// between Jerusalem midnight and UTC midnight the two calendars differ and the
// assertions looked for the dump under the wrong day (flake seen 2026-09-23 22:26 UTC).
// Hours used here (2, 7, 18 UTC) all fall on the same Jerusalem date.
function utcHourTimestamp(hour) {
  const [y, m, d] = dayOffset(0).split('-').map(Number);
  return Date.UTC(y, m - 1, d, hour, 0, 0);
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
  check('wrangler.toml has exactly 2 cron strings (Workers Free: 5/account, assuta-lead-cron uses 3)',
    cronStrings.length === 2, JSON.stringify(cronStrings));
  check('wrangler.toml crons are the 5-min sweep and the hourly dump/reconcile trigger',
    cronStrings.includes('*/5 * * * *') && cronStrings.includes('0 * * * *'), JSON.stringify(cronStrings));
  check('wrangler.toml has LEADS_ARCHIVE R2 binding',
    r2Blocks.some(block => /^binding\s*=\s*"LEADS_ARCHIVE"$/m.test(block)
      && /^bucket_name\s*=\s*"gambarian-leads-archive"$/m.test(block)));

  // Round 5 addition (owner requirement): the daily backup extras and
  // reconcile were folded into the single hourly "0 * * * *" trigger,
  // gated by event.scheduledTime's UTC hour — not by a separate cron
  // string. Four scenarios per the coordinator's brief.
  alerts = []; albatoHits = 0;
  {
    // Hourly firing at a NON-2/NON-18 hour: dump only, no verify/purge/reconcile.
    const plainKv = makeKV();
    const plainR2 = makeR2();
    await runScheduled('0 * * * *', withAlerts({
      LEADS_KV: plainKv, LEADS_DB: makeD1(), LEADS_ARCHIVE: plainR2, ALBATO_WEBHOOK_URL: 'https://albato.local/hook',
    }), utcHourTimestamp(7));
    check("hourly '0 * * * *' at a plain hour writes a dump", plainR2._has(`backups/d1/${dayOffset(0)}/manifest.json`));
    check("hourly '0 * * * *' at a plain hour does not call sweep (Albato)", albatoHits === 0, `hits=${albatoHits}`);
    check("hourly '0 * * * *' at a plain hour does not run reconcile (no KV↔D1 repair alert)",
      !alerts.some(text => text.includes('KV→D1')), JSON.stringify(alerts));
  }
  alerts = []; albatoHits = 0;
  {
    // UTC hour 2: dump + verify (yesterday) + purge — the former "30 2" cron.
    const utc2R2 = makeR2();
    const utc2Db = makeD1();
    await runScheduled('0 * * * *', withAlerts({ LEADS_DB: utc2Db, LEADS_ARCHIVE: utc2R2 }), utcHourTimestamp(2));
    check("hourly '0 * * * *' at UTC hour 2 writes today's dump", utc2R2._has(`backups/d1/${dayOffset(0)}/manifest.json`));
    check("hourly '0 * * * *' at UTC hour 2 also verifies yesterday's dump",
      alerts.some(text => text.includes('дамп за') && text.includes('отсутствует')), JSON.stringify(alerts));
  }
  alerts = []; albatoHits = 0;
  {
    // UTC hour 18: dump + reconcile — the former "0 18" cron.
    const utc18Kv = makeKV();
    const utc18Db = makeD1();
    const utc18R2 = makeR2();
    const orphanId = 'utc18-kv-orphan';
    await utc18Kv.put(`lead:${orphanId}`, JSON.stringify(kvRecord(orphanId, isoOffset(-1), 'delivered')),
      { metadata: { status: 'delivered', received_at: isoOffset(-1) } });
    await runScheduled('0 * * * *', withAlerts({
      LEADS_KV: utc18Kv, LEADS_DB: utc18Db, LEADS_ARCHIVE: utc18R2, SHEET_COUNT_URL: 'https://sheet.local/count',
    }), utcHourTimestamp(18));
    check("hourly '0 * * * *' at UTC hour 18 writes today's dump", utc18R2._has(`backups/d1/${dayOffset(0)}/manifest.json`));
    check("hourly '0 * * * *' at UTC hour 18 also runs reconcile (repairs KV lead missing from D1)",
      !!utc18Db._get(orphanId));
  }
  alerts = []; albatoHits = 0;
  {
    // The 5-min sweep trigger must never write a dump.
    const sweepR2 = makeR2();
    await runScheduled('*/5 * * * *', withAlerts({
      LEADS_KV: makeKV(), LEADS_DB: makeD1(), LEADS_ARCHIVE: sweepR2, ALBATO_WEBHOOK_URL: 'https://albato.local/hook',
    }));
    check("'*/5 * * * *' does not write a dump", !sweepR2._has(`backups/d1/${dayOffset(0)}/manifest.json`));
  }

  alerts = []; albatoHits = 0;
  const dispatchKv = makeKV();
  const pendingAt = isoOffset(-1);
  await dispatchKv.put('lead:dispatch-pending', JSON.stringify(kvRecord('dispatch-pending', pendingAt, 'pending')),
    { metadata: { status: 'pending', received_at: pendingAt } });
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
    check('cron forward to Albato is sheet-safe (phone gets a leading apostrophe)',
      lastAlbatoBody && typeof lastAlbatoBody.phone === 'string' && lastAlbatoBody.phone.startsWith("'+"),
      JSON.stringify(lastAlbatoBody && lastAlbatoBody.phone));
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

  /* ============ Round 2 re-review (base 39750ac) — findings A and D on the
     cron side. See docs/LEAD-PIPELINE.md "Review 2026-09-23 — round 2". */

  // [finding A, P1 regression] cron's D1-sourced retry must not re-deliver a
  // lead KV already shows as delivered (D1's own final write failed once).
  {
    alerts = []; albatoHits = 0;
    const id = 'd1-repair-not-repost';
    const deliveredAt = new Date().toISOString();
    const oldReceivedAt = isoOffset(-1);
    const kv = makeKV();
    await kv.put(`lead:${id}`, JSON.stringify(kvRecord(id, oldReceivedAt, 'delivered')),
      { metadata: { status: 'delivered', received_at: oldReceivedAt, albato_delivered_at: deliveredAt } });
    const staleLeaseStart = new Date(Date.now() - 20000).toISOString();
    const db = makeD1([{ ...seedRow(id, oldReceivedAt, 'forwarding'), delivered_at: staleLeaseStart }]);
    await runScheduled('*/5 * * * *', withAlerts({ LEADS_KV: kv, LEADS_DB: db, ALBATO_WEBHOOK_URL: 'https://albato.local/hook' }));
    check('cron D1 retry does not re-post an already-delivered (per KV) lead', albatoHits === 0, `hits=${albatoHits}`);
    check('cron D1 retry repairs the stuck D1 row to delivered', db._get(id)?.status === 'delivered');
  }

  // [finding D, P2] An exception in LEADS_KV.list() must not abort the sweep
  // before the D1-sourced retry loop runs — the two phases are independent.
  {
    alerts = []; albatoHits = 0;
    const brokenKv = makeKV();
    brokenKv.list = async () => { throw new Error('KV list unavailable'); };
    const d1OnlyId = 'd1-only-survives-kv-list-failure';
    const db = makeD1([seedRow(d1OnlyId, isoOffset(-1), 'pending')]);
    await runScheduled('*/5 * * * *', withAlerts({ LEADS_KV: brokenKv, LEADS_DB: db, ALBATO_WEBHOOK_URL: 'https://albato.local/hook' }));
    check('D1-only retry still runs and delivers when LEADS_KV.list() throws',
      db._get(d1OnlyId)?.status === 'delivered', JSON.stringify(db._get(d1OnlyId)));
  }

  /* ============ Round 3 re-review (base ed4033f) — findings 2 and 4 on the
     cron side. See docs/LEAD-PIPELINE.md "Review 2026-09-23 — round 3". */

  // [finding 2, round 3, P1] A STALE completion write (this worker's own
  // attempt, delayed) must not clobber a row a NEWER isolate has since
  // reclaimed and is ACTIVELY forwarding under its own lease. Before this
  // fix, cron-worker's completion writes called plain upsertD1() with no
  // guard at all — its CASE WHEN only protects a 'delivered'/'deleted'
  // TERMINAL state from regressing, so it did nothing to stop a stale write
  // from overwriting another isolate's still-'forwarding' active lease
  // (wrong status and/or wiping out its delivered_at lease timestamp),
  // corrupting the cross-isolate exactly-one-forward bookkeeping.
  {
    const id = 'cron-race-active-lease';
    const receivedAt = isoOffset(-1);
    const staleLeaseStart = new Date(Date.now() - 5000).toISOString(); // this worker's own (now-stale) belief
    const newerLeaseStart = new Date().toISOString(); // a NEWER isolate reclaimed and is actively forwarding right now
    const db = makeD1([{
      ...seedRow(id, receivedAt, 'forwarding'), delivered_at: newerLeaseStart,
      name: 'CronRace', phone: '+972500000077', email: 'cronrace@x.com',
    }]);
    // This worker's own (stale) completion write believes it still owns
    // staleLeaseStart and is releasing the lead back to 'pending' after a
    // failed Albato attempt.
    const rec = {
      submission_id: id, fields: { name: 'CronRace', phone: '+972500000077', email: 'cronrace@x.com' },
      status: 'pending', received_at: receivedAt,
    };
    const result = await upsertD1Guarded({ LEADS_DB: db }, rec, staleLeaseStart);
    console.log('\n[finding 2, round 3] cron-worker stale completion write must not clobber a newer isolate active lease');
    check('upsertD1Guarded reports "not_owner" — the lease was reclaimed by a newer isolate',
      result === 'not_owner', String(result));
    check('D1 row keeps the NEWER isolate active lease untouched (status=forwarding, its own delivered_at)',
      db._get(id)?.status === 'forwarding' && db._get(id)?.delivered_at === newerLeaseStart,
      JSON.stringify(db._get(id)));
  }

  // [finding 4, round 3, P2] A soft-deleted lead must not trigger a false
  // "no MD file found" R2-presence alert — admin delete best-effort removes
  // the R2 .md file (functions/api/admin.js deleteLead), so a deleted row
  // legitimately has none.
  {
    alerts = []; sheetIds = [];
    const deletedGapDb = makeD1([seedRow('r2-gap-deleted-id', isoOffset(-1), 'deleted')]);
    const deletedGapEnv = withAlerts({
      LEADS_KV: makeKV(), LEADS_DB: deletedGapDb, LEADS_ARCHIVE: makeR2(),
      SHEET_COUNT_URL: 'https://sheet.local/count',
    });
    await reconcile(deletedGapEnv);
    console.log('\n[finding 4, round 3] reconcile leg 4 must not flag a soft-deleted lead as an R2 gap');
    check('reconcile leg 4 does not alert a missing R2 MD file for a soft-deleted row',
      !alerts.some(text => text.includes('R2 presence') && text.includes('r2-gap-deleted-id')),
      JSON.stringify(alerts));
  }

  /* ============ Round 4 re-review (base e7a719e) — finding C on the cron
     side. See docs/LEAD-PIPELINE.md "Review 2026-09-23 — round 4". */

  // [finding C, round 4, P2] An error IN the CAS guard itself (D1 down at
  // the exact moment of the completion write) must be treated like
  // "not_owner" — never like the legacy "no D1 configured" `false`
  // fallback. Round 3's fix only special-cased "not_owner"; a genuine D1
  // exception fell through the SAME path as "D1 unbound" and would have let
  // callers mark the lead delivered and alert regardless.
  {
    const id = 'cron-guard-error';
    const receivedAt = isoOffset(-1);
    const leaseStart = new Date().toISOString();
    const db = makeD1([{
      ...seedRow(id, receivedAt, 'forwarding'), delivered_at: leaseStart,
      name: 'CronGuardErr', phone: '+972500000033', email: 'cronguarderr@x.com',
    }]);
    const originalPrepare = db.prepare.bind(db);
    db.prepare = (sql) => {
      if (/AND status='forwarding' AND delivered_at=/.test(sql)) throw new Error('d1 down mid-guard');
      return originalPrepare(sql);
    };
    const rec = {
      submission_id: id, fields: { name: 'CronGuardErr', phone: '+972500000033', email: 'cronguarderr@x.com' },
      status: 'delivered', received_at: receivedAt, delivered_at: new Date().toISOString(),
    };
    const result = await upsertD1Guarded({ LEADS_DB: db }, rec, leaseStart);
    console.log('\n[finding C, round 4] cron-worker CAS-guard error must be distinguished from "no D1 configured"');
    check('upsertD1Guarded reports "error" (D1 exception), not the "no D1 bound" false',
      result === 'error', String(result));
    check('D1 row is untouched (still forwarding under the original lease)',
      db._get(id)?.status === 'forwarding' && db._get(id)?.delivered_at === leaseStart,
      JSON.stringify(db._get(id)));
  }

  /* ============ Round 5 (base 6034203) — janitor: bounded cleanup of the
     admin-delete race Codex found. See docs/LEAD-PIPELINE.md "Review
     2026-09-23 — round 5". Deletion is eventual (one cron interval), not
     instant — this janitor is the second, cron-bounded layer behind
     lead.js's own request-time re-checks. */

  // [round 5, janitor] A D1 row marked 'deleted' within the retention
  // window with a LEFTOVER KV key and R2 object (the resurrection the
  // request-time re-check in lead.js did not catch) must be idempotently
  // wiped, and the alert must report COUNTS ONLY — never a submission_id.
  {
    alerts = []; sheetIds = [];
    const id = 'janitor-leftover-id';
    const receivedAt = isoOffset(-1);
    const deletedAt = new Date().toISOString();
    const db = makeD1([{
      ...seedRow(id, receivedAt, 'deleted'), delivered_at: deletedAt,
      name: null, phone: null, email: null, payload_json: '{}',
    }]);
    const kv = makeKV();
    await kv.put(`lead:${id}`, JSON.stringify({ submission_id: id, fields: { name: 'Leftover', phone: '+972500000001' }, status: 'pending', received_at: receivedAt }));
    const r2 = makeR2();
    const day = receivedAt.slice(0, 10);
    const r2Key = `leads/${day}/${id}.md`;
    await r2.put(r2Key, '# leftover archive with PII');
    const env = withAlerts({ LEADS_KV: kv, LEADS_DB: db, LEADS_ARCHIVE: r2, SHEET_COUNT_URL: 'https://sheet.local/count' });
    await reconcile(env);
    console.log('\n[round 5, janitor] leftover KV/R2 for a deleted D1 row must be wiped, alert has no PII/id');
    check('KV key was wiped', !kv._has(`lead:${id}`));
    check('R2 object was wiped', !r2._has(r2Key));
    check('alert fired reporting counts only — no submission_id leaked',
      alerts.some(text => text.includes('janitor')) && !alerts.some(text => text.includes(id)),
      JSON.stringify(alerts));
  }

  // [round 5, janitor idempotency] A 'deleted' row with NO leftover KV/R2
  // copies (the common case — the request-time re-check already caught it)
  // must produce no alert at all: the janitor is a no-op re-run every cycle.
  {
    alerts = []; sheetIds = [];
    const id = 'janitor-clean-id';
    const db = makeD1([{
      ...seedRow(id, isoOffset(-1), 'deleted'), delivered_at: new Date().toISOString(),
      name: null, phone: null, email: null, payload_json: '{}',
    }]);
    const env = withAlerts({ LEADS_KV: makeKV(), LEADS_DB: db, LEADS_ARCHIVE: makeR2(), SHEET_COUNT_URL: 'https://sheet.local/count' });
    await reconcile(env);
    console.log('\n[round 5, janitor idempotency] Nothing to wipe → no alert (safe to re-run every cycle)');
    check('no janitor alert when nothing needed wiping', !alerts.some(text => text.includes('janitor')), JSON.stringify(alerts));
  }

  // [round 5, hourly overwrite] verifyPreviousDump must correctly verify a
  // "yesterday" dump that was OVERWRITTEN by a later hourly snapshot during
  // the day — the owner's new hourly cadence means backups/d1/<day>/ is
  // overwritten every hour, so "yesterday's" stored dump is whatever the
  // LAST hourly run before day-rollover captured, not a single write.
  // verifyPreviousDump only ever reads the CURRENT content of that prefix,
  // so an overwrite is transparent to it — no code change was needed; this
  // test is the evidence for that claim, not just an assertion of it.
  {
    alerts = [];
    const day = dayOffset(-1);
    const r2 = makeR2();
    const earlyRow = seedRow('overwrite-early', day);
    await putBackup(r2, day, [earlyRow]); // an earlier hour's snapshot
    const laterRow1 = seedRow('overwrite-early', day);
    const laterRow2 = seedRow('overwrite-late', day);
    await putBackup(r2, day, [laterRow1, laterRow2]); // a LATER hourly run overwrites the same key
    const db = makeD1([laterRow1, laterRow2]); // live D1 matches the latest snapshot
    const result = await verifyPreviousDump(withAlerts({ LEADS_ARCHIVE: r2, LEADS_DB: db }));
    console.log('\n[round 5, hourly overwrite] verifyPreviousDump reads the LATEST hourly snapshot for yesterday, not a stale one');
    check('verify succeeds against the overwritten (latest) snapshot', result.state === 0, JSON.stringify(result));
    check('verify sees the LATEST row count, not the earlier hour\'s', result.manifest?.row_count === 2, JSON.stringify(result.manifest));
  }

  /* ============ Round 5 addition 2 — pipeline-health v1 (owner-approved).
     See docs/LEAD-PIPELINE.md §12 for the full contract. An external reader
     (the mini-CRM Apps Script) is built against this EXACT shape. */

  function healthRequest(method, path) {
    return new Request(`https://cron.internal${path || '/health'}`, { method: method || 'GET' });
  }

  // [health] end-to-end shape: real hourlyRun + sweepPending write
  // cron_health, GET /health reads it back correctly, including stuck_leads.
  {
    const db = makeD1();
    const env = {
      LEADS_DB: db, LEADS_ARCHIVE: makeR2(), LEADS_KV: makeKV(),
      ALBATO_WEBHOOK_URL: 'https://albato.local/hook',
    };
    await hourlyRun(env, new Date(utcHourTimestamp(7))); // plain hour: dump only, real success
    await sweepPending(env); // real completed run (nothing to deliver yet)
    // Seed the stuck-lead fixtures AFTER sweep has already run, so sweep's
    // own D1-only-stragglers loop (which WOULD successfully "deliver" a
    // pending row via the mocked Albato and flip it out of pending/
    // forwarding) never touches them — this test is about the /health
    // COUNT, not about exercising delivery.
    db._insert(seedRow('stuck-old', new Date(Date.now() - 40 * 60 * 1000).toISOString(), 'pending'));
    db._insert(seedRow('stuck-new', new Date(Date.now() - 5 * 60 * 1000).toISOString(), 'forwarding'));
    const res = await worker.fetch(healthRequest(), env);
    const body = await res.json();
    console.log('\n[health] GET /health returns the pipeline-health v1 shape after real backup+sweep runs');
    check('200, application/json, Cache-Control: no-store', res.status === 200
      && (res.headers.get('content-type') || '').includes('application/json')
      && res.headers.get('cache-control') === 'no-store');
    check('schema=1 and generated_at is a fresh, parseable ISO timestamp',
      body.schema === 1 && typeof body.generated_at === 'string' && !Number.isNaN(Date.parse(body.generated_at)));
    check('backup reflects a real successful dump (last_ok_at set, integrity_ok=true)',
      !!body.backup?.last_ok_at && !!body.backup?.last_run_at && body.backup?.integrity_ok === true,
      JSON.stringify(body.backup));
    check('sweep reflects a real completed run (last_ok_at set)',
      !!body.sweep?.last_ok_at && !!body.sweep?.last_run_at, JSON.stringify(body.sweep));
    check('stuck_leads counts only the row received more than 30 minutes ago',
      body.stuck_leads === 1, JSON.stringify(body));
    check('albato_configured is a boolean reflecting the binding, never the URL value',
      body.albato_configured === true && !JSON.stringify(body).includes('albato.local'), JSON.stringify(body));
  }

  // [health] 503 when D1 is unreadable — both "not bound at all" and
  // "bound but the query itself throws".
  {
    const noD1 = await worker.fetch(healthRequest(), { ALBATO_WEBHOOK_URL: 'https://albato.local/hook' });
    const noD1Body = await noD1.json();
    const throwingDb = { prepare() { throw new Error('d1 down'); } };
    const throwingD1 = await worker.fetch(healthRequest(), { LEADS_DB: throwingDb });
    const throwingD1Body = await throwingD1.json();
    console.log('\n[health] D1 unavailable (unbound or throwing) → 503, exact contract error shape, no PII');
    check('no LEADS_DB at all → 503 {schema:1,error:"d1_unavailable"}',
      noD1.status === 503 && noD1Body.schema === 1 && noD1Body.error === 'd1_unavailable', JSON.stringify(noD1Body));
    check('LEADS_DB bound but querying throws → the same 503 contract',
      throwingD1.status === 503 && throwingD1Body.schema === 1 && throwingD1Body.error === 'd1_unavailable',
      JSON.stringify(throwingD1Body));
  }

  // [health] routing: unknown path → 404; non-GET on /health → 405.
  {
    const notFound = await worker.fetch(healthRequest('GET', '/'), {});
    const wrongMethod = await worker.fetch(healthRequest('POST', '/health'), {});
    console.log('\n[health] routing: unknown path 404, non-GET on /health 405');
    check('unknown path → 404', notFound.status === 404, String(notFound.status));
    check('POST /health → 405', wrongMethod.status === 405, String(wrongMethod.status));
  }

  // [health] a backup FAILURE must leave last_ok_at unchanged while
  // last_run_at still advances — the CRM reader relies on last_ok_at to
  // detect a stuck/stale backup even while runs keep firing.
  {
    const db = makeD1();
    const r2 = makeR2();
    const env = { LEADS_DB: db, LEADS_ARCHIVE: r2 };
    await hourlyRun(env, new Date(utcHourTimestamp(7))); // succeeds
    const afterOk = await (await worker.fetch(healthRequest(), env)).json();
    const firstOkAt = afterOk.backup.last_ok_at;
    const firstRunAt = afterOk.backup.last_run_at;
    await new Promise(resolve => setTimeout(resolve, 5)); // ensure a distinguishable later timestamp
    env.LEADS_ARCHIVE.put = async () => { throw new Error('r2 down'); }; // next dump fails
    await hourlyRun(env, new Date(utcHourTimestamp(7)));
    const afterFail = await (await worker.fetch(healthRequest(), env)).json();
    console.log('\n[health] backup failure leaves last_ok_at unchanged while last_run_at advances');
    check('first successful run sets last_ok_at === last_run_at',
      !!firstOkAt && firstOkAt === firstRunAt, JSON.stringify(afterOk.backup));
    check('failed run leaves last_ok_at at the PREVIOUS successful timestamp',
      afterFail.backup.last_ok_at === firstOkAt, JSON.stringify(afterFail.backup));
    check('failed run still advances last_run_at to a NEW timestamp',
      !!afterFail.backup.last_run_at && afterFail.backup.last_run_at !== firstRunAt, JSON.stringify(afterFail.backup));
    // Round 6, small item: the dump itself failed (R2 down) — dumpResult is
    // null and recordCronHealth stores detail="dump_failed", which
    // parseIntegrityOk resolves to null (unknown), NOT false. false is
    // reserved for "the dump succeeded but its OWN same-run integrity
    // check failed" — a different, more specific scenario this test does
    // not exercise.
    check('failed run reports integrity_ok as null (unknown — the dump itself failed, not merely its integrity check)',
      afterFail.backup.integrity_ok === null, JSON.stringify(afterFail.backup));
  }

  /* ============ Round 6 (base ea91e3c) — consolidated review (Codex + a
     5-lens review, independently re-verified). See
     docs/LEAD-PIPELINE.md "Review 2026-09-23 — round 6" for the table. */

  // [round 6, finding 1] KV-loop: completion CAS succeeds, THEN a
  // concurrent admin delete wins the race (D1→deleted, PII scrubbed)
  // BEFORE our own completion KV write lands — the resurrection must be
  // undone and no Telegram alert sent.
  {
    alerts = [];
    const id = 'round6-f1-kvloop';
    const receivedAt = isoOffset(-1);
    const kv = makeKV();
    await kv.put(`lead:${id}`, JSON.stringify(kvRecord(id, receivedAt, 'pending')),
      { metadata: { status: 'pending', received_at: receivedAt } });
    const db = makeD1([seedRow(id, receivedAt, 'pending')]);
    const env = withAlerts({ LEADS_KV: kv, LEADS_DB: db, ALBATO_WEBHOOK_URL: 'https://albato.local/hook' });
    const key = `lead:${id}`;
    const originalPut = kv.put.bind(kv);
    let sideEffectFired = false;
    kv.put = async (k, v, opts) => {
      if (!sideEffectFired && k === key && JSON.parse(v).status === 'delivered') {
        sideEffectFired = true;
        await db.prepare(
          "UPDATE leads SET status='deleted', delivered_at=?1, name=NULL, phone=NULL, email=NULL, payload_json='{}' WHERE submission_id=?2",
        ).bind(new Date().toISOString(), id).run();
      }
      return originalPut(k, v, opts);
    };
    await sweepPending(env);
    console.log('\n[round 6, finding 1] KV-loop must not resurrect PII or alert after a concurrent admin delete');
    check('D1 row stays deleted', db._get(id)?.status === 'deleted', JSON.stringify(db._get(id)));
    check('KV stays wiped (resurrection undone)', !kv._has(key));
    check('no Telegram alert fired for a deleted lead', !alerts.some(text => text.includes('Новая заявка')), JSON.stringify(alerts));
  }

  // [round 6, finding 1] D1-straggler loop: same resurrection race, via the
  // D1-only path (no KV key exists for this id at all).
  {
    alerts = [];
    const id = 'round6-f1-d1loop';
    const receivedAt = isoOffset(-1);
    const db = makeD1([seedRow(id, receivedAt, 'pending')]);
    const kv = makeKV();
    const env = withAlerts({ LEADS_DB: db, LEADS_KV: kv, ALBATO_WEBHOOK_URL: 'https://albato.local/hook' });
    const key = `lead:${id}`;
    const originalPut = kv.put.bind(kv);
    let sideEffectFired = false;
    kv.put = async (k, v, opts) => {
      if (!sideEffectFired && k === key && JSON.parse(v).status === 'delivered') {
        sideEffectFired = true;
        await db.prepare(
          "UPDATE leads SET status='deleted', delivered_at=?1, name=NULL, phone=NULL, email=NULL, payload_json='{}' WHERE submission_id=?2",
        ).bind(new Date().toISOString(), id).run();
      }
      return originalPut(k, v, opts);
    };
    await sweepPending(env);
    console.log('\n[round 6, finding 1] D1-straggler loop must not resurrect PII or alert after a concurrent admin delete');
    check('D1 row stays deleted', db._get(id)?.status === 'deleted', JSON.stringify(db._get(id)));
    check('KV stays wiped (resurrection undone)', !kv._has(key));
    check('no Telegram alert fired for a deleted lead', !alerts.some(text => text.includes('Новая заявка')), JSON.stringify(alerts));
  }

  // [round 6, finding 2] D1-straggler loop: admin delete lands AFTER the
  // lease claim (KV shows 'forwarding') but BEFORE the Albato POST — the
  // POST must not fire (matches the coordinator's exact repro citation,
  // index.js ~561 on ea91e3c).
  {
    albatoHits = 0;
    const id = 'round6-f2-d1loop';
    const receivedAt = isoOffset(-1);
    const db = makeD1([seedRow(id, receivedAt, 'pending')]);
    const kv = makeKV();
    const env = { LEADS_DB: db, LEADS_KV: kv, ALBATO_WEBHOOK_URL: 'https://albato.local/hook' };
    // Round 7, finding P1(b) removed the standalone "forwarding" KV write
    // this test used to hook — there is no longer a KV.put to intercept
    // between the claim and the send. Hook the D1 SELECT inside
    // isDeleted() instead (used by BOTH the pre-claim candidate check and
    // wipeIfDeletedAfterWrite's pre-POST re-check): 1st occurrence must see
    // "active" so the claim proceeds, 2nd occurrence is the pre-POST
    // re-check — inject the concurrent admin delete exactly there.
    const originalPrepare = db.prepare.bind(db);
    let selectCount = 0;
    db.prepare = sql => {
      if (/^SELECT status FROM leads WHERE submission_id=/.test(sql)) {
        selectCount++;
        if (selectCount === 2) {
          originalPrepare(
            "UPDATE leads SET status='deleted', delivered_at=?1, name=NULL, phone=NULL, email=NULL, payload_json='{}' WHERE submission_id=?2",
          ).bind(new Date().toISOString(), id).run();
        }
      }
      return originalPrepare(sql);
    };
    const before = albatoHits;
    await sweepPending(env);
    console.log('\n[round 6, finding 2] D1-straggler loop must not POST to Albato once a concurrent admin delete lands post-claim');
    check('no Albato POST fired', albatoHits === before, `hits=${albatoHits - before}`);
    check('D1 row stays deleted', db._get(id)?.status === 'deleted', JSON.stringify(db._get(id)));
  }

  // [round 6, finding 3] KV write budget: over a full simulated day of
  // 5-min sweeps (288 runs), ONE persistently-stuck pending lead must cost
  // at most ~60 total KV.put calls — not the ~1150/day the coordinator's
  // repro found (2 KV.put on the first sweep, then 4/sweep once BOTH loops
  // double-process the same id, uncapped, forever). A monkey-patched Date
  // advances 5 simulated minutes per iteration so the exponential backoff
  // window genuinely elapses, without literally waiting a day.
  async function simulateDailySweeps(env, kv, iterations = 288) {
    const RealDate = global.Date;
    let simulatedNow = RealDate.now();
    function FakeDate(...args) {
      if (args.length === 0) return new RealDate(simulatedNow);
      return new RealDate(...args);
    }
    FakeDate.now = () => simulatedNow;
    FakeDate.prototype = RealDate.prototype;
    let totalPuts = 0;
    const originalPut = kv.put.bind(kv);
    kv.put = async (...args) => { totalPuts++; return originalPut(...args); };
    global.Date = FakeDate;
    try {
      for (let i = 0; i < iterations; i++) {
        await sweepPending(env);
        simulatedNow += 5 * 60 * 1000;
      }
    } finally {
      global.Date = RealDate;
    }
    return totalPuts;
  }
  {
    const id = 'round6-f3-no-url';
    const receivedAt = isoOffset(-1);
    const kv = makeKV();
    await kv.put(`lead:${id}`, JSON.stringify(kvRecord(id, receivedAt, 'pending')),
      { metadata: { status: 'pending', received_at: receivedAt } });
    const db = makeD1([seedRow(id, receivedAt, 'pending')]);
    const env = { LEADS_KV: kv, LEADS_DB: db }; // no ALBATO_WEBHOOK_URL at all
    const totalPuts = await simulateDailySweeps(env, kv);
    console.log('\n[round 6, finding 3] no ALBATO_WEBHOOK_URL: one stuck lead over 288 sweeps stays within the KV write budget');
    check('total KV.put <= 60 (fix 3a: skip before any claim/KV write with no Albato URL configured)',
      totalPuts <= 60, `totalPuts=${totalPuts}`);
  }
  {
    const id = 'round6-f3-502';
    const receivedAt = isoOffset(-1);
    const kv = makeKV();
    await kv.put(`lead:${id}`, JSON.stringify(kvRecord(id, receivedAt, 'pending')),
      { metadata: { status: 'pending', received_at: receivedAt } });
    const db = makeD1([seedRow(id, receivedAt, 'pending')]);
    const env = { LEADS_KV: kv, LEADS_DB: db, ALBATO_WEBHOOK_URL: 'https://albato.local/hook-502' };
    const realFetch = global.fetch;
    global.fetch = async url => {
      const target = String(url);
      if (target.startsWith('https://albato.local/')) return new Response('bad gateway', { status: 502 });
      throw new Error(`unexpected fetch in budget test: ${target}`);
    };
    let totalPuts;
    try {
      totalPuts = await simulateDailySweeps(env, kv);
    } finally {
      global.fetch = realFetch;
    }
    console.log('\n[round 6, finding 3] Albato returning 502: one persistently-failing lead over 288 sweeps stays within the KV write budget');
    check('total KV.put <= 60 (fix 3b dedup + 3c exponential backoff)', totalPuts <= 60, `totalPuts=${totalPuts}`);
  }

  // [round 6, finding 4] probeD1 failing must NOT let sweep record ok=true.
  {
    const db = makeD1();
    const originalPrepare = db.prepare.bind(db);
    db.prepare = sql => {
      if (sql === 'SELECT 1 AS ok') throw new Error('d1 down for probe');
      return originalPrepare(sql);
    };
    const env = { LEADS_KV: makeKV(), LEADS_DB: db };
    await sweepPending(env);
    const body = await (await worker.fetch(healthRequest(), { LEADS_DB: db })).json();
    console.log('\n[round 6, finding 4] probeD1 failing must not record sweep as ok — this also exercises the try/finally (last_run_at still advances on the early-return path)');
    check('sweep.last_ok_at stays null (probe failure correctly recorded as NOT ok)',
      body.sweep.last_ok_at === null, JSON.stringify(body.sweep));
    check('sweep.last_run_at still advances (recordCronHealth runs via finally even on the early return)',
      !!body.sweep.last_run_at, JSON.stringify(body.sweep));
  }

  // [round 6, finding 4] probeD1 must not throw on a KV exception — it must
  // resolve to a failed probe instead of crashing the whole sweep.
  {
    const kv = makeKV();
    kv.get = async () => { throw new Error('kv down'); };
    const env = { LEADS_KV: kv, LEADS_DB: makeD1() };
    let threw = false;
    let result;
    try { result = await probeD1(env); } catch (e) { threw = true; }
    console.log('\n[round 6, finding 4] probeD1 must not throw on a KV exception');
    check('probeD1 resolves to false instead of throwing', !threw && result === false, `threw=${threw} result=${result}`);
  }

  // [round 6, finding 4] a missing cron_health table (migration not yet
  // applied) must report 200 with null backup/sweep fields — never mask a
  // perfectly healthy `leads` table behind a 503.
  {
    const db = makeD1();
    const originalPrepare = db.prepare.bind(db);
    db.prepare = sql => {
      if (/cron_health/.test(sql)) throw new Error('no such table: cron_health');
      return originalPrepare(sql);
    };
    const res = await worker.fetch(healthRequest(), { LEADS_DB: db });
    const body = await res.json();
    console.log('\n[round 6, finding 4] missing cron_health table → 200 with null backup/sweep fields, not 503');
    check('200, not 503 (the leads table itself is fine)', res.status === 200, String(res.status));
    check('backup fields are all null (degraded, not outage)',
      body.backup.last_ok_at === null && body.backup.last_run_at === null && body.backup.integrity_ok === null,
      JSON.stringify(body.backup));
    check('sweep fields are all null (degraded, not outage)',
      body.sweep.last_ok_at === null && body.sweep.last_run_at === null, JSON.stringify(body.sweep));
    check('stuck_leads still computed normally (leads table unaffected)', body.stuck_leads === 0, JSON.stringify(body));
  }

  // [round 6, finding 5] deploy transition: scheduled() must ALSO accept
  // the retiring literals "30 2 * * *" and "0 18 * * *" — production is
  // currently on 6034203 with only "30 2 * * *" live, and this repo's new
  // code must not silently skip the dump if that trigger fires before the
  // Cloudflare-side config catches up to the new ["*/5 * * * *", "0 * * * *"].
  {
    const r2 = makeR2();
    const db = makeD1();
    await runScheduled('30 2 * * *', { LEADS_DB: db, LEADS_ARCHIVE: r2 }, utcHourTimestamp(2));
    console.log('\n[round 6, finding 5] the retiring "30 2 * * *" trigger must still route into hourlyRun (dump + verify), not the unknown-cron fallback');
    check('retiring "30 2 * * *" still writes a dump', r2._has(`backups/d1/${dayOffset(0)}/manifest.json`));

    const r2b = makeR2();
    const kv = makeKV();
    const orphanId = 'round6-f5-orphan';
    await kv.put(`lead:${orphanId}`, JSON.stringify(kvRecord(orphanId, isoOffset(-1), 'delivered')),
      { metadata: { status: 'delivered', received_at: isoOffset(-1) } });
    const dbB = makeD1();
    await runScheduled('0 18 * * *', {
      LEADS_KV: kv, LEADS_DB: dbB, LEADS_ARCHIVE: r2b, SHEET_COUNT_URL: 'https://sheet.local/count',
    }, utcHourTimestamp(18));
    console.log('[round 6, finding 5] the retiring "0 18 * * *" trigger must still route into hourlyRun (dump + reconcile)');
    check('retiring "0 18 * * *" still writes a dump', r2b._has(`backups/d1/${dayOffset(0)}/manifest.json`));
    check('retiring "0 18 * * *" still runs reconcile (repairs KV lead missing from D1)', !!dbB._get(orphanId));
  }

  // [round 6, small item] the day key for backup paths must come from the
  // SAME clock as the hour gating, not each function's own independent
  // "now" — verified by passing an explicit `now` far from the real date
  // and confirming the R2 path lands on THAT day, not today's.
  {
    const explicitNow = new Date('2026-01-15T10:00:00.000Z');
    const db = makeD1();
    const r2 = makeR2();
    await dumpD1ToR2({ LEADS_DB: db, LEADS_ARCHIVE: r2 }, explicitNow);
    console.log('\n[round 6, small item] dumpD1ToR2 uses the threaded `now`, not its own independent clock, for the day key');
    check('dump lands under the explicitly-passed day (2026-01-15), not the real today',
      r2._has('backups/d1/2026-01-15/manifest.json'), r2._putOrder().join(','));
  }

  /* ============ Round 7 (base 0aaf9e1) — P1: the KV write budget could
     still be exceeded while Albato is failing FAST. See
     docs/LEAD-PIPELINE.md "Review 2026-09-23 — round 7". */

  // [round 7, P1] With a KV fake that ENFORCES Cloudflare's real 1-write/
  // sec/key limit, 4 persistently-failing (fast 502, no delay) pending
  // leads over 288 simulated sweeps must accept AT MOST 240 total KV.put
  // calls (60/lead budget x 4) — not the ~1150+/day the coordinator's
  // repro found once the round-6 claim-write and the release-write landed
  // in the SAME second and the second was silently rejected (round 6's
  // OWN mock never enforced the limit, so it could not catch this). D1's
  // attempt_count must also genuinely advance for every lead, proving the
  // backoff schedule is followed rather than stuck at 1.
  {
    const leadIds = Array.from({ length: 4 }, (_, i) => `round7-p1-lead-${i}`);
    const receivedAt = isoOffset(-1);
    const kv = makeRateLimitedKV();
    for (const id of leadIds) {
      await kv.put(`lead:${id}`, JSON.stringify(kvRecord(id, receivedAt, 'pending')),
        { metadata: { status: 'pending', received_at: receivedAt } });
    }
    const db = makeD1(leadIds.map(id => seedRow(id, receivedAt, 'pending')));
    const env = { LEADS_KV: kv, LEADS_DB: db, ALBATO_WEBHOOK_URL: 'https://albato.local/hook-fast502' };

    const realFetch = global.fetch;
    global.fetch = async url => {
      const target = String(url);
      if (target.startsWith('https://albato.local/')) return new Response('bad gateway', { status: 502 }); // fast failure, no delay
      throw new Error(`unexpected fetch in round-7 P1 test: ${target}`);
    };

    let acceptedPuts = 0;
    let rejectedPuts = 0;
    const rateLimitedPut = kv.put.bind(kv);
    kv.put = async (...args) => {
      try {
        const result = await rateLimitedPut(...args);
        acceptedPuts++;
        return result;
      } catch (e) {
        rejectedPuts++;
        throw e;
      }
    };

    const RealDate = global.Date;
    let simulatedNow = RealDate.now();
    function FakeDate(...args) {
      if (args.length === 0) return new RealDate(simulatedNow);
      return new RealDate(...args);
    }
    FakeDate.now = () => simulatedNow;
    FakeDate.prototype = RealDate.prototype;
    global.Date = FakeDate;
    try {
      for (let i = 0; i < 288; i++) {
        await sweepPending(env);
        simulatedNow += 5 * 60 * 1000;
      }
    } finally {
      global.Date = RealDate;
      global.fetch = realFetch;
    }

    console.log('\n[round 7, P1] KV write-rate-limit collision: 4 fast-failing leads over 288 sweeps must stay within the KV write budget');
    check('total ACCEPTED KV.put <= 240 across all 4 leads (60/lead budget)',
      acceptedPuts <= 240, `acceptedPuts=${acceptedPuts} rejectedPuts=${rejectedPuts}`);
    check('D1 attempt_count genuinely advances past 1 for every lead (backoff schedule followed, not stuck)',
      leadIds.every(id => (db._get(id)?.attempt_count || 0) > 1),
      JSON.stringify(leadIds.map(id => ({ id, attempt_count: db._get(id)?.attempt_count }))));
  }

  // [branded Albato email, owner request] the cron-worker retry path
  // (sweepPending -> forwardToAlbato, for a lead that was pending because
  // Albato was down at intake time) must ALSO carry email_subject/
  // email_html on its retry POST — same shared renderer, same RAW fields,
  // proving the branding isn't intake-only.
  {
    alerts = []; albatoHits = 0; lastAlbatoBody = null;
    const id = 'branded-email-retry';
    const receivedAt = isoOffset(-1);
    const kv = makeKV();
    await kv.put(`lead:${id}`, JSON.stringify(kvRecord(id, receivedAt, 'pending')),
      { metadata: { status: 'pending', received_at: receivedAt } });
    const db = makeD1([seedRow(id, receivedAt, 'pending')]);
    const env = withAlerts({ LEADS_KV: kv, LEADS_DB: db, ALBATO_WEBHOOK_URL: 'https://albato.local/hook' });
    await sweepPending(env);
    console.log('\n[branded Albato email, owner request] cron retry (sweepPending) POST also carries email_subject/email_html');
    check('cron retry reached Albato', albatoHits > 0, `hits=${albatoHits}`);
    check('cron retry payload has email_subject', typeof lastAlbatoBody?.email_subject === 'string' && lastAlbatoBody.email_subject.length > 0,
      JSON.stringify(lastAlbatoBody?.email_subject));
    check('cron retry payload has email_html', typeof lastAlbatoBody?.email_html === 'string' && lastAlbatoBody.email_html.length > 0);
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
