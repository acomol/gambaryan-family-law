// v1: письмо о новой заявке шлёт Albato; CRM по умолчанию его не шлёт.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, assert } from './helpers/harness.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const srcDir = process.env.GAS_SRC_DIR ? path.resolve(process.env.GAS_SRC_DIR) : path.join(here, '..', 'src');
const allSrc = fs.readdirSync(srcDir).filter((f) => f.endsWith('.gs')).map((f) => fs.readFileSync(path.join(srcDir, f), 'utf8')).join('\n');

test('v1: поставляемый код НЕ шлёт письмо о новой заявке (его шлёт Albato) — нет дублей', () => {
  assert.match(allSrc, /var NEW_LEAD_EMAIL_ENABLED_ = false;/);
  assert.match(allSrc, /if \(!NEW_LEAD_EMAIL_ENABLED_\) return \{ sent: false, reason: 'skip' \};/);
});
