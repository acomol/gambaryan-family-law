// Некоторые находки ревью меняют СЕМАНТИКУ правильного признака, не наблюдаемое
// поведение (старая проверка была мёртвым кодом — никогда не срабатывала, и
// её замена на правильную не меняет ни один существующий сценарий "снаружи").
// Для таких случаев (review находки №11а/№11б) поведенческий тест не может
// зафиксировать разницу по построению — фиксируем требование статической
// проверкой исходного текста Code.gs (red на старом тексте, green на новом),
// как разрешает бриф задачи ("no functional behavior change" — задокументировано,
// не выдаётся за поведенческий тест).
import { test, assert } from './helpers/harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = process.env.GAS_SRC_DIR ? path.resolve(process.env.GAS_SRC_DIR) : path.join(__dirname, '..', 'src');
const codeGs = fs.readFileSync(path.join(srcDir, 'Code.gs'), 'utf8');

test('processSla_ проверяет правильный сентинел businessMinutesElapsed===null, не мёртвый firstAttemptDue===null (review находка №11а)', () => {
  assert.ok(!/firstAttemptDue\s*===\s*null/.test(codeGs),
    'старая проверка была мёртвым кодом: evaluateSlaState_ никогда не возвращает firstAttemptDue===null (см. Sla.gs — это всегда boolean)');
  assert.ok(/businessMinutesElapsed\s*===\s*null/.test(codeGs),
    'правильный сентинел "первая попытка уже была" — businessMinutesElapsed===null');
});

test('doGet сравнивает healthEndpointToken через timingSafeEqual_, а не оператором !== (review находка №11б)', () => {
  assert.ok(!/providedToken\s*!==\s*token/.test(codeGs),
    'прямое сравнение строк с коротким замыканием не должно использоваться для секретного токена');
  assert.ok(/timingSafeEqual_\(\s*providedToken\s*,\s*token\s*\)/.test(codeGs),
    'doGet должен использовать timingSafeEqual_(providedToken, token) для сравнения токена');
});
