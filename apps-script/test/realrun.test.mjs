// Регрессии из первого ЖИВОГО прогона Apps Script (приватная копия таблицы,
// Codex, 2026-09-23). Имитация раньше этого не ловила: настоящая таблица сама
// превращает «09:00» во время и «0509998877» в число, а у защиты «только
// предупреждение» нельзя менять редакторов.
import { test, assert } from './helpers/harness.mjs';
import { loadGasContext } from './helpers/load-gas.mjs';
import { makeFakeSheet } from './helpers/gas-fakes.mjs';

const ctx = loadGasContext(['Utils.gs', 'Config.gs', 'Sheets.gs'], {
  Session: { getScriptTimeZone: () => 'Asia/Jerusalem', getEffectiveUser: () => ({ getEmail: () => 'alex@adfix.co.il' }) }
});

test('живой прогон: телефон из одних цифр с ведущим нулём пишется текстом (апостроф), ноль не теряется', () => {
  assert.equal(ctx.sheetSafeValue_('0509998877'), "'0509998877");
  assert.equal(ctx.sheetSafeValue_('050 999 88 77'), "'050 999 88 77");
  assert.equal(ctx.sheetSafeValue_('0'), '0', 'одиночный ноль не трогаем');
  assert.equal(ctx.sheetSafeValue_('Иван'), 'Иван');
  assert.equal(ctx.sheetSafeValue_('+972501234567'), "'+972501234567", 'прежняя защита «+» на месте');
});

test('живой прогон: «09:00», превращённое таблицей во время, читается обратно как «09:00»', () => {
  const nineIdt = new Date('2026-09-23T06:00:00Z'); // 09:00 в Asia/Jerusalem (UTC+3)
  assert.equal(ctx.settingsCellToString_(nineIdt), '09:00');
  assert.equal(ctx.settingsCellToString_("'09:00"), '09:00', 'ведущий апостроф снимается');
  assert.equal(ctx.settingsCellToString_(30), '30');
  assert.equal(ctx.settingsCellToString_(null), '');
});

test('живой прогон: рабочие часы из «Настроек» с ячейками-временем дают правильный календарь', () => {
  const rows = [
    ['Параметр', 'Значение'],
    ['business_start', new Date('2026-09-23T06:00:00Z')],
    ['business_end', new Date('2026-09-23T15:00:00Z')],
    ['business_days', "'0,1,2,3,4"]
  ];
  const raw = ctx.parseSettingsRows_(rows);
  assert.equal(raw.business_start, '09:00');
  assert.equal(raw.business_end, '18:00');
  assert.equal(raw.business_days, '0,1,2,3,4');
});

test('установка на боевой таблице: скрипт не убирает себя и владельца из редакторов защиты («Вы не можете удалить себя…»)', () => {
  // Настоящая защита: в редакторах уже есть запускающий (alex@adfix.co.il) и владелец
  // таблицы; убрать себя Google не даёт, владельца — тоже.
  let editors = ['alex@adfix.co.il', 'owner@gmail.com', 'stranger@example.com'];
  const user = (e) => ({ getEmail: () => e });
  const prot = {
    isWarningOnly: () => false,
    getEditors: () => editors.map(user),
    addEditors: (list) => { list.forEach((e) => { if (!editors.includes(e)) editors.push(e); }); },
    removeEditors: () => { throw new Error('Вы не можете удалить себя из списка редакторов.'); },
    removeEditor: (u) => {
      const e = u.getEmail();
      if (e === 'alex@adfix.co.il') throw new Error('Вы не можете удалить себя из списка редакторов.');
      if (e === 'owner@gmail.com') throw new Error('Cannot remove the owner.');
      editors = editors.filter((x) => x !== e);
    }
  };
  assert.doesNotThrow(() => ctx.resetEditorsTo_(prot, ['alex@adfix.co.il']));
  assert.ok(editors.includes('alex@adfix.co.il'), 'запускающий остаётся редактором');
  assert.ok(!editors.includes('stranger@example.com'), 'посторонний убран');
});

test('установка на боевой таблице: «Сегодня» НОВЫЕ не берёт пустые строки (#REF!), блоки ограничены, повторный setupCrm обновляет формулы', () => {
  const src = ctx.ensureTodayFormulas_.toString();
  assert.match(src, /' <> \\'\\''/, 'условие «№ не пуст» в блоке НОВЫЕ');
  assert.equal((src.match(/limit ' \+ TODAY_BLOCK_CAPACITY_/g) || []).length, 3, 'limit во всех трёх блоках');
  const cells = {};
  const today = {
    getRange: (r, c) => ({
      getValue: () => (r === 1 && c === 1 ? 'Сегодня: 0 просрочки · 0 новых · 0 консультация(й)' : ''),
      setFormula: (f) => { cells[r + ':' + c] = f; }
    })
  };
  const headers = ['№', 'Статус', 'Получена', 'Имя', 'Телефон', 'Связаться', 'Email', 'Ответственный',
    'Первая попытка', 'Попыток дозвона', 'Следующий шаг', 'Консультация', 'Причина закрытия', 'Комментарий'];
  const requests = {
    getSheetId: () => 123,
    getLastColumn: () => headers.length,
    getRange: () => ({ getValues: () => [headers] })
  };
  ctx.ensureTodayFormulas_(today, requests);
  const newCell = cells[(ctx.TODAY_HEADER_ROW_NEW_ + 2) + ':1'];
  assert.ok(newCell, 'повторный вызов переписал формулу блока НОВЫЕ');
  assert.match(newCell, /Col1 <> ''/);
  assert.match(newCell, /limit 200/);
});

test('живой прогон: setupCrm пишет значения «Настроек» текстом (апостроф), заголовок и пустые — без изменений', () => {
  const sheet = makeFakeSheet('Настройки');
  ctx.ensureSettingsSheet_(sheet);
  const values = sheet.getDataRange().getValues();
  assert.deepEqual(values[0].slice(0, 2), ['Параметр', 'Значение']);
  const byKey = {};
  values.slice(1).forEach((r) => { byKey[r[0]] = r[1]; });
  assert.equal(byKey.business_start, "'09:00");
  assert.equal(byKey.business_days, "'0,1,2,3,4");
  assert.equal(byKey.albato_editor_email, '', 'пустое значение без апострофа');
});
