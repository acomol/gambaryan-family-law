/* Lead-pipeline clone-gate — adapted from the ADFIX CLONE-CONFIG-MATRIX §7
   leak gate (clients/luxemed/New Lending/docs/CLONE-CONFIG-MATRIX-2026-06.md,
   digitalhook-os-, feature/luxemed-new-lending@613cdd30):
     grep -rn 'assuta|6a22acac|GTM-5GXX6M4M|...' <new project> → 0

   Two checks, both must be clean:
     1. Zero leaked Assuta/LuxeMed identifiers anywhere in the ported lead
        pipeline (cron-worker/, db/, functions/api/lead*.js, admin.js, docs).
     2. Every Cloudflare resource id that is not yet provisioned for
        Gambaryan (cron-worker/wrangler.toml KV id + D1 database_id) is a
        recognizable <GAMB_*> placeholder — not blank, not a real-looking
        Cloudflare id, and not an accidentally-copied Assuta value. This is
        the "not yet activated" state on purpose (see docs/LEAD-PIPELINE.md);
        the gate fails only if a placeholder looks wrong, not because a
        placeholder exists.

   Run: node scripts/verify-lead-pipeline-remap.mjs */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const SCAN_FILES = [
  "cron-worker/wrangler.toml",
  "cron-worker/src/index.js",
  "cron-worker/apps-script.gs",
  "db/leads-schema.sql",
  "functions/api/lead.js",
  "functions/api/lead-dead-letter.js",
  "functions/api/admin.js",
  "docs/LEAD-PIPELINE.md",
];

// Assuta/LuxeMed IDENTIFIERS that must never leak into deployable/config
// surfaces (CLONE-CONFIG-MATRIX §7 — real resource ids, GTM/GA4 ids). These
// have zero legitimate reason to appear anywhere in this repo, including
// comments, so they are checked everywhere. Deliberately NOT included here:
// the bare brand words "assuta"/"ассута"/"luxemed" — those legitimately
// appear in this repo's OWN provenance comments (this task's brief requires
// naming which reference file each port came from, e.g.
// "clients/luxemed/New Lending/functions/lead.js"). What matters for a real
// leak is that no USER-FACING string (Telegram text, page titles, CSV
// filenames, confirm() dialogs) says "Assuta" — verified once by hand below
// (grep against the string-literal-bearing lines only) rather than gated
// here, to avoid failing on the very comments this task asked for.
const LEAK_PATTERNS = [
  { label: "KV namespace id 96abdb56…", re: /96abdb56/i },
  { label: "D1 database id a23761dc…", re: /a23761dc/i },
  { label: "Consently banner id 6a22acac…", re: /6a22acac/i },
  { label: "GTM container GTM-5GXX6M4M", re: /GTM-5GXX6M4M/i },
  { label: "GA4 measurement G-D56BW0V50C", re: /G-D56BW0V50C/i },
  { label: "GA4 loader GT-NS8GC9LF", re: /GT-NS8GC9LF/i },
  { label: "GA4 property 540023177", re: /540023177/ },
];
// User-facing string literals must never render the previous client's brand.
// Checked with a stricter filter than LEAK_PATTERNS: only lines that are NOT
// a comment (so a provenance citation like "Ported from clients/luxemed/..."
// does not trip this), across the same file set.
const BRAND_WORDS = [/assuta/i, /ассута/i, /luxemed/i];
// Line-number-preserving comment stripper: blanks out /* ... */ blocks
// (keeping newlines) so a multi-line header comment's continuation lines —
// which don't repeat a `*`/`//` prefix — are still recognized as comment
// text, then blanks any remaining //, #, -- line comment.
function stripCommentsPreservingLines(content) {
  const withoutBlocks = content.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "));
  return withoutBlocks
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*$/, "").replace(/(^|\s)#.*$/, "$1").replace(/--.*$/, ""))
    .join("\n");
}

// Fields that must be a placeholder until the owner provisions real Cloudflare
// resources for Gambaryan (wrangler.toml is inert without them — no deploy
// happens as part of this change).
const PLACEHOLDER_FIELDS = [
  { file: "cron-worker/wrangler.toml", label: "KV id", re: /^\s*id\s*=\s*"([^"]*)"\s*$/m },
  { file: "cron-worker/wrangler.toml", label: "D1 database_id", re: /^\s*database_id\s*=\s*"([^"]*)"\s*$/m },
];
const PLACEHOLDER_SHAPE = /^<GAMB_[A-Z0-9_]+>$/;
// A real Cloudflare KV/D1 id is a 32-char lowercase hex string (Assuta's own
// ids are exactly this shape) — reject anything that looks like one, blank,
// or anything not matching PLACEHOLDER_SHAPE.
const REAL_ID_SHAPE = /^[0-9a-f]{8}(-?[0-9a-f]{4}){3}-?[0-9a-f]{12}$/i;

let failures = 0;

function readRepoFile(relPath) {
  try {
    return readFileSync(join(ROOT, relPath), "utf8");
  } catch (error) {
    return null;
  }
}

console.log("\n=== Lead-pipeline clone-gate (Assuta leak scan + placeholder shape) ===\n");

for (const relPath of SCAN_FILES) {
  const content = readRepoFile(relPath);
  if (content == null) {
    console.log(`  SKIP  ${relPath} (not found)`);
    continue;
  }
  const lines = content.split(/\r?\n/);
  let fileClean = true;
  for (const { label, re } of LEAK_PATTERNS) {
    lines.forEach((line, index) => {
      if (re.test(line)) {
        failures++;
        fileClean = false;
        console.log(`  FAIL  ${relPath}:${index + 1}  leaked ${label}  → ${line.trim()}`);
      }
    });
  }
  // Brand words: only outside comments, and not in this doc itself (prose,
  // not a deployable/rendered surface) — see BRAND_WORDS comment above.
  if (!relPath.endsWith(".md")) {
    const codeOnlyLines = stripCommentsPreservingLines(content).split(/\r?\n/);
    codeOnlyLines.forEach((line, index) => {
      for (const re of BRAND_WORDS) {
        if (re.test(line)) {
          failures++;
          fileClean = false;
          console.log(`  FAIL  ${relPath}:${index + 1}  brand word outside a comment  → ${lines[index].trim()}`);
        }
      }
    });
  }
  if (fileClean) console.log(`  PASS  ${relPath} — no Assuta/LuxeMed leakage`);
}

for (const { file, label, re } of PLACEHOLDER_FIELDS) {
  const content = readRepoFile(file);
  if (content == null) {
    failures++;
    console.log(`  FAIL  ${file} — file not found, cannot verify ${label}`);
    continue;
  }
  const match = re.exec(content);
  const value = match ? match[1] : null;
  if (value == null) {
    failures++;
    console.log(`  FAIL  ${file} — could not find ${label} field`);
  } else if (REAL_ID_SHAPE.test(value)) {
    failures++;
    console.log(`  FAIL  ${file} — ${label} looks like a real Cloudflare id, not a placeholder → "${value}"`);
  } else if (!PLACEHOLDER_SHAPE.test(value)) {
    failures++;
    console.log(`  FAIL  ${file} — ${label} is not a recognizable <GAMB_*> placeholder → "${value}"`);
  } else {
    console.log(`  PASS  ${file} — ${label} is a valid pending placeholder ("${value}")`);
  }
}

console.log(`\n=== RESULT: ${failures === 0 ? "CLEAN" : failures + " FAIL(s)"} ===\n`);
process.exit(failures ? 1 : 0);
