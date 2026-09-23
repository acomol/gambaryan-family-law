-- Gambaryan leads — D1 schema (queryable mirror powering /api/admin).
-- Apply:  wrangler d1 execute <GAMB_D1_NAME> --remote --file=./db/leads-schema.sql
-- KV (LEADS_KV) stays the source of truth (ADR-035, ported from ADFIX Assuta/LuxeMed
-- lead pipeline — see docs/LEAD-PIPELINE.md); D1 is a queryable mirror written
-- best-effort by functions/api/lead.js (upsertLeadD1). Adapted from
-- clients/luxemed/New Lending/db/leads-schema.sql (digitalhook-os-,
-- feature/luxemed-new-lending@613cdd30): dropped Assuta-only medical columns
-- (lead_type/direction/urgency/diagnosis/channel), added Gambaryan's
-- corrects_submission_id + full attribution set (utm_id/utm_term/utm_content/fbclid)
-- to match site/lead-contract.js.

CREATE TABLE IF NOT EXISTS leads (
  submission_id           TEXT PRIMARY KEY,        -- idempotency key (matches KV + Albato dedup)
  received_at             TEXT NOT NULL,           -- ISO8601, server intake time
  status                  TEXT NOT NULL DEFAULT 'pending',  -- pending | forwarding | delivered
  delivered_at            TEXT,                    -- lease start while forwarding; acceptance time when delivered
  name                    TEXT,
  phone                   TEXT,
  email                   TEXT,
  corrects_submission_id  TEXT,                    -- links a contact correction to the lead it corrects
  form_id                 TEXT,
  landing_path            TEXT,
  referrer_host           TEXT,
  utm_source              TEXT,
  utm_medium              TEXT,
  utm_campaign            TEXT,
  utm_id                  TEXT,
  utm_term                TEXT,
  utm_content             TEXT,
  gclid                   TEXT,
  gbraid                  TEXT,
  wbraid                  TEXT,
  fbclid                  TEXT,
  payload_json            TEXT NOT NULL            -- full Albato payload, no-loss
);

CREATE INDEX IF NOT EXISTS idx_leads_received ON leads(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status   ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_phone    ON leads(phone);

-- Review 2026-09-23, round 5 addition 2: pipeline-health v1 bookkeeping.
-- This client has no Telegram configured, so backup/sweep failures were
-- otherwise silent; the mini-CRM Apps Script polls GET /health (cron-worker)
-- hourly and emails alex@adfix.co.il on failure. Deliberately NOT in KV —
-- the account-wide KV free-tier write budget (1000/day) is shared with
-- Assuta. `job` is 'backup' | 'sweep'; `last_run_at` is set on every run of
-- that job, `last_ok_at` only when it succeeded (backup: dump wrote AND
-- integrity_ok; sweep: the run completed without throwing); `detail` is a
-- small free-form field (e.g. backup's integrity_ok as text) — never PII.
CREATE TABLE IF NOT EXISTS cron_health (
  job          TEXT PRIMARY KEY,
  last_run_at  TEXT,
  last_ok_at   TEXT,
  detail       TEXT
);

-- Review 2026-09-23, round 6, finding 3c: exponential retry backoff for
-- cron-worker's sweepPending (5min/10min/20min/40min, capped at 1h) — a
-- persistently-failing Albato used to get re-claimed and re-released on
-- EVERY 5-min sweep forever, ~576+ KV.put/day for one stuck lead alone.
-- cron-worker-only bookkeeping: functions/api/lead.js's own D1_COLUMNS
-- never lists these, so its writes correctly leave them untouched (a SQL
-- UPDATE/INSERT only ever touches columns it names).
--
-- ⚠️ ALTER TABLE ADD COLUMN is NOT idempotent like CREATE TABLE IF NOT
-- EXISTS above — SQLite has no "IF NOT EXISTS" for ADD COLUMN. Re-running
-- this file against an ALREADY-migrated database will error with
-- "duplicate column name" on these two lines. Safe on a fresh database
-- (immediately after CREATE TABLE, before any column exists); on prod,
-- run this block ONCE.
ALTER TABLE leads ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN next_attempt_at TEXT;
