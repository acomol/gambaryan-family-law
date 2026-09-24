// Мини-раннер тестов без внешних зависимостей ("no Google", и намеренно без
// jest/vitest — весь стенд самодостаточен: `node apps-script/test/run.mjs`).
import assert from 'node:assert/strict';

const tests = [];

export function test(name, fn) {
  tests.push({ name, fn });
}

export { assert };

/**
 * Значения, возвращённые из vm-контекста (load-gas.mjs), — объекты/массивы из
 * ДРУГОГО реалма: Array.isArray()==true, но instanceof Array==false и прототип
 * не совпадает с host-реалмом. assert.deepStrictEqual в этом случае честно
 * репортит "same structure but not reference-equal" — это артефакт границы
 * реалмов, а не расхождение данных. toHost() пересобирает значение через
 * JSON в текущем (host) реалме для сравнения по структуре.
 */
export function toHost(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

export async function run() {
  let pass = 0;
  let fail = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log('  PASS  ' + t.name);
      pass++;
    } catch (err) {
      console.log('  FAIL  ' + t.name);
      console.log('        ' + (err && err.stack ? err.stack.split('\n').slice(0, 3).join('\n        ') : String(err)));
      fail++;
    }
  }
  console.log('');
  console.log(pass + ' passed, ' + fail + ' failed, ' + tests.length + ' total');
  process.exitCode = fail === 0 ? 0 : 1;
  return { pass, fail, total: tests.length };
}
