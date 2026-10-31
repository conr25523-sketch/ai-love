import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { allowLocalRequest, localEnvironment, localWorkerConfig, parseLocalArgs, prepareLocalRuntime } from '../scripts/local-config.mjs';
import { localRuntimeEnabled } from '../lib/local-runtime.ts';

test('local CLI refuses externally exposed hosts and invalid ports', () => {
  assert.deepEqual(parseLocalArgs([]), { port: 5173, check: false });
  assert.deepEqual(parseLocalArgs(['--port', '5317', '--check']), { port: 5317, check: true });
  for (const args of [['--host', '0.0.0.0'], ['--remote'], ['--port', '80'], ['--port', '65536'], ['--port', 'NaN']]) assert.throws(() => parseLocalArgs(args));
});

test('local requests require loopback socket, loopback authority and same origin', () => {
  const good = { host: '127.0.0.1:5173', remoteAddress: '127.0.0.1', url: '/api/session', origin: 'http://127.0.0.1:5173' };
  assert.equal(allowLocalRequest(good), true);
  assert.equal(allowLocalRequest({ ...good, origin: undefined }), true);
  for (const bad of [{ host: 'attacker.example:5173' }, { remoteAddress: '192.168.1.2' }, { url: 'https://evil.test/api/session' }, { origin: 'https://evil.test' }, { fetchSite: 'cross-site' }, { host: '127.0.0.1@evil.test' }]) assert.equal(allowLocalRequest({ ...good, ...bad }), false);
});

test('isolated runtime never rewrites original preview state or changed configuration', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'moonmind-local-test-'));
  mkdirSync(path.join(root, '.wrangler'));
  writeFileSync(path.join(root, '.wrangler', 'keep.txt'), 'original state');
  writeFileSync(path.join(root, '.dev.vars'), 'SENTINEL=untouched');
  const first = prepareLocalRuntime(root);
  assert.equal(first.config, prepareLocalRuntime(root).config);
  assert.equal(readFileSync(path.join(root, '.dev.vars'), 'utf8'), 'SENTINEL=untouched');
  assert.equal(readFileSync(path.join(root, '.wrangler', 'keep.txt'), 'utf8'), 'original state');
  assert.deepEqual(JSON.parse(readFileSync(first.config, 'utf8')), localWorkerConfig());
  writeFileSync(first.config, 'custom configuration');
  assert.throws(() => prepareLocalRuntime(root));
  assert.equal(readFileSync(first.config, 'utf8'), 'custom configuration');
});

test('local config and child environment cannot inherit external AI credentials', () => {
  const config = localWorkerConfig();
  assert.equal(config.vars.OPENAI_API_KEY, '');
  assert.equal(config.vars.OPENAI_MODEL, '');
  assert.equal(config.vars.ADMIN_USER_IDS, 'local_seedy');
  const result = localEnvironment({ PATH: 'keep', OPENAI_API_KEY: 'not-a-key-fixture', ADMIN_USER_IDS: 'public-user', CLOUDFLARE_API_TOKEN: 'fixture', CLOUDFLARE_INCLUDE_PROCESS_ENV: 'true' });
  assert.equal(result.PATH, 'keep');
  assert.equal('OPENAI_API_KEY' in result, false);
  assert.equal('ADMIN_USER_IDS' in result, false);
  assert.equal('CLOUDFLARE_API_TOKEN' in result, false);
  assert.equal(result.CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV, 'false');
  assert.equal(result.CLOUDFLARE_INCLUDE_PROCESS_ENV, 'false');
});

test('local owner marker cannot enable a production or remote request', () => {
  const request = new Request('http://127.0.0.1:5173/api/session');
  assert.equal(localRuntimeEnabled(request, '1', true), true);
  assert.equal(localRuntimeEnabled(request, '1', false), false);
  assert.equal(localRuntimeEnabled(request, undefined, true), false);
  assert.equal(localRuntimeEnabled(new Request('https://public.example/api/session'), '1', true), false);
});
