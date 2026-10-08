import { mkdir, rm, writeFile } from 'node:fs/promises';
import { relative, resolve, isAbsolute } from 'node:path';
import { test } from '@playwright/test';
import { reviewRoot } from '../helpers/screenshots';

test('Подготовить каталог свежих снимков', async () => {
  const build = resolve(__dirname, '../../../build');
  const child = relative(build, reviewRoot);
  if (child !== 'visual-review' || isAbsolute(child)) throw new Error('Неверный каталог visual-review');
  await rm(reviewRoot, { recursive: true, force: true });
  await mkdir(resolve(reviewRoot, 'captures'), { recursive: true });
  await writeFile(resolve(reviewRoot, 'run.json'), JSON.stringify({ startedAt: new Date().toISOString(), platform: process.platform }));
});
