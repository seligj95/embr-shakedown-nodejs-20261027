import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const destination = process.env.DESTINATION_DIR;
if (!destination) throw new Error('DESTINATION_DIR is required for the campaign build.');
mkdirSync(destination, { recursive: true });
for (const name of ['server.mjs', 'package.json', 'package-lock.json']) {
  copyFileSync(new URL(name, import.meta.url), resolve(destination, name));
}
writeFileSync(resolve(destination, 'build-marker.txt'), process.env.SAMPLE_BUILD_MARKER || 'UNSET');
