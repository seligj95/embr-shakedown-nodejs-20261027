import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, extname, resolve, sep } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), 'public');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

// Local host only; deployed static files are served by Builder, not this process.
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(`${root}${sep}`)) {
      response.writeHead(403).end('Forbidden\n');
      return;
    }
    const body = await readFile(file);
    response.writeHead(200, {
      'Content-Type': `${types[extname(file)] ?? 'text/plain'}; charset=utf-8`,
    }).end(body);
  } catch {
    response.writeHead(404).end('Not found\n');
  }
}).listen(8080, '0.0.0.0');
