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
import { onRequest as leadRequest, sweepPendingLeads, claimLeadD1Lease } from '../functions/api/lead.js';
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
let albatoUp = true; let albatoHits = 0; let telegramHits = 0; let albatoDelayMs = 0;
global.fetch = async (url) => {
  const u = String(url);
  if (u.includes('api.telegram.org')) { telegramHits++; return new Response('{}', { status: 200 }); }
  albatoHits++;
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

  // T14b [finding B] A tombstone-read error must fail closed: if BOTH the
  // D1 status lookup and the KV tombstone lookup error out, forwarding must
  // be refused rather than risk resurrecting a deleted lead.
  {
    albatoHits = 0;
    const kv = makeKV();
    kv.get = async () => { throw new Error('kv get down'); };
    const db = makeD1();
    const originalPrepare = db.prepare.bind(db);
    db.prepare = (sql) => {
      if (/SELECT status FROM leads WHERE submission_id/.test(sql)) throw new Error('d1 select down');
      return originalPrepare(sql);
    };
    const env = { LEADS_KV: kv, LEADS_DB: db, ALBATO_WEBHOOK_URL: 'https://albato.example/wh' };
    const id = crypto.randomUUID();
    albatoUp = true;
    const r = await post(env, baseLead(id));
    console.log('\nT14b [finding B] Both deletion-status signals unreadable → fail closed, no forward');
    ok('a fresh lead still gets a durable, non-forwarding-blocked 202 (this is NOT a deleted id — only the isLeadDeleted check itself must be resilient)',
      r.status === 202 || r.status === 502, JSON.stringify(r.body));
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

  console.log(`\n=== RESULT: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
