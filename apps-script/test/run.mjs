// Раннер: node apps-script/test/run.mjs
// Импортирует все *.test.mjs (они регистрируются в общий harness через
// одинаковый путь import './helpers/harness.mjs'), затем выполняет всё и
// печатает итог. exit code 0 = всё зелёное, 1 = есть падения.
//
// GAS_SRC_DIR можно переопределить, чтобы прогнать тот же набор тестов против
// другой копии src/ (см. README "Как воспроизвести RED -> GREEN").
import { run } from './helpers/harness.mjs';

const testFiles = [
  './business-calendar.test.mjs',
  './sla.test.mjs',
  './correction-chain.test.mjs',
  './send-log.test.mjs',
  './digest.test.mjs',
  './source-and-numbering.test.mjs',
  './sync-plan.test.mjs',
  './config.test.mjs',
  './utils.test.mjs',
  './sheets-protection.test.mjs',
  './code-corrections.test.mjs',
  './code-integration.test.mjs',
  './static-checks.test.mjs',
  './email-templates.test.mjs',
  './codex-review-fixes.test.mjs',
  './dashboard.test.mjs',
  './realrun.test.mjs',
  './pipeline-health.test.mjs',
  './fix-a.test.mjs',
  './fix-b.test.mjs'
];

console.log('apps-script/test/run.mjs — GAS_SRC_DIR=' + (process.env.GAS_SRC_DIR || '(по умолчанию: ../src)'));
console.log('');

for (const file of testFiles) {
  await import(file);
}

await run();
