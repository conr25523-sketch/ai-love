import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { encryptAPIKey, decryptAPIKey, handleAISettings, resolveProviderSettings } from '../lib/ai-settings.ts';

// Synthetic fixtures, never a real OpenAI credential. No live API traffic.
const fakeKey = 'sk-moonmind_fake_fixture_not_a_real_api_credential';
const owner = { userId: 'owner', email: 'owner@example.test' };
const model = 'gpt-5.6-terra';
function harness() {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of readdirSync(new URL('../drizzle/', import.meta.url)).filter(file => file.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL(`../drizzle/${file}`, import.meta.url), 'utf8'));
  const db = { prepare(sql) { const stmt = (values = []) => ({ bind(...bound) { return stmt(bound); }, async first() { return sqlite.prepare(sql).get(...values) ?? null; }, async run() { return sqlite.prepare(sql).run(...values); } }); return stmt(); } };
  const settings = { DB: db, AI_SETTINGS_ENCRYPTION_KEY: randomBytes(32).toString('hex') };
  let fetchCalls = 0;
  const success = async (_url, init) => { fetchCalls++; assert.equal(init.headers.Authorization, `Bearer ${fakeKey}`); const sent = JSON.parse(init.body); assert.equal(sent.store, false); assert.equal(sent.input, 'Reply with only OK.'); return Response.json({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'OK' }] }] }); };
  const request = (data, identity = owner, options = {}) => handleAISettings(new Request('https://moonmind.test/api/admin/ai-settings', { method: data === undefined ? 'GET' : 'POST', headers: data === undefined ? {} : { origin: options.origin ?? 'https://moonmind.test', 'content-type': 'application/json', ...options.headers }, ...(data === undefined ? {} : { body: options.raw ?? JSON.stringify(data) }) }), settings, identity, ['owner'], options.fetch ?? success);
  return { request, settings, sqlite, calls: () => fetchCalls };
}

test('anonymous and non-owner users cannot read settings or submit credentials', async () => {
  const h = harness();
  for (const [identity, status] of [[null, 401], [{ userId: 'visitor', email: 'owner@example.test' }, 403]]) {
    assert.equal((await h.request(undefined, identity)).status, status);
    assert.equal((await h.request({ apiKey: fakeKey, model }, identity)).status, status);
  }
  assert.equal(h.calls(), 0);
  assert.equal(h.sqlite.prepare('SELECT count(*) AS n FROM ai_settings').get().n, 0);
});

test('cross-origin and oversized/invalid input is rejected before external traffic', async () => {
  const h = harness();
  for (const options of [{ origin: 'https://evil.test' }, { headers: { 'sec-fetch-site': 'cross-site' } }, { raw: 'x'.repeat(4097) }]) assert.ok((await h.request({ apiKey: fakeKey, model }, owner, options)).status >= 400);
  for (const data of [{ apiKey: 'bad', model }, { apiKey: fakeKey, model: '../bad' }, { apiKey: fakeKey, model: '' }]) assert.equal((await h.request(data)).status, 400);
  assert.equal(h.calls(), 0);
});

test('verified credential is encrypted at rest, never returned, and used by server provider', async () => {
  const h = harness();
  const saved = await h.request({ apiKey: fakeKey, model });
  assert.equal(saved.status, 200);
  assert.ok(!(await saved.text()).includes(fakeKey));
  const row = h.sqlite.prepare('SELECT * FROM ai_settings').get();
  assert.ok(row.encrypted_key.startsWith('v1.'));
  assert.ok(!JSON.stringify(row).includes(fakeKey));
  assert.deepEqual(await resolveProviderSettings(h.settings), { apiKey: fakeKey, model });
  const status = await (await h.request()).json();
  assert.equal(status.configured, true);
  assert.equal(status.model, model);
  assert.ok(!JSON.stringify(status).includes(fakeKey));
  assert.deepEqual(Object.keys(status).sort(), ['configured', 'model', 'ready', 'updatedAt']);
});

test('provider failure leaves existing working settings unchanged and cannot reflect raw errors', async () => {
  const h = harness(); await h.request({ apiKey: fakeKey, model });
  const before = h.sqlite.prepare('SELECT * FROM ai_settings').get();
  for (const status of [401, 403, 404, 429, 500]) {
    const response = await h.request({ apiKey: fakeKey, model: 'new-model' }, owner, { fetch: async () => Response.json({ error: { message: fakeKey } }, { status }) });
    assert.equal(response.status, 422); assert.ok(!(await response.text()).includes(fakeKey));
    assert.deepEqual(h.sqlite.prepare('SELECT * FROM ai_settings').get(), before);
  }
  const failed = await h.request({ apiKey: fakeKey, model }, owner, { fetch: async () => { throw new Error(fakeKey); } });
  assert.equal(failed.status, 502); assert.ok(!(await failed.text()).includes(fakeKey));
});

test('credential authentication detects wrong master keys and tampered ciphertext', async () => {
  const secret = randomBytes(32).toString('hex');
  const one = await encryptAPIKey(fakeKey, secret); const two = await encryptAPIKey(fakeKey, secret);
  assert.notEqual(one, two); assert.equal(await decryptAPIKey(one, secret), fakeKey);
  await assert.rejects(decryptAPIKey(one, randomBytes(32).toString('hex')));
  const parts = one.split('.'); const bytes = Buffer.from(parts[2], 'base64'); bytes[0] ^= 1; parts[2] = bytes.toString('base64');
  await assert.rejects(decryptAPIKey(parts.join('.'), secret));
});

test('missing encryption binding prevents saving before calling OpenAI; hosted env fallback works', async () => {
  const h = harness(); delete h.settings.AI_SETTINGS_ENCRYPTION_KEY;
  assert.equal((await h.request({ apiKey: fakeKey, model })).status, 503); assert.equal(h.calls(), 0);
  assert.deepEqual(await resolveProviderSettings({ ...h.settings, OPENAI_API_KEY: fakeKey, OPENAI_MODEL: model }), { apiKey: fakeKey, model });
});

test('incomplete model test cannot falsely activate AI', async () => {
  const h = harness();
  const response = await h.request({ apiKey: fakeKey, model }, owner, { fetch: async () => Response.json({ status: 'incomplete', output: [] }) });
  assert.equal(response.status, 502); assert.equal(h.sqlite.prepare('SELECT count(*) AS n FROM ai_settings').get().n, 0);
});
