import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, relative, extname, isAbsolute } from 'node:path';

const root = resolve('build/variants/final-dev4');
const port = Number(process.env.VISUAL_PORT || 4174);
const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

async function main() {
  await stat(resolve(root, 'index.html')).catch(() => {
    throw new Error('Нет build/variants/final-dev4/index.html. Запустите python -B scripts/build-hero-variants.py dev4');
  });
  createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method || '')) {
      response.writeHead(405).end('Static visual server: writes disabled');
      return;
    }
    try {
      const pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
      let file = resolve(root, `.${pathname}`);
      const child = relative(root, file);
      if (child.startsWith('..') || isAbsolute(child)) {
        response.writeHead(403).end();
        return;
      }
      if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
      const info = await stat(file);
      if (!info.isFile()) { response.writeHead(404).end(); return; }
      response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      if (request.method === 'HEAD') response.end();
      else createReadStream(file).on('error', () => response.destroy()).pipe(response);
    } catch {
      response.writeHead(404).end('Not found');
    }
  }).listen(port, '127.0.0.1', () => process.stdout.write(`final-dev4: http://127.0.0.1:${port}/\n`));
}
main().catch((error: Error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
