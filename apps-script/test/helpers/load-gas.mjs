// Загружает .gs файлы Apps Script в общий vm-контекст, чтобы их функции можно
// было вызывать из Node-тестов без изменения самих .gs файлов.
//
// GAS_SRC_DIR можно переопределить переменной окружения — используется для
// демонстрации RED (заглушки) перед GREEN (настоящая реализация), см. README
// "Как воспроизвести RED -> GREEN".
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { formatDate as mockFormatDate } from './mock-utilities.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SRC_DIR = path.join(__dirname, '..', '..', 'src');

export function loadGasContext(fileNames, overrides) {
  const srcDir = process.env.GAS_SRC_DIR
    ? path.resolve(process.env.GAS_SRC_DIR)
    : DEFAULT_SRC_DIR;

  const sandbox = Object.assign({
    console,
    Utilities: { formatDate: mockFormatDate },
    Logger: { log: () => {} },
    // Остальные GAS-сервисы файлы верхнего уровня не вызывают при загрузке
    // (только объявляют функции) — пустых объектов достаточно, чтобы файлы,
    // ссылающиеся на них внутри тел функций, которые тесты не вызывают,
    // загрузились без ошибок парсинга/выполнения верхнего уровня. Тесты,
    // которым нужно реально ВЫЗВАТЬ GAS-only код (Sheets.gs/Code.gs/
    // Notifications.gs), передают вторым аргументом структурные фейки из
    // test/helpers/gas-fakes.mjs, которые здесь подмешиваются поверх заглушек.
    SpreadsheetApp: {},
    MailApp: {},
    PropertiesService: {},
    ScriptApp: {},
    LockService: {},
    ContentService: {},
    Session: {},
    UrlFetchApp: {},
    // Charts — дашборд «Сводка» (5 графиков, EmbeddedChartBuilder использует
    // Charts.ChartType.* как перечисление типа при sheet.newChart().setChartType(...)).
    Charts: { ChartType: { LINE: 'LINE', BAR: 'BAR', COLUMN: 'COLUMN', PIE: 'PIE' } }
  }, overrides || {});
  vm.createContext(sandbox);

  const available = fs.readdirSync(srcDir).filter((f) => f.endsWith('.gs')).sort();
  const requested = fileNames || available;

  // Bundle support (scripts/bundle-apps-script.mjs): GAS_SRC_DIR can point at
  // apps-script/dist, which holds every src/*.gs file concatenated into one
  // Code.gs — that single file already defines everything the per-file
  // requested list (e.g. ['Utils.gs', 'Config.gs']) would load individually.
  // If any requested file is missing AND srcDir contains exactly one .gs
  // file, load that one file instead of the (non-existent) subset — it is
  // the equivalence case the bundle is meant to prove, not a fallback that
  // should paper over a genuinely missing file otherwise.
  const missing = requested.filter((f) => !available.includes(f));
  const files = (missing.length > 0 && available.length === 1) ? available : requested;

  for (const file of files) {
    const fullPath = path.join(srcDir, file);
    const code = fs.readFileSync(fullPath, 'utf8');
    vm.runInContext(code, sandbox, { filename: fullPath });
  }
  return sandbox;
}
