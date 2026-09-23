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

export function loadGasContext(fileNames) {
  const srcDir = process.env.GAS_SRC_DIR
    ? path.resolve(process.env.GAS_SRC_DIR)
    : DEFAULT_SRC_DIR;

  const sandbox = {
    console,
    Utilities: { formatDate: mockFormatDate },
    Logger: { log: () => {} },
    // Остальные GAS-сервисы файлы верхнего уровня не вызывают при загрузке
    // (только объявляют функции) — пустых объектов достаточно, чтобы файлы,
    // ссылающиеся на них внутри тел функций, которые тесты не вызывают,
    // загрузились без ошибок парсинга/выполнения верхнего уровня.
    SpreadsheetApp: {},
    MailApp: {},
    PropertiesService: {},
    ScriptApp: {},
    LockService: {},
    ContentService: {},
    Session: {}
  };
  vm.createContext(sandbox);

  const files = fileNames || fs.readdirSync(srcDir).filter((f) => f.endsWith('.gs')).sort();
  for (const file of files) {
    const fullPath = path.join(srcDir, file);
    const code = fs.readFileSync(fullPath, 'utf8');
    vm.runInContext(code, sandbox, { filename: fullPath });
  }
  return sandbox;
}
