import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { get } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';

const root = new URL('./', import.meta.url);
const expectedBuilder = `components:
  - name: web
    role: web
    platform: nodejs
    platformVersion: "24"
    build: node build.mjs
    run:
      start: node server.mjs
      healthCheckPath: /health
`;

test('root manifests preserve the Node.js 24 startup contract with single-component defaults', async () => {
  const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  const lock = JSON.parse(await readFile(new URL('package-lock.json', root), 'utf8'));
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.type, 'module');
  assert.deepEqual(packageJson.engines, { node: '24.x' });
  assert.equal(packageJson.scripts.start, 'node server.mjs');
  for (const key of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    assert.deepEqual(packageJson[key] ?? {}, {});
  }
  assert.equal(lock.lockfileVersion, 3);
  assert.equal(lock.name, packageJson.name);
  assert.equal(lock.version, packageJson.version);
  assert.deepEqual(lock.packages, {
    '': {
      name: packageJson.name,
      version: packageJson.version,
      engines: packageJson.engines,
    },
  });
  assert.equal(await readFile(new URL('builder.yaml', root), 'utf8'), expectedBuilder);
});

// Assert the app's default binding, but use an OS-assigned port only in tests.
const testStartup = `
import assert from 'node:assert/strict';
import { Server } from 'node:http';
const listen = Server.prototype.listen;
Server.prototype.listen = function (port, host) {
  assert.equal(port, 8080);
  assert.equal(host, '0.0.0.0');
  this.once('listening', () => process.send(this.address().port));
  return listen.call(this, 0, host);
};
await import('./server.mjs');
`;

function request(port, path) {
  return new Promise((resolve, reject) => {
    const req = get(`http://127.0.0.1:${port}${path}`, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('error', reject);
      response.on('end', () => resolve({
        status: response.statusCode,
        type: response.headers['content-type'],
        body,
      }));
    });
    req.on('error', reject);
    req.setTimeout(1000, () => req.destroy(new Error(`Timed out requesting ${path}`)));
  });
}

async function waitForServer(child, port, getStderr) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    assert.equal(child.exitCode, null, `Server exited: ${getStderr()}`);
    try {
      await request(port, '/health');
      return;
    } catch (error) {
      if (error.code !== 'ECONNREFUSED') throw error;
      await delay(100);
    }
  }
  throw new Error(`Server did not become ready: ${getStderr()}`);
}

test('HTTP routes and public greeting work with no external services', { timeout: 30000 }, async (t) => {
  for (const greeting of [undefined, 'Welcome', '']) {
    await t.test(`SAMPLE_GREETING=${greeting === undefined ? '(unset)' : JSON.stringify(greeting)}`, async () => {
      const env = { ...process.env };
      delete env.SAMPLE_GREETING;
      if (greeting !== undefined) env.SAMPLE_GREETING = greeting;
      const child = spawn(process.execPath, ['--input-type=module', '--eval', testStartup], {
        cwd: root,
        env,
        stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
      });
      let stderr = '';
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      const exited = once(child, 'exit');
      try {
        const port = await Promise.race([
          once(child, 'message').then(([port]) => port),
          exited.then(([code, signal]) => {
            throw new Error(`Server exited before listening (${code ?? signal}): ${stderr}`);
          }),
          delay(5000, undefined, { ref: false }).then(() => {
            throw new Error(`Server did not start listening: ${stderr}`);
          }),
        ]);
        assert.equal(Number.isInteger(port) && port > 0 && port <= 65535, true);
        await waitForServer(child, port, () => stderr);
        assert.deepEqual(await request(port, '/'), {
          status: 200,
          type: 'text/plain; charset=utf-8',
          body: `App Service Builder / nodejs-web: ${greeting || 'Hello'} [code=B]\n`,
        });
        assert.deepEqual(await request(port, '/health'), {
          status: 200,
          type: 'text/plain; charset=utf-8',
          body: 'OK\n',
        });
        assert.deepEqual(await request(port, '/not-found'), {
          status: 404,
          type: 'text/plain; charset=utf-8',
          body: 'Not found\n',
        });
      } finally {
        if (child.exitCode === null) child.kill('SIGTERM');
        await exited;
      }
    });
  }
});
