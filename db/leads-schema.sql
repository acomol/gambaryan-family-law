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
