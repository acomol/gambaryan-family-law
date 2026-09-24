#!/usr/bin/env node
// scripts/bundle-apps-script.mjs
//
// Concatenates apps-script/src/*.gs into a single apps-script/dist/Code.gs,
// and copies apps-script/appsscript.json to apps-script/dist/appsscript.json.
// The owner (alex@adfix.co.il) installs this project by hand in
// script.google.com — see apps-script/README.md "Установка (ручная вставка)" —
// so a single pasteable file is the deliverable, not `clasp push`.
//
// Usage: node scripts/bundle-apps-script.mjs
//
// Equivalence proof: run the full test suite against the generated bundle
// with GAS_SRC_DIR pointing at apps-script/dist — must be green, same as
// against apps-script/src:
//   node scripts/bundle-apps-script.mjs
//   GAS_SRC_DIR=apps-script/dist node apps-script/test/run.mjs
//
// File order is a fixed, explicit list below (not a directory glob) so a new
// .gs file added later must be wired in here deliberately — the script
// refuses to run if apps-script/src/ contains a file this list doesn't know
// about, or lists a file that no longer exists. Order does not currently
// affect behavior: Apps Script (like this Node bundle, since `function foo(){}`
// declarations are hoisted) executes every top-level function declaration
// before any of them runs, and the only top-level executable statements in
// this codebase are `var X = ...` assignments that reference nothing but
// literals or symbols declared earlier IN THE SAME FILE (verified by reading
// every src/*.gs file, 2026-09-23) — so concatenation order is cosmetic, and
// the list below simply mirrors the grouping apps-script/README.md already
// documents (pure-logic modules first, GAS-integration modules last).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(REPO_ROOT, 'apps-script', 'src');
const DIST_DIR = path.join(REPO_ROOT, 'apps-script', 'dist');
const MANIFEST_SRC = path.join(REPO_ROOT, 'apps-script', 'appsscript.json');

const FILE_ORDER = [
  // ЧИСТАЯ ЛОГИКА (apps-script/README.md "Что where") — не знают о
  // SpreadsheetApp/MailApp кроме Utilities.formatDate.
  'Utils.gs',
  'BusinessCalendar.gs',
  'Sla.gs',
  'CorrectionChain.gs',
  'SendLog.gs',
  'Digest.gs',
  'Source.gs',
  'Numbering.gs',
  'SyncPlan.gs',
  'EmailTemplates.gs',
  'Config.gs',
  // GAS-интеграционный слой — вызывает чистую логику + настоящие GAS-сервисы.
  'PipelineHealth.gs',
  'Sheets.gs',
  'Notifications.gs',
  'Code.gs'
];

function assertFileListMatchesDirectory() {
  const actual = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.gs')).sort();
  const expected = FILE_ORDER.slice().sort();
  const missingFromDisk = expected.filter((f) => !actual.includes(f));
  const missingFromList = actual.filter((f) => !expected.includes(f));
  if (missingFromDisk.length || missingFromList.length) {
    const lines = ['scripts/bundle-apps-script.mjs: FILE_ORDER is out of sync with apps-script/src/.'];
    if (missingFromDisk.length) lines.push('  Listed in FILE_ORDER but missing on disk: ' + missingFromDisk.join(', '));
    if (missingFromList.length) lines.push('  Present in apps-script/src/ but not in FILE_ORDER: ' + missingFromList.join(', '));
    lines.push('  Add/remove the file in FILE_ORDER above (in a deliberate position), then rerun.');
    throw new Error(lines.join('\n'));
  }
}

// "no duplicate top-level function names" static check. Top-level functions
// in this codebase are always declared unindented (`function name_(...) {`
// at column 0) — verified against every src/*.gs file, 2026-09-23; nested
// helpers are indented. A duplicate here would mean one implementation
// silently shadows another once concatenated into one global scope, which
// Apps Script would do without any warning.
function assertNoDuplicateTopLevelFunctions(fileContents) {
  const declaredIn = new Map(); // name -> file it was first seen in
  const duplicates = [];
  for (const { file, code } of fileContents) {
    const re = /^function\s+([A-Za-z0-9_$]+)\s*\(/gm;
    let match;
    while ((match = re.exec(code))) {
      const name = match[1];
      if (declaredIn.has(name)) {
        duplicates.push(name + ' (' + declaredIn.get(name) + ' and ' + file + ')');
      } else {
        declaredIn.set(name, file);
      }
    }
  }
  if (duplicates.length) {
    throw new Error('scripts/bundle-apps-script.mjs: duplicate top-level function name(s) across apps-script/src/:\n  ' + duplicates.join('\n  '));
  }
}

function currentCommitSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  } catch (err) {
    return '(unknown — git rev-parse HEAD failed: ' + err.message + ')';
  }
}

function main() {
  assertFileListMatchesDirectory();

  const fileContents = FILE_ORDER.map((file) => ({
    file,
    code: fs.readFileSync(path.join(SRC_DIR, file), 'utf8')
  }));

  assertNoDuplicateTopLevelFunctions(fileContents);

  const sha = currentCommitSha();
  const date = new Date().toISOString().slice(0, 10);
  const header = [
    '// GENERATED FILE — DO NOT EDIT.',
    '//',
    '// Built by scripts/bundle-apps-script.mjs from apps-script/src/*.gs',
    '// (fixed order — see FILE_ORDER in that script).',
    '// Source commit: ' + sha,
    '// Generated: ' + date,
    '//',
    '// To change behavior, edit the corresponding file under apps-script/src/',
    '// and rerun: node scripts/bundle-apps-script.mjs',
    ''
  ].join('\n');

  const body = fileContents
    .map(({ file, code }) => '// ---- ' + file + ' ----\n' + code.replace(/\s+$/, ''))
    .join('\n\n');

  fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.writeFileSync(path.join(DIST_DIR, 'Code.gs'), header + '\n' + body + '\n');
  fs.copyFileSync(MANIFEST_SRC, path.join(DIST_DIR, 'appsscript.json'));

  console.log('Wrote ' + path.join('apps-script', 'dist', 'Code.gs') + ' (' + fileContents.length + ' source files, commit ' + sha.slice(0, 12) + ')');
  console.log('Wrote ' + path.join('apps-script', 'dist', 'appsscript.json'));
}

main();
