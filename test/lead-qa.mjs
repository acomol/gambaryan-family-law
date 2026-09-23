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
import { onRequest as leadRequest } from '../functions/api/lead.js';
import { onRequestGet as adminGet, onRequestPost as adminPost } from '../functions/api/admin.js';

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

  // T6 — /api/admin: CF Access gate + table + CSV/MD export + filter + delete
  {
    const idA1 = crypto.randomUUID();
    const idA2 = crypto.randomUUID();
    const env = { LEADS_KV: makeKV(), LEADS_DB: makeD1(), LEADS_ARCHIVE: makeR2(), ALBATO_WEBHOOK_URL: 'https://albato.example/wh', ADMIN_ALLOWED_EMAILS: 'alex@adfix.co.il' };
    albatoUp = true;
    await post(env, baseLead(idA1, { phone: '+972500000011' }));
    await post(env, baseLead(idA2, { phone: '+972500000022' }));
    const adminReq = (qs = '', email = 'alex@adfix.co.il') => new Request(ADMIN_URL + qs, { headers: email ? { 'Cf-Access-Authenticated-User-Email': email } : {} });
    const deleteForm = (id) => { const fd = new FormData(); fd.append('action', 'delete'); fd.append('submission_id', id); return fd; };
    const adminDeleteReq = (id, email = 'alex@adfix.co.il') => new Request(ADMIN_URL + '?q=%2B972500000022', { method: 'POST', headers: email ? { 'Cf-Access-Authenticated-User-Email': email } : {}, body: deleteForm(id) });
    console.log('\nT6 /api/admin — CF Access gate + table + export');
    const noauth = await adminGet({ request: adminReq('', null), env });
    ok('no CF Access header → 403 (PII safe)', noauth.status === 403);
    const notallow = await adminGet({ request: adminReq('', 'stranger@evil.com'), env });
    ok('not on allowlist → 403', notallow.status === 403);
    const tbl = await adminGet({ request: adminReq(), env }); const tblHtml = await tbl.text();
    ok('authed → 200 HTML table with leads', tbl.status === 200 && tblHtml.includes(idA1) && tblHtml.includes('+972500000011'));
    const csv = await adminGet({ request: adminReq('?format=csv'), env }); const csvTxt = await csv.text();
    ok('CSV export has header + 2 rows', csv.headers.get('content-type').includes('text/csv') && csvTxt.includes('submission_id') && csvTxt.includes(idA1) && csvTxt.includes(idA2));
    ok('CSV export has Google/Meta click IDs', csvTxt.includes('gclid') && csvTxt.includes('gbraid') && csvTxt.includes('wbraid') && csvTxt.includes('fbclid') && csvTxt.includes('G1') && csvTxt.includes('B1') && csvTxt.includes('W1'));
    const md = await adminGet({ request: adminReq('?format=md'), env }); const mdTxt = await md.text();
    ok('MD export has both leads', md.headers.get('content-type').includes('markdown') && mdTxt.includes(idA1) && mdTxt.includes(idA2));
    const filt = await adminGet({ request: adminReq('?q=+972500000022'), env }); const filtTxt = await filt.text();
    ok('search filter narrows to 1', filtTxt.includes(idA2) && !filtTxt.includes(idA1));
    const delNoauth = await adminPost({ request: adminDeleteReq(idA1, null), env });
    ok('delete without auth → 403 (PII safe)', delNoauth.status === 403);
    const del = await adminPost({ request: adminDeleteReq(idA1), env });
    ok('delete redirects back to filtered admin', del.status === 303 && del.headers.get('location').includes('deleted=' + idA1) && del.headers.get('location').includes('q=%2B972500000022'));
    ok('delete removed D1 row only for selected lead', !env.LEADS_DB._get(idA1) && !!env.LEADS_DB._get(idA2));
    ok('delete removed KV/R2 copies', !env.LEADS_KV._has('lead:' + idA1) && env.LEADS_KV._has('lead:' + idA2) && !env.LEADS_ARCHIVE._keys().some(k => k.endsWith(idA1 + '.md')));
  }

  // T7 — /api/admin inert without D1 (friendly, no crash)
  {
    const env = {};
    const res = await adminGet({ request: new Request(ADMIN_URL, { headers: { 'Cf-Access-Authenticated-User-Email': 'a@b.com' } }), env });
    const t = await res.text();
    console.log('\nT7 /api/admin inert without D1 → friendly page (no crash)');
    ok('200 + "не настроено" message', res.status === 200 && t.includes('LEADS_DB'));
  }

  console.log(`\n=== RESULT: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
