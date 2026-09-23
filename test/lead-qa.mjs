/* Lead-pipeline QA harness — adapted from the ADFIX "never lose a lead"
   reference (clients/luxemed/New Lending/test/lead-qa.mjs, digitalhook-os-,
   feature/luxemed-new-lending@613cdd30; contract:
   knowledge/web-dev/ADFIX-SITE-SYSTEM-PLAYBOOK.md §1.6-1.8) for Gambaryan's
   own contract:
     • JSON body (not multipart FormData) — matches site/lead-contract.js
     • honeypot field is `lf_hp`, not `website`
     • submission_id MUST be a valid UUID v4 (LEAD_CONTRACT.isValidSubmissionId)
       or the server silently replaces it with a fresh one — every fixture
       below uses a real crypto.randomUUID(), not a short label like the
       reference's "id-up"
     • success envelope is always 202 {ok:true, status:"accepted", submission_id[, dedup]}
       to preserve the existing Gambaryan client/public contract (app.js only
       reads response.submission_id)
   Exercises the REAL functions/api/lead.js + functions/api/admin.js against
   mock bindings: D1 on node:sqlite (real SQL + real schema from
   db/leads-schema.sql), KV=Map, R2=Map, controllable global.fetch for
   Albato/Telegram. Deterministic, no network, no wrangler.
   Run:  node --experimental-sqlite test/lead-qa.mjs */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import {
  onRequest as leadRequest, sweepPendingLeads, claimLeadD1Lease,
  markLeadDelivered, releaseLeadToPending,
} from '../functions/api/lead.js';
import { onRequestGet as adminGet, onRequestPost as adminPost } from '../functions/api/admin.js';

function basicAuthHeader(user, pass) {
  return { Authorization: 'Basic ' + Buffer.from(user + ':' + pass).toString('base64') };
}

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  cond ? (pass++, console.log('  PASS  ' + name))
    : (fail++, console.log('  FAIL  ' + name + (extra ? '  → ' + extra : '')));
};

const BASE_URL = 'https://gambarian-landing.pages.dev/api/lead';
const ADMIN_URL = 'https://gambarian-landing.pages.dev/api/admin';
const ORIGIN = 'https://gambarian-landing.pages.dev';

/* ---- mock D1 backed by real node:sqlite (numbered ?N → anonymous ?, args in order) ---- */
function makeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../db/leads-schema.sql', import.meta.url), 'utf8'));
  return {
    prepare(sql) {
      const stmt = db.prepare(sql.replace(/\?\d+/g, '?'));
      let bound = [];
      return {
        bind(...a) { bound = a.map(v => v === undefined ? null : v); return this; },
        run() { const r = stmt.run(...bound); return { success: true, meta: { changes: Number(r.changes) } }; },
        all() { return { results: stmt.all(...bound) }; },
      };
    },
    _count() { return db.prepare('SELECT COUNT(*) n FROM leads').get().n; },
    _get(id) { return db.prepare('SELECT * FROM leads WHERE submission_id=?').get(id); },
    _insert(row) {
      const cols = ['submission_id', 'received_at', 'status', 'delivered_at', 'name', 'phone', 'email',
        'corrects_submission_id', 'form_id', 'landing_path', 'referrer_host', 'utm_source', 'utm_medium',
        'utm_campaign', 'utm_id', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid', 'fbclid', 'payload_json'];
      const placeholders = cols.map((_, i) => '?' + (i + 1)).join(',');
      db.prepare(`INSERT INTO leads (${cols.join(',')}) VALUES (${placeholders})`)
        .run(...cols.map(c => row[c] === undefined ? null : row[c]));
    },
  };
}
/* ---- mock KV ---- */
function makeKV() {
  const m = new Map();
  return {
    async put(k, v, opts = {}) { m.set(k, { v, metadata: opts.metadata || {} }); },
    async get(k) { return m.has(k) ? m.get(k).v : null; },
    async delete(k) { m.delete(k); },
    async list({ prefix = '', limit = 1000 } = {}) {
      const keys = [...m.entries()].filter(([k]) => k.startsWith(prefix)).slice(0, limit)
        .map(([name, o]) => ({ name, metadata: o.metadata }));
      return { keys };
    },
    _size() { return m.size; },
    _has(k) { return m.has(k); },
  };
}
/* ---- mock R2 ---- */
function makeR2() {
  const m = new Map();
  return { async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); }, _keys() { return [...m.keys()]; }, _get(k) { return m.get(k); } };
}

/* ---- controllable fetch (Albato up/down; Telegram swallowed) ---- */
let albatoUp = true; let albatoHits = 0; let telegramHits = 0; let albatoDelayMs = 0; let lastAlbatoBody = null;
global.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.includes('api.telegram.org')) { telegramHits++; return new Response('{}', { status: 200 }); }
  albatoHits++;
  try { lastAlbatoBody = JSON.parse(String(init.body || '{}')); } catch (e) { lastAlbatoBody = null; }
  if (albatoDelayMs) await new Promise(resolve => setTimeout(resolve, albatoDelayMs));
  return new Response(albatoUp ? 'OK' : 'ERR', { status: albatoUp ? 200 : 502 });
};

function postReq(fields) {
  return new Request(BASE_URL, {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
}
async function post(env, fields) {
  const background = [];
  const res = await leadRequest({ request: postReq(fields), env, waitUntil: p => background.push(p) });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch (e) { body = {}; }
  return { status: res.status, body, headers: res.headers, wait: () => Promise.allSettled(background) };
}

const baseLead = (id, extra = {}) => ({
  submission_id: id,
  name: 'Тестовый Лид',
  phone: '+972 50 000 0000',
  email: 't@x.com',
  landing_path: '/',
  referrer_host: 'google.com',
  utm_source: 'google', gclid: 'G1', gbraid: 'B1', wbraid: 'W1', fbclid: 'F1',
  ...extra,
});

(async () => {
  console.log('\n=== LEAD PIPELINE QA (real functions/api/lead.js + admin.js) ===\n');

  // T1 — Albato UP: delivered everywhere
  {
    const idUp = crypto.randomUUID();
    const env = { LEADS_KV: makeKV(), LEADS_DB: makeD1(), LEADS_ARCHIVE: makeR2(), ALBATO_WEBHOOK_URL: 'https://albato.example/wh', TELEGRAM_TOKEN: 't', TELEGRAM_CHAT_ID: 'c' };
    albatoUp = true;
    const r = await post(env, baseLead(idUp));
    console.log('T1 Albato UP → delivered to KV+D1+R2+Telegram');
    ok('202 accepted', r.status === 202 && r.body.ok === true && r.body.submission_id === idUp, JSON.stringify(r.body));
    ok('D1 has 1 row, status=delivered', env.LEADS_DB._count() === 1 && env.LEADS_DB._get(idUp).status === 'delivered');
    ok('D1 preserves Google/Meta click IDs', env.LEADS_DB._get(idUp).gclid === 'G1' && env.LEADS_DB._get(idUp).gbraid === 'B1' && env.LEADS_DB._get(idUp).wbraid === 'W1' && env.LEADS_DB._get(idUp).fbclid === 'F1');
    ok('KV has the lead', env.LEADS_KV._size() === 1);
    ok('R2 archived an .md file', env.LEADS_ARCHIVE._keys().some(k => k.endsWith(idUp + '.md')));
    ok('Telegram new-lead alert fired', telegramHits >= 1);
    // Sheet-safe only at the Albato sink: stored copies keep the raw value.
    const kvRec = JSON.parse(await env.LEADS_KV.get('lead:' + idUp));
    ok('D1 stores the raw phone (no sheet apostrophe)', env.LEADS_DB._get(idUp).phone === '+972 50 000 0000', env.LEADS_DB._get(idUp).phone);
    ok('KV stores the raw phone (no sheet apostrophe)', kvRec.fields.phone === '+972 50 000 0000', kvRec.fields.phone);
    ok('Albato body carries the sheet-safe phone', lastAlbatoBody && lastAlbatoBody.phone === "'+972 50 000 0000", JSON.stringify(lastAlbatoBody && lastAlbatoBody.phone));
  }

  // T2 — Albato DOWN: lead is NOT lost (KV+D1 pending, recoverable), client gets 202
  telegramHits = 0;
  {
    const idDown = crypto.randomUUID();
    const idDown2 = crypto.randomUUID();
    const env = { LEADS_KV: makeKV(), LEADS_DB: makeD1(), LEADS_ARCHIVE: makeR2(), ALBATO_WEBHOOK_URL: 'https://albato.example/wh' };
    albatoUp = false;
    const r = await post(env, baseLead(idDown));
    console.log('\nT2 Albato DOWN → lead durable (pending), recoverable, no loss');
    ok('202 accepted (not lost)', r.status === 202 && r.body.ok === true, JSON.stringify(r.body));
    ok('D1 row status=pending (recoverable)', env.LEADS_DB._get(idDown)?.status === 'pending');
    ok('KV retained the pending lead', env.LEADS_KV._size() === 1);
    // sweep (triggered by the NEXT request's waitUntil, excluding its own key) delivers the earlier pending lead
    albatoUp = true;
    const trigger = await post(env, baseLead(idDown2));
    await trigger.wait();
    ok('sweep delivered the earlier pending lead', env.LEADS_DB._get(idDown)?.status === 'delivered');
  }

  // T3 — Idempotency: same submission_id twice → 1 row, no dup, no 2nd Albato hit
  {
    const idDup = crypto.randomUUID();
    const env = { LEADS_KV: makeKV(), LEADS_DB: makeD1(), ALBATO_WEBHOOK_URL: 'https://albato.example/wh' };
    albatoUp = true;
    const before = albatoHits;
    await post(env, baseLead(idDup));
    const r2 = await post(env, baseLead(idDup));
    console.log('\nT3 Idempotency (dedup by submission_id)');
    ok('2nd POST acked as dedup, no 2nd Albato hit', r2.body.dedup === true && albatoHits - before === 1, JSON.stringify(r2.body));
    ok('D1 still 1 row (no duplicate)', env.LEADS_DB._count() === 1);
  }

  // T3b — concurrent requests with the same id share one forwarding lease (same-isolate guard).
  {
    const idConcurrent = crypto.randomUUID();
    const env = { LEADS_KV: makeKV(), LEADS_DB: makeD1(), ALBATO_WEBHOOK_URL: 'https://albato.example/wh' };
    albatoUp = true; albatoDelayMs = 60;
    const before = albatoHits;
    const [a, b] = await Promise.all([
      post(env, baseLead(idConcurrent)),
      post(env, baseLead(idConcurrent)),
    ]);
    albatoDelayMs = 0;
    console.log('\nT3b Concurrent same-isolate lease');
    ok('two concurrent POSTs cause exactly one Albato forward', albatoHits - before === 1,
      JSON.stringify({ a: a.body, b: b.body, hits: albatoHits - before }));
    ok('one concurrent response is a dedup follower while the lead ends up delivered',
      (a.body.dedup === true || b.body.dedup === true) && env.LEADS_DB._get(idConcurrent)?.status === 'delivered');
  }

  // T3c — strict server field validation (existing Gambaryan contract, unaffected by this change).
  {
    const env = { LEADS_KV: makeKV(), LEADS_DB: makeD1(), ALBATO_WEBHOOK_URL: 'https://albato.example/wh' };
    const r = await post(env, baseLead(crypto.randomUUID(), { phone: '12' }));
    console.log('\nT3c Invalid phone');
    ok('invalid phone → 422 and no lead row', r.status === 422 && r.body.error === 'invalid_lead' && env.LEADS_DB._count() === 0, JSON.stringify(r.body));
  }

  // T4 — No bindings + Albato down → graceful-degradation contract unchanged (502 delivery_failed)
  {
    const env = { ALBATO_WEBHOOK_URL: 'https://albato.example/wh' };
    albatoUp = false;
    const r = await post(env, baseLead(crypto.randomUUID()));
    console.log('\nT4 No bindings + Albato down → 502 delivery_failed (unchanged pre-pipeline contract)');
    ok('502 delivery_failed', r.status === 502 && r.body.error === 'delivery_failed', JSON.stringify(r.body));
  }

  // T4b — Durable pipeline bound, but KV write itself fails AND Albato down → 502 not_persisted
  {
    const kv = makeKV();
    kv.put = async () => { throw new Error('kv down'); };
    const env = { LEADS_KV: kv, ALBATO_WEBHOOK_URL: 'https://albato.example/wh' };
    albatoUp = false;
    const r = await post(env, baseLead(crypto.randomUUID()));
    console.log('\nT4b Durable pipeline: KV write fails AND Albato down → 502 not_persisted');
    ok('502 not_persisted (lead genuinely unpersisted — client must keep retrying)', r.status === 502 && r.body.error === 'not_persisted', JSON.stringify(r.body));
  }

  // T5 — Honeypot: bot fills `lf_hp` → 202 accepted, NOT persisted, aggregate counter only
  {
    const env = { LEADS_KV: makeKV(), LEADS_DB: makeD1(), ALBATO_WEBHOOK_URL: 'https://albato.example/wh' };
    albatoUp = true;
    const botId = crypto.randomUUID();
    const r = await post(env, { submission_id: botId, lf_hp: 'spam', name: 'bot' });
    console.log('\nT5 Honeypot bot → accepted, not persisted');
    ok('202 {ok, status:"accepted", submission_id} — exact public contract', r.status === 202
      && JSON.stringify(r.body) === JSON.stringify({ ok: true, status: 'accepted', submission_id: botId }), JSON.stringify(r.body));
    ok('D1 untouched (0 rows)', env.LEADS_DB._count() === 0);
    const hpKeys = await env.LEADS_KV.list({ prefix: 'hp:' });
    const leadKeys = await env.LEADS_KV.list({ prefix: 'lead:' });
    ok('honeypot stored only as aggregate counter, no lead payload', hpKeys.keys.length === 1 && leadKeys.keys.length === 0);
  }

  // T6 — /api/admin: Basic Auth ONLY (no CF Access — review 2026-09-23 finding 1)
  // + table + CSV/MD export + filter + delete
  {
    const idA1 = crypto.randomUUID();
    const idA2 = crypto.randomUUID();
    const env = { LEADS_KV: makeKV(), LEADS_DB: makeD1(), LEADS_ARCHIVE: makeR2(), ALBATO_WEBHOOK_URL: 'https://albato.example/wh', ADMIN_PASSWORD: 'correct-horse-battery' };
    albatoUp = true;
    await post(env, baseLead(idA1, { phone: '+972500000011' }));
    await post(env, baseLead(idA2, { phone: '+972500000022' }));
    const auth = basicAuthHeader('admin', 'correct-horse-battery');
    const adminReq = (qs = '', authHeader = auth) => new Request(ADMIN_URL + qs, { headers: authHeader || {} });
    const deleteForm = (id) => { const fd = new FormData(); fd.append('action', 'delete'); fd.append('submission_id', id); return fd; };
    const adminDeleteReq = (id, authHeader = auth) => new Request(ADMIN_URL + '?q=%2B972500000022', { method: 'POST', headers: authHeader || {}, body: deleteForm(id) });
    console.log('\nT6 /api/admin — Basic Auth only + table + export');
    const noauth = await adminGet({ request: adminReq('', null), env });
    ok('no Authorization header → 401 (PII safe)', noauth.status === 401);
    const wrongPass = await adminGet({ request: adminReq('', basicAuthHeader('admin', 'wrong-password')), env });
    ok('wrong password → 401', wrongPass.status === 401);
    const tbl = await adminGet({ request: adminReq(), env }); const tblHtml = await tbl.text();
    ok('authed via Basic → 200 HTML table with leads', tbl.status === 200 && tblHtml.includes(idA1) && tblHtml.includes('+972500000011'));
    const csv = await adminGet({ request: adminReq('?format=csv'), env }); const csvTxt = await csv.text();
    ok('CSV export has header + 2 rows', csv.headers.get('content-type').includes('text/csv') && csvTxt.includes('submission_id') && csvTxt.includes(idA1) && csvTxt.includes(idA2));
    ok('CSV export has Google/Meta click IDs', csvTxt.includes('gclid') && csvTxt.includes('gbraid') && csvTxt.includes('wbraid') && csvTxt.includes('fbclid') && csvTxt.includes('G1') && csvTxt.includes('B1') && csvTxt.includes('W1'));
    const md = await adminGet({ request: adminReq('?format=md'), env }); const mdTxt = await md.text();
    ok('MD export has both leads', md.headers.get('content-type').includes('markdown') && mdTxt.includes(idA1) && mdTxt.includes(idA2));
    const filt = await adminGet({ request: adminReq('?q=+972500000022'), env }); const filtTxt = await filt.text();
    ok('search filter narrows to 1', filtTxt.includes(idA2) && !filtTxt.includes(idA1));
    const delNoauth = await adminPost({ request: adminDeleteReq(idA1, null), env });
    ok('delete without auth → 401 (PII safe)', delNoauth.status === 401);
    const del = await adminPost({ request: adminDeleteReq(idA1), env });
    ok('delete redirects back to filtered admin', del.status === 303 && del.headers.get('location').includes('deleted=' + idA1) && del.headers.get('location').includes('q=%2B972500000022'));
    ok('delete soft-deletes D1 row (status=deleted, kept as tombstone) only for selected lead',
      env.LEADS_DB._get(idA1)?.status === 'deleted' && env.LEADS_DB._get(idA2)?.status !== 'deleted');
    ok('delete removed KV/R2 copies', !env.LEADS_KV._has('lead:' + idA1) && env.LEADS_KV._has('lead:' + idA2) && !env.LEADS_ARCHIVE._keys().some(k => k.endsWith(idA1 + '.md')));
  }

  // T7 — /api/admin inert without D1 (friendly, no crash), still requires Basic Auth
  {
    const env = { ADMIN_PASSWORD: 'pw' };
    const res = await adminGet({ request: new Request(ADMIN_URL, { headers: basicAuthHeader('admin', 'pw') }), env });
    const t = await res.text();
    console.log('\nT7 /api/admin inert without D1 → friendly page (no crash)');
    ok('200 + "не настроено" message', res.status === 200 && t.includes('LEADS_DB'));
  }

  /* ============ Review 2026-09-23 (independent Codex review of bd8dc8e) —
     8 reproduced defects, one test per finding below. See
     docs/LEAD-PIPELINE.md "Review 2026-09-23" table for finding → fix → test. */

  // T8 [finding 1, P1] — a spoofed Cf-Access-Authenticated-User-Email header
  // must NEVER grant admin access; Basic Auth is the only supported method.
  {
    const env = { LEADS_KV: makeKV(), LEADS_DB: makeD1(), ALBATO_WEBHOOK_URL: 'https://albato.example/wh', ADMIN_PASSWORD: 'correct-horse-battery' };
    const spoofed = new Request(ADMIN_URL, { headers: { 'Cf-Access-Authenticated-User-Email': 'attacker@evil.com' } });
    const res = await adminGet({ request: spoofed, env });
    console.log('\nT8 [finding 1] Spoofed Cf-Access header must not grant admin access');
    ok('spoofed header alone → 401 (Basic Auth required, CF Access path removed)', res.status === 401, 'status=' + res.status);
  }

  // T9 [finding 2, P1] — a concurrent follower must reflect the leader's REAL
  // outcome, not blindly claim 202 while the actual persist+deliver failed.
  {
    const kv = makeKV();
    kv.put = async () => { throw new Error('kv down'); };
    const env = { LEADS_KV: kv, ALBATO_WEBHOOK_URL: 'https://albato.example/wh' }; // no D1 either
    albatoUp = false;
    const id = crypto.randomUUID();
    const [leader, follower] = await Promise.all([
      post(env, baseLead(id)),
      post(env, baseLead(id)),
    ]);
    console.log('\nT9 [finding 2] Concurrent follower must reflect the leader real outcome');
    ok('leader correctly reports 502 not_persisted (KV broken, no D1, Albato down)',
      leader.status === 502 && leader.body.error === 'not_persisted', JSON.stringify(leader.body));
    ok('follower echoes the SAME outcome instead of a false 202 (no silent client-side accept)',
      follower.status === leader.status && follower.body.error === leader.body.error,
      JSON.stringify({ leader: leader.body, follower: follower.body }));
  }

  // T10 [finding 3, P1] — a lead persisted ONLY in D1 (every KV write failed)
  // must still be retried by the KV-list-based sweep, not stranded forever.
  {
    const failingKv = makeKV();
    const realPut = failingKv.put.bind(failingKv);
    failingKv.put = async () => { throw new Error('kv put down'); };
    const db = makeD1();
    const env = { LEADS_KV: failingKv, LEADS_DB: db, ALBATO_WEBHOOK_URL: 'https://albato.example/wh' };
    albatoUp = false;
    const id = crypto.randomUUID();
    const first = await post(env, baseLead(id));
    console.log('\nT10 [finding 3] D1-only pending lead (KV write failed) must be retried by sweep');
    ok('initial attempt persisted only in D1 — still 202 accepted, D1 status=pending',
      first.status === 202 && db._get(id)?.status === 'pending', JSON.stringify({ body: first.body, row: db._get(id) }));
    ok('nothing was written to KV at all for this lead (proves the gap sweep must cover)',
      failingKv._size() === 0);
    failingKv.put = realPut; // KV recovers
    albatoUp = true;
    await sweepPendingLeads(env, '');
    ok('sweep retries the D1-only pending row (rebuilt from payload_json) and delivers it',
      db._get(id)?.status === 'delivered', JSON.stringify(db._get(id)));
  }

  // T11 [finding 5, P1] — admin delete: a partial failure must not report
  // success, and a lead must never be resurrected by sweep after being
  // deleted (tombstone blocks re-insertion even if a stale KV copy lingers).
  {
    const kv = makeKV();
    const db = makeD1();
    const r2 = makeR2();
    const env = { LEADS_KV: kv, LEADS_DB: db, LEADS_ARCHIVE: r2, ALBATO_WEBHOOK_URL: 'https://albato.example/wh', ADMIN_PASSWORD: 'secret' };
    // Lead stays PENDING in both KV and D1 (Albato down at intake) — this is
    // the shape sweepPendingLeads actually scans for (a 'delivered' ghost is
    // filtered out by sweep regardless of any tombstone, so it would not
    // exercise this finding at all).
    albatoUp = false;
    const partialId = crypto.randomUUID();
    await post(env, baseLead(partialId));
    ok('lead is pending in both KV and D1 before delete',
      db._get(partialId)?.status === 'pending' && kv._has('lead:' + partialId));
    const realDelete = kv.delete.bind(kv);
    kv.delete = async () => { throw new Error('kv delete down'); };
    const deleteForm = (id) => { const fd = new FormData(); fd.append('action', 'delete'); fd.append('submission_id', id); return fd; };
    const auth = basicAuthHeader('admin', 'secret');
    const del = await adminPost({ request: new Request(ADMIN_URL, { method: 'POST', headers: auth, body: deleteForm(partialId) }), env });
    console.log('\nT11 [finding 5] Partial delete of a pending lead must not report success and must not resurrect');
    ok('partial delete (KV delete fails) does not redirect with deleted=<id>',
      !(del.headers.get('location') || '').includes('deleted=' + partialId), del.headers.get('location'));
    ok('D1 row is soft-deleted (status=deleted) after the delete attempt (the D1 write itself succeeded)',
      db._get(partialId)?.status === 'deleted');
    kv.delete = realDelete; // "network recovers" — the stale pending KV copy is the ghost lead
    albatoUp = true; // Albato also recovers — a naive sweep would happily redeliver the ghost
    await sweepPendingLeads(env, '');
    ok('tombstone/D1-authoritative status blocks sweep from resurrecting the deleted lead and re-delivering it',
      db._get(partialId)?.status === 'deleted', JSON.stringify(db._get(partialId)));

    const fullId = crypto.randomUUID();
    await post(env, baseLead(fullId));
    const del2 = await adminPost({ request: new Request(ADMIN_URL, { method: 'POST', headers: auth, body: deleteForm(fullId) }), env });
    ok('full delete (all copies succeed) reports deleted=<id>',
      (del2.headers.get('location') || '').includes('deleted=' + fullId), del2.headers.get('location'));
  }

  // T12 [finding 7, P2] — CSV export must neutralise formula-injection payloads.
  {
    const env = { LEADS_KV: makeKV(), LEADS_DB: makeD1(), ALBATO_WEBHOOK_URL: 'https://albato.example/wh', ADMIN_PASSWORD: 'secret' };
    albatoUp = true;
    const id = crypto.randomUUID();
    await post(env, baseLead(id, { name: '=1+1' }));
    const auth = basicAuthHeader('admin', 'secret');
    const csv = await adminGet({ request: new Request(ADMIN_URL + '?format=csv', { headers: auth }), env });
    const csvTxt = await csv.text();
    console.log('\nT12 [finding 7] CSV export neutralises formula-injection payloads');
    ok('a name starting with "=" is prefixed with a single quote in the CSV cell',
      csvTxt.includes("'=1+1"), csvTxt);
    ok('the raw unescaped formula (bare =1+1, unprefixed) is not present',
      !/[,\n]=1\+1/.test(csvTxt), csvTxt);
  }

  /* ============ Round 2 re-review (base 39750ac) — findings A-G. See
     docs/LEAD-PIPELINE.md "Review 2026-09-23 — round 2" table. */

  // T13 [finding A, P1 regression] The D1-sourced sweep must not re-deliver
  // a lead KV already shows as delivered — only happens if the FINAL D1
  // write after a successful Albato POST failed, leaving D1 stuck on a
  // (now-expired) 'forwarding' row while KV correctly shows 'delivered'.
  {
    albatoHits = 0;
    const kv = makeKV();
    const db = makeD1();
    const env = { LEADS_KV: kv, LEADS_DB: db, ALBATO_WEBHOOK_URL: 'https://albato.example/wh' };
    const id = crypto.randomUUID();
    const deliveredAt = new Date().toISOString();
    const oldReceivedAt = new Date(Date.now() - 20000).toISOString();
    const fields = { submission_id: id, name: 'Тест', phone: '+972500000099', email: 't@x.com', form_id: 'family_law_contact' };
    await kv.put('lead:' + id, JSON.stringify({
      submission_id: id, fields, status: 'delivered',
      received_at: oldReceivedAt, delivered_at: deliveredAt, albato_delivered_at: deliveredAt,
    }), { metadata: { status: 'delivered', received_at: oldReceivedAt, albato_delivered_at: deliveredAt } });
    // D1's OWN final "mark delivered" write failed — row stuck 'forwarding' with an EXPIRED lease.
    const staleLeaseStart = new Date(Date.now() - 20000).toISOString();
    db._insert({
      submission_id: id, received_at: oldReceivedAt, status: 'forwarding', delivered_at: staleLeaseStart,
      name: 'Тест', phone: '+972500000099', email: 't@x.com', payload_json: JSON.stringify(fields),
    });
    const before = albatoHits;
    await sweepPendingLeads(env, '');
    console.log('\nT13 [finding A] D1 retry does not re-deliver an already-delivered (per KV) lead');
    ok('no extra Albato POST for an already-delivered lead', albatoHits === before, 'hits=' + (albatoHits - before));
    ok('D1 row repaired to delivered without a new POST', db._get(id)?.status === 'delivered');
  }

  // T14 [finding B, P1] Tombstone bypass: after a successful delete, the
  // D1 status='deleted' row must be the AUTHORITATIVE, atomically-protected
  // marker — a resubmission of the same id via the normal intake path must
  // not recreate a live D1 row or forward to Albato.
  {
    albatoHits = 0;
    const kv = makeKV();
    const db = makeD1();
    const env = { LEADS_KV: kv, LEADS_DB: db, ALBATO_WEBHOOK_URL: 'https://albato.example/wh', ADMIN_PASSWORD: 'secret' };
    albatoUp = true;
    const id = crypto.randomUUID();
    await post(env, baseLead(id));
    const deleteForm = (subId) => { const fd = new FormData(); fd.append('action', 'delete'); fd.append('submission_id', subId); return fd; };
    const auth = basicAuthHeader('admin', 'secret');
    await adminPost({ request: new Request(ADMIN_URL, { method: 'POST', headers: auth, body: deleteForm(id) }), env });
    console.log('\nT14 [finding B] Resubmission of a deleted id must not resurrect or re-forward');
    ok('D1 row is authoritatively deleted (status=deleted, row kept)', db._get(id)?.status === 'deleted');
    const before = albatoHits;
    const resubmit = await post(env, baseLead(id));
    ok('resubmission is accepted but harmless (no error surfaced to client)', resubmit.status === 202);
    ok('resubmission does not flip D1 back to a live status', db._get(id)?.status === 'deleted');
    ok('resubmission does not forward to Albato', albatoHits === before, 'hits=' + (albatoHits - before));
  }

  // T14b [finding 1, round 3, P1 — SUPERSEDED by round 4, finding A below]
  // A deletion-status read error on BOTH signals (D1 status lookup AND KV
  // tombstone lookup) is "we cannot tell", NOT "confirmed deleted". Round
  // 2's boolean isLeadDeleted collapsed the two into the SAME `true`
  // result, and the intake path treated that as "silently accept and do
  // nothing" — a genuine, silent, total loss. Round 3 fixed this by falling
  // through to normal intake on "unknown" — but round 4's re-review (finding
  // A) found THAT fix could resurrect a genuinely-deleted lead when the
  // outage hid its tombstone (see T19 below). The contract is now: "unknown"
  // → refuse with a retryable 503 BEFORE any write, never persist AND never
  // silently drop. This test now asserts the round-4 contract for a
  // brand-new (never actually deleted) id: no loss AND no resurrection risk
  // — a 503 the client's outbox will retry, with zero premature writes.
  {
    albatoHits = 0;
    const kv = makeKV();
    kv.get = async () => { throw new Error('kv get down'); }; // breaks BOTH the dedup readLeadRecord() call and the tombstone check
    const db = makeD1();
    const originalPrepare = db.prepare.bind(db);
    db.prepare = (sql) => {
      if (/SELECT status FROM leads WHERE submission_id/.test(sql)) throw new Error('d1 select down');
      return originalPrepare(sql);
    };
    const env = { LEADS_KV: kv, LEADS_DB: db, ALBATO_WEBHOOK_URL: 'https://albato.example/wh' };
    const id = crypto.randomUUID();
    albatoUp = true;
    const before = albatoHits;
    const r = await post(env, baseLead(id));
    console.log('\nT14b [finding 1, round 3 / finding A, round 4] Both deletion-status signals unreadable → retryable 503, no premature write');
    ok('response is a retryable 503, not a silent 202 dedup and not a premature persist',
      r.status === 503, JSON.stringify(r.body));
    ok('nothing was written to KV for this never-before-seen id (client outbox will retry)',
      !kv._has('lead:' + id));
    ok('no Albato POST fired before the deletion status could be confirmed',
      albatoHits === before, 'hits=' + (albatoHits - before));
  }

  // T15 [finding C, P1 pre-existing] Two isolates racing to claim the SAME
  // lease within the same millisecond must not BOTH get "claimed". This
  // cannot be reproduced through the public POST path in a single process:
  // the same-isolate activeLeadForwards guard (finding 2) turns the second
  // concurrent request into a follower that just awaits the first, never
  // reaching a second independent claimLeadD1Lease call. Calling
  // claimLeadD1Lease directly with an IDENTICAL startedAt deterministically
  // simulates what two real isolates computing `new Date().toISOString()`
  // in the same millisecond would do — no timing flakiness.
  {
    const db = makeD1();
    const id = crypto.randomUUID();
    const receivedAt = new Date(Date.now() - 1000).toISOString();
    db._insert({ submission_id: id, received_at: receivedAt, status: 'pending', delivered_at: null,
      name: 'Race', phone: '+972500000077', email: 'race@x.com', payload_json: '{}' });
    const env = { LEADS_DB: db };
    const collidedStartedAt = new Date().toISOString();
    const claimA = await claimLeadD1Lease(env, id, collidedStartedAt);
    const claimB = await claimLeadD1Lease(env, id, collidedStartedAt); // identical timestamp — the collision
    console.log('\nT15 [finding C] Concurrent claim race does not double-claim on a timestamp collision');
    ok('exactly one of the two identical-timestamp claims wins', (claimA === 'claimed') !== (claimB === 'claimed'),
      JSON.stringify({ claimA, claimB }));
    ok('the loser is told "pending", not falsely "claimed"', claimA === 'pending' || claimB === 'pending',
      JSON.stringify({ claimA, claimB }));
  }

  // T16 [finding E, P2] CSV export: an inner \r (without \n) must still be
  // quoted, and a formula-injection prefix must be neutralised on every
  // line inside a multi-line cell, not just the very start of the value.
  {
    const env = { LEADS_KV: makeKV(), LEADS_DB: makeD1(), ALBATO_WEBHOOK_URL: 'https://albato.example/wh', ADMIN_PASSWORD: 'secret' };
    albatoUp = true;
    const id = crypto.randomUUID();
    await post(env, baseLead(id, { name: 'Review\r=1+1' }));
    const auth = basicAuthHeader('admin', 'secret');
    const csv = await adminGet({ request: new Request(ADMIN_URL + '?format=csv', { headers: auth }), env });
    const csvTxt = await csv.text();
    console.log('\nT16 [finding E] CSV neutralises a formula prefix after an embedded \\r');
    ok('the cell is quoted (contains a line-break character)', new RegExp('"Review[\\s\\S]*\'=1\\+1"').test(csvTxt), csvTxt);
    ok('the second line inside the cell is prefixed, not a bare formula', csvTxt.includes("'=1+1"), csvTxt);
    ok('no unescaped bare "=1+1" line start survives (would let a lenient CSV parser start a new row)',
      !/[\r\n],?=1\+1/.test(csvTxt.replace(/'=1\+1/g, '')), csvTxt);
  }

  /* ============ Round 3 re-review (base ed4033f) — findings 1-4. See
     docs/LEAD-PIPELINE.md "Review 2026-09-23 — round 3" table. Finding 1 is
     T14b above (strengthened); findings 2 and 3 follow. */

  // T17 [finding 2, round 3, P1] A completion write for a lease this isolate
  // believes it still owns must NEVER overwrite a TERMINAL state a DIFFERENT
  // actor produced in the meantime (here: an admin delete while this isolate
  // was still "in flight"). Round 2's guard read
  // "status != 'forwarding' OR delivered_at=?guard" — inverted from its
  // intent, it ALLOWED the write whenever the row was in ANY non-forwarding
  // state, including a terminal one set by someone else.
  {
    const db = makeD1();
    const kv = makeKV();
    const id = crypto.randomUUID();
    const receivedAt = new Date().toISOString();
    const leaseStart = new Date().toISOString();
    db._insert({
      submission_id: id, received_at: receivedAt, status: 'forwarding', delivered_at: leaseStart,
      name: 'Race2', phone: '+972500000088', email: 'race2@x.com', payload_json: '{}',
    });
    const env = { LEADS_DB: db, LEADS_KV: kv };
    // This isolate's in-memory belief: it claimed the lease at leaseStart and
    // Albato just accepted the lead.
    const rec = {
      submission_id: id, fields: { name: 'Race2', phone: '+972500000088', email: 'race2@x.com' },
      status: 'forwarding', received_at: receivedAt, forwarding_started_at: leaseStart,
    };
    // A DIFFERENT actor (admin delete) changes the row to a terminal state
    // WHILE this isolate is still mid-flight believing it owns the lease.
    await db.prepare("UPDATE leads SET status='deleted', delivered_at=?1 WHERE submission_id=?2")
      .bind(new Date().toISOString(), id).run();
    const key = 'lead:' + id;
    const markResult = await markLeadDelivered(env, key, rec);
    console.log('\nT17 [finding 2, round 3] A stale completion write must not resurrect a row deleted by a different actor');
    ok('D1 row stays deleted (not flipped back to delivered by the stale completion write)',
      db._get(id)?.status === 'deleted', JSON.stringify(db._get(id)));
    ok('KV is NOT written with this isolate’s stale "delivered" belief (the write is gated on the CAS result)',
      !(await kv.get(key)), await kv.get(key));
    ok('markLeadDelivered reports failure once it discovers it lost ownership of the row',
      markResult === false, String(markResult));
  }

  // T17b [finding 2, round 3, P1] Same protection for releaseLeadToPending
  // (the Albato attempt failed): must not regress a row a NEWER isolate
  // already carried to 'delivered' after reclaiming an expired lease.
  {
    const db = makeD1();
    const kv = makeKV();
    const id = crypto.randomUUID();
    const receivedAt = new Date().toISOString();
    const leaseStart = new Date().toISOString();
    db._insert({
      submission_id: id, received_at: receivedAt, status: 'forwarding', delivered_at: leaseStart,
      name: 'Race3', phone: '+972500000089', email: 'race3@x.com', payload_json: '{}',
    });
    const forwardingRec = {
      submission_id: id, fields: { name: 'Race3' }, status: 'forwarding',
      received_at: receivedAt, forwarding_started_at: leaseStart,
    };
    const key = 'lead:' + id;
    await kv.put(key, JSON.stringify(forwardingRec));
    const env = { LEADS_DB: db, LEADS_KV: kv };
    const rec = {
      submission_id: id, fields: { name: 'Race3', phone: '+972500000089', email: 'race3@x.com' },
      status: 'forwarding', received_at: receivedAt, forwarding_started_at: leaseStart,
    };
    // A NEWER isolate reclaimed the (now expired, from this isolate's stale
    // point of view) lease and has ALREADY delivered it.
    await db.prepare("UPDATE leads SET status='delivered', delivered_at=?1 WHERE submission_id=?2")
      .bind(new Date().toISOString(), id).run();
    await releaseLeadToPending(env, key, rec);
    console.log('\nT17b [finding 2, round 3] Release-to-pending must not regress a row a newer isolate already delivered');
    ok('D1 row stays delivered (not regressed to pending by the stale release write)',
      db._get(id)?.status === 'delivered', JSON.stringify(db._get(id)));
    const kvAfter = JSON.parse(await kv.get(key));
    ok('KV is NOT regressed to pending either (the write is gated on the CAS result)',
      kvAfter.status === 'forwarding', JSON.stringify(kvAfter));
  }

  // T18 [finding 3, round 3, P2] Soft-delete must SCRUB PII from the D1 row,
  // not just flip status. Round 2's version left name/phone/email/
  // payload_json fully intact and readable in D1 forever despite the admin
  // UI reporting "Удалено".
  {
    const kv = makeKV();
    const db = makeD1();
    const r2 = makeR2();
    const env = { LEADS_KV: kv, LEADS_DB: db, LEADS_ARCHIVE: r2, ALBATO_WEBHOOK_URL: 'https://albato.example/wh', ADMIN_PASSWORD: 'secret' };
    albatoUp = true;
    const id = crypto.randomUUID();
    await post(env, baseLead(id, { name: 'ПерсональныеДанные', phone: '+972500000066', email: 'pii@x.com' }));
    const deleteForm = (subId) => { const fd = new FormData(); fd.append('action', 'delete'); fd.append('submission_id', subId); return fd; };
    const auth = basicAuthHeader('admin', 'secret');
    await adminPost({ request: new Request(ADMIN_URL, { method: 'POST', headers: auth, body: deleteForm(id) }), env });
    const row = db._get(id);
    console.log('\nT18 [finding 3, round 3] Soft-delete scrubs PII from the D1 tombstone row');
    ok('D1 row is soft-deleted', row?.status === 'deleted', JSON.stringify(row));
    ok('name/phone/email are scrubbed to NULL, not left intact for a "deleted" row',
      row && row.name == null && row.phone == null && row.email == null, JSON.stringify(row));
    ok('payload_json is reset to an empty object, not the original PII blob',
      row && row.payload_json === '{}', row && row.payload_json);
    ok('attribution columns are scrubbed too (utm_source, gclid)',
      row && row.utm_source == null && row.gclid == null, JSON.stringify(row));
    ok('submission_id/received_at/status/delivered_at are preserved (the minimal tombstone)',
      row && row.submission_id === id && !!row.received_at && row.status === 'deleted' && !!row.delivered_at);
  }

  /* ============ Round 4 re-review (base e7a719e) — findings A, B, C. See
     docs/LEAD-PIPELINE.md "Review 2026-09-23 — round 4" table. */

  // T19 [finding A, P1 regression] The exact resurrection scenario: the id
  // WAS genuinely deleted (D1 secretly still has status='deleted'), but the
  // deletion-status SELECT throws (real D1 outage) so intake cannot see it.
  // Round 3's fix fell through to normal intake here, which would write
  // fresh PII to KV and fire one Albato POST — resurrecting a dead lead.
  {
    albatoHits = 0;
    const kv = makeKV();
    kv.get = async () => { throw new Error('kv get down'); };
    const db = makeD1();
    const id = crypto.randomUUID();
    db._insert({
      submission_id: id, received_at: new Date().toISOString(), status: 'deleted',
      delivered_at: new Date().toISOString(), payload_json: '{}',
    });
    const originalPrepare = db.prepare.bind(db);
    db.prepare = (sql) => {
      if (/SELECT status FROM leads WHERE submission_id/.test(sql)) throw new Error('d1 select down');
      return originalPrepare(sql);
    };
    const env = { LEADS_KV: kv, LEADS_DB: db, ALBATO_WEBHOOK_URL: 'https://albato.example/wh' };
    albatoUp = true;
    const before = albatoHits;
    const r = await post(env, baseLead(id));
    console.log('\nT19 [finding A, round 4] Both deletion-status signals unreadable → refuse (503), never resurrect');
    ok('response is a retryable 503, not a false 202', r.status === 503, JSON.stringify(r.body));
    ok('D1 row stays deleted — untouched by the refused intake attempt',
      db._get(id)?.status === 'deleted', JSON.stringify(db._get(id)));
    ok('no lead: key was written to KV (no PII resurrected)', !kv._has('lead:' + id));
    ok('no Albato POST fired', albatoHits === before, 'hits=' + (albatoHits - before));
  }

  // T19b [finding A guardrail, round 4] "unknown" can only occur when a
  // binding EXISTS and its read failed (see checkLeadDeletionStatus's
  // `!d1Error || !kvError` logic) — with NO KV/D1 bindings at all (legacy
  // Albato-only mode, pipeline not yet activated), intake must behave
  // exactly as before this change: normal 202, delivered.
  {
    albatoHits = 0;
    const env = { ALBATO_WEBHOOK_URL: 'https://albato.example/wh' }; // no LEADS_KV, no LEADS_DB at all
    albatoUp = true;
    const id = crypto.randomUUID();
    const before = albatoHits;
    const r = await post(env, baseLead(id));
    console.log('\nT19b [finding A guardrail, round 4] No bindings at all → legacy mode unaffected by the 503 refusal');
    ok('202 accepted, delivered normally (unaffected by the round-4 fix)',
      r.status === 202 && r.body.ok === true, JSON.stringify(r.body));
    ok('Albato was actually reached (legacy Albato-only mode keeps working)', albatoHits - before === 1);
  }

  // T20 [finding B, P2] sweepPendingLeads' KV-loop must not send an
  // "undelivered" alert or rewrite the KV pending record (carrying PII)
  // when releaseLeadToPending discovers a different actor already changed
  // the row between this sweep's claim and its own release write.
  {
    telegramHits = 0;
    const kv = makeKV();
    const db = makeD1();
    const id = crypto.randomUUID();
    const oldReceivedAt = new Date(Date.now() - 20 * 60 * 1000).toISOString(); // old enough to trigger the undelivered alert if not gated
    const env = { LEADS_KV: kv, LEADS_DB: db, ALBATO_WEBHOOK_URL: 'https://albato.example/wh', TELEGRAM_TOKEN: 't', TELEGRAM_CHAT_ID: 'c' };
    albatoUp = false; // this sweep pass's own Albato attempt fails
    const fields = { name: 'FindingB', phone: '+972500000055', email: 'findingb@x.com' };
    await kv.put('lead:' + id, JSON.stringify({
      submission_id: id, fields, status: 'pending', received_at: oldReceivedAt,
    }), { metadata: { status: 'pending', received_at: oldReceivedAt } });
    db._insert({
      submission_id: id, received_at: oldReceivedAt, status: 'pending', delivered_at: null,
      name: fields.name, phone: fields.phone, email: fields.email, payload_json: JSON.stringify(fields),
    });
    const originalPrepare = db.prepare.bind(db);
    let sideEffectFired = false;
    db.prepare = (sql) => {
      if (!sideEffectFired && /AND status='forwarding' AND delivered_at=/.test(sql)) {
        sideEffectFired = true;
        // A DIFFERENT actor (e.g. admin delete) changes the row to a
        // terminal state right between this sweep's claim and its own
        // release-to-pending write.
        originalPrepare("UPDATE leads SET status='deleted', delivered_at=?1 WHERE submission_id=?2")
          .bind(new Date().toISOString(), id).run();
      }
      return originalPrepare(sql);
    };
    await sweepPendingLeads(env, '');
    console.log('\nT20 [finding B, round 4] sweep must not alert or rewrite KV when release loses ownership mid-flight');
    ok('D1 row stays deleted (the release write was correctly rejected)',
      db._get(id)?.status === 'deleted', JSON.stringify(db._get(id)));
    const kvAfter = JSON.parse(await kv.get('lead:' + id));
    ok('KV keeps the claim-time "forwarding" state — NOT rewritten to pending+alerted with stale PII',
      kvAfter.status === 'forwarding' && !kvAfter.alerted, JSON.stringify(kvAfter));
    ok('no Telegram alert was sent for a row we no longer own', telegramHits === 0, 'hits=' + telegramHits);
  }

  // T21 [finding B, P2] processDurableLead's direct-forward path must not
  // fire the "new lead" Telegram alert when markLeadDelivered discovers a
  // different actor already changed the row between this isolate's claim
  // and its own completion write (Albato itself DID accept the lead, so the
  // client still gets a normal 202 — only the internal alert is suppressed).
  {
    telegramHits = 0; albatoHits = 0;
    const kv = makeKV();
    const db = makeD1();
    const env = { LEADS_KV: kv, LEADS_DB: db, ALBATO_WEBHOOK_URL: 'https://albato.example/wh', TELEGRAM_TOKEN: 't', TELEGRAM_CHAT_ID: 'c' };
    albatoUp = true;
    const id = crypto.randomUUID();
    const originalPrepare = db.prepare.bind(db);
    let sideEffectFired = false;
    db.prepare = (sql) => {
      if (!sideEffectFired && /AND status='forwarding' AND delivered_at=/.test(sql)) {
        sideEffectFired = true;
        originalPrepare("UPDATE leads SET status='deleted', delivered_at=?1 WHERE submission_id=?2")
          .bind(new Date().toISOString(), id).run();
      }
      return originalPrepare(sql);
    };
    const r = await post(env, baseLead(id));
    console.log('\nT21 [finding B, round 4] intake must not alert when markLeadDelivered loses ownership mid-flight');
    ok('D1 row stays deleted (the delivered-completion write was correctly rejected)',
      db._get(id)?.status === 'deleted', JSON.stringify(db._get(id)));
    ok('no "new lead" Telegram alert fired for a row we no longer own', telegramHits === 0, 'hits=' + telegramHits);
    ok('client still gets a normal 202 (Albato itself DID accept the lead)', r.status === 202, JSON.stringify(r.body));
  }

  // T22 [finding C, P2] An error IN the CAS guard itself (D1 down at the
  // exact moment of the completion write) must be treated like not_owner —
  // never like the legacy "no D1 configured" fallback. Round 3's fix only
  // special-cased "not_owner"; a genuine D1 exception fell through the SAME
  // path as "D1 unbound" and still marked the lead delivered in KV.
  {
    telegramHits = 0;
    const kv = makeKV();
    const db = makeD1();
    const id = crypto.randomUUID();
    const leaseStart = new Date().toISOString();
    db._insert({
      submission_id: id, received_at: new Date().toISOString(), status: 'forwarding', delivered_at: leaseStart,
      name: 'FindingC', phone: '+972500000044', email: 'findingc@x.com', payload_json: '{}',
    });
    const env = { LEADS_KV: kv, LEADS_DB: db, TELEGRAM_TOKEN: 't', TELEGRAM_CHAT_ID: 'c' };
    const originalPrepare = db.prepare.bind(db);
    db.prepare = (sql) => {
      if (/AND status='forwarding' AND delivered_at=/.test(sql)) throw new Error('d1 down mid-guard');
      return originalPrepare(sql);
    };
    const rec = {
      submission_id: id, fields: { name: 'FindingC', phone: '+972500000044', email: 'findingc@x.com' },
      status: 'forwarding', received_at: new Date().toISOString(), forwarding_started_at: leaseStart,
    };
    const key = 'lead:' + id;
    const result = await markLeadDelivered(env, key, rec);
    console.log('\nT22 [finding C, round 4] A D1 error inside the CAS guard must be treated like not_owner, not "no D1 configured"');
    ok('markLeadDelivered reports failure (D1-errored guard, not a legit legacy fallback)', result === false, String(result));
    ok('KV was NOT written to delivered — deferred to the next sweep instead', !(await kv.get(key)), await kv.get(key));
    ok('D1 row is untouched (still forwarding under the original lease)',
      db._get(id)?.status === 'forwarding' && db._get(id)?.delivered_at === leaseStart, JSON.stringify(db._get(id)));
  }

  /* ============ Round 5 re-review (base 6034203) — admin-delete race,
     found by Codex. See docs/LEAD-PIPELINE.md "Review 2026-09-23 — round
     5" for the decision (eventual + bounded deletion, no Durable Object). */

  // T23 [round 5, scenario 1] Our completion CAS commits (changes=1), THEN
  // a concurrent admin delete wins the race — flips D1 to 'deleted' and
  // wipes KV — and OUR OWN completion KV write still lands right after,
  // resurrecting PII. The post-write re-check must undo that within the
  // same call and report non-ownership so the caller never notifies.
  {
    telegramHits = 0;
    const kv = makeKV();
    const db = makeD1();
    const id = crypto.randomUUID();
    const leaseStart = new Date().toISOString();
    const receivedAt = new Date().toISOString();
    db._insert({
      submission_id: id, received_at: receivedAt, status: 'forwarding', delivered_at: leaseStart,
      name: 'Race5', phone: '+972500000022', email: 'race5@x.com', payload_json: '{}',
    });
    const env = { LEADS_KV: kv, LEADS_DB: db, TELEGRAM_TOKEN: 't', TELEGRAM_CHAT_ID: 'c' };
    const key = 'lead:' + id;
    const originalPut = kv.put.bind(kv);
    let sideEffectFired = false;
    kv.put = async (k, v, opts) => {
      if (!sideEffectFired && k === key) {
        sideEffectFired = true;
        // Concurrent admin DELETE wins the race, right between our CAS
        // commit and this KV write landing: D1→deleted, PII scrubbed.
        await db.prepare(
          "UPDATE leads SET status='deleted', delivered_at=?1, name=NULL, phone=NULL, email=NULL, payload_json='{}' WHERE submission_id=?2",
        ).bind(new Date().toISOString(), id).run();
      }
      return originalPut(k, v, opts);
    };
    const rec = {
      submission_id: id, fields: { name: 'Race5', phone: '+972500000022', email: 'race5@x.com' },
      status: 'forwarding', received_at: receivedAt, forwarding_started_at: leaseStart,
    };
    const result = await markLeadDelivered(env, key, rec);
    console.log('\nT23 [round 5, scenario 1] Completion race with a concurrent admin delete must not leave PII resurrected in KV');
    ok('markLeadDelivered reports failure once the post-write re-check finds the row deleted',
      result === false, String(result));
    ok('KV stays wiped (the resurrection our own write caused is undone)', !(await kv.get(key)), await kv.get(key));
    ok('D1 row stays deleted, PII stays scrubbed', db._get(id)?.status === 'deleted' && db._get(id)?.name == null,
      JSON.stringify(db._get(id)));
  }

  // T24 [round 5, scenario 2] Intake's deletion check reads "active", THEN
  // a concurrent admin delete wins the race — flips D1 to 'deleted' — and
  // intake's OWN first-ever KV+R2 write for this id still lands right
  // after, resurrecting fresh PII. The post-write re-check must undo it,
  // and intake must stop there: no D1 lease claim, no Albato POST.
  {
    albatoHits = 0; telegramHits = 0;
    const kv = makeKV();
    const db = makeD1();
    const r2 = makeR2();
    const id = crypto.randomUUID();
    const key = 'lead:' + id;
    // A D1 row already exists (e.g. from an earlier partial attempt) so
    // the admin UI could see and delete it; intake itself has no KV/R2
    // copy yet — this is a genuine first-ever write for this key.
    db._insert({ submission_id: id, received_at: new Date().toISOString(), status: 'pending', payload_json: '{}' });
    const env = { LEADS_KV: kv, LEADS_DB: db, LEADS_ARCHIVE: r2, ALBATO_WEBHOOK_URL: 'https://albato.example/wh' };
    albatoUp = true;
    const originalPut = kv.put.bind(kv);
    let sideEffectFired = false;
    kv.put = async (k, v, opts) => {
      if (!sideEffectFired && k === key) {
        sideEffectFired = true;
        await db.prepare(
          "UPDATE leads SET status='deleted', delivered_at=?1, name=NULL, phone=NULL, email=NULL, payload_json='{}' WHERE submission_id=?2",
        ).bind(new Date().toISOString(), id).run();
      }
      return originalPut(k, v, opts);
    };
    const before = albatoHits;
    const r = await post(env, baseLead(id));
    console.log('\nT24 [round 5, scenario 2] Intake race with a concurrent admin delete must not leave PII resurrected in KV/R2');
    ok('D1 row stays deleted, PII stays scrubbed', db._get(id)?.status === 'deleted' && db._get(id)?.name == null,
      JSON.stringify(db._get(id)));
    ok('KV stays wiped after the post-write re-check', !kv._has(key));
    ok('R2 stays wiped too (no re-archived PII)', !r2._keys().some(function (k) { return k.endsWith(id + '.md'); }));
    ok('no Albato POST fired for a deleted lead', albatoHits === before, 'hits=' + (albatoHits - before));
    ok('response is a harmless dedup-style 202, not a client-facing error', r.status === 202 && r.body.dedup === true,
      JSON.stringify(r.body));
  }

  /* ============ Round 6 (base ea91e3c) — consolidated review (Codex + a
     5-lens review, independently re-verified). See
     docs/LEAD-PIPELINE.md "Review 2026-09-23 — round 6" for the table. */

  // T25 [round 6, finding 2] Intake: a concurrent admin DELETE lands AFTER
  // the lease claim but BEFORE the Albato POST — the POST must not go out,
  // even though the claim itself succeeded moments earlier.
  {
    albatoHits = 0; telegramHits = 0;
    const kv = makeKV();
    const db = makeD1();
    const env = { LEADS_KV: kv, LEADS_DB: db, LEADS_ARCHIVE: makeR2(), ALBATO_WEBHOOK_URL: 'https://albato.example/wh' };
    albatoUp = true;
    const id = crypto.randomUUID();
    const originalPrepare = db.prepare.bind(db);
    let selectCount = 0;
    db.prepare = (sql) => {
      if (/^SELECT status FROM leads WHERE submission_id=/.test(sql)) {
        selectCount++;
        // 1st = the initial deletion check (finding A); 2nd = the
        // post-write re-check (round 5, finding 1/2); 3rd = THIS round's
        // pre-POST re-check, right before the Albato send — inject the
        // concurrent admin delete exactly there.
        if (selectCount === 3) {
          originalPrepare(
            "UPDATE leads SET status='deleted', delivered_at=?1, name=NULL, phone=NULL, email=NULL, payload_json='{}' WHERE submission_id=?2",
          ).bind(new Date().toISOString(), id).run();
        }
      }
      return originalPrepare(sql);
    };
    const before = albatoHits;
    const r = await post(env, baseLead(id));
    console.log('\nT25 [round 6, finding 2] Intake must not POST to Albato once a concurrent admin delete lands post-claim');
    ok('no Albato POST fired', albatoHits === before, 'hits=' + (albatoHits - before));
    ok('D1 row stays deleted', db._get(id)?.status === 'deleted', JSON.stringify(db._get(id)));
    ok('response is a harmless dedup-style 202, not a client-facing error',
      r.status === 202 && r.body.dedup === true, JSON.stringify(r.body));
  }

  // T26 [round 6, finding 2] sweepPendingLeads' KV-loop: same race, this
  // time via the sweep path — the claim succeeds, admin delete lands, the
  // sweep's own POST must not fire either.
  {
    albatoHits = 0; telegramHits = 0;
    const kv = makeKV();
    const db = makeD1();
    const id = crypto.randomUUID();
    const receivedAt = new Date().toISOString();
    const fields = { name: 'Round6F2', phone: '+972500000011', email: 'round6f2@x.com' };
    await kv.put('lead:' + id, JSON.stringify({
      submission_id: id, fields, status: 'pending', received_at: receivedAt,
    }), { metadata: { status: 'pending', received_at: receivedAt } });
    db._insert({
      submission_id: id, received_at: receivedAt, status: 'pending', delivered_at: null,
      name: fields.name, phone: fields.phone, email: fields.email, payload_json: JSON.stringify(fields),
    });
    const env = { LEADS_KV: kv, LEADS_DB: db, ALBATO_WEBHOOK_URL: 'https://albato.example/wh' };
    albatoUp = true;
    const originalPrepare = db.prepare.bind(db);
    let selectCount = 0;
    db.prepare = (sql) => {
      if (/^SELECT status FROM leads WHERE submission_id=/.test(sql)) {
        selectCount++;
        // 1st = isLeadDeletedForSweep's pre-claim candidate check (must see
        // "active" so the claim actually proceeds); 2nd = THIS round's
        // pre-POST re-check, right before the Albato send.
        if (selectCount === 2) {
          originalPrepare(
            "UPDATE leads SET status='deleted', delivered_at=?1, name=NULL, phone=NULL, email=NULL, payload_json='{}' WHERE submission_id=?2",
          ).bind(new Date().toISOString(), id).run();
        }
      }
      return originalPrepare(sql);
    };
    const before = albatoHits;
    await sweepPendingLeads({ ...env }, '');
    console.log('\nT26 [round 6, finding 2] sweep must not POST to Albato once a concurrent admin delete lands post-claim');
    ok('no Albato POST fired', albatoHits === before, 'hits=' + (albatoHits - before));
    ok('D1 row stays deleted', db._get(id)?.status === 'deleted', JSON.stringify(db._get(id)));
  }

  console.log(`\n=== RESULT: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
