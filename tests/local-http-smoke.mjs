import assert from 'node:assert/strict';

const base = new URL(process.env.MOONMIND_TEST_URL || 'http://127.0.0.1:5173');
assert.ok(['localhost', '127.0.0.1'].includes(base.hostname));
const name = `__LOCAL_CHECK_${crypto.randomUUID().slice(0, 8)}`;
function client() {
  const cookies = new Map();
  return async (route, method = 'GET', body, headers = {}) => {
    const response = await fetch(new URL(route, base), { redirect: 'manual', method, headers: { cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; '), ...(method === 'GET' ? {} : { origin: base.origin, 'Content-Type': 'application/json' }), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    for (const value of response.headers.getSetCookie()) { const pair = value.split(';')[0]; const split = pair.indexOf('='); cookies.set(pair.slice(0, split), pair.slice(split + 1)); }
    return { status: response.status, body: response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text() };
  };
}
const owner = client(); const alice = client(); const bob = client();
const initial = await alice('/api/session');
assert.equal(initial.status, 200); assert.equal(initial.body.localMode, true); assert.equal(initial.body.mode, 'demo'); assert.equal(initial.body.isAdmin, false);
assert.equal((await alice('/api/session', 'GET', undefined, { 'oai-authenticated-user-id': 'local_seedy', 'oai-authenticated-user-email': 'seedy@sites.test' })).body.isAdmin, false);
assert.equal((await alice('/signin-with-chatgpt', 'GET', undefined, { origin: 'https://evil.test' })).status, 403);
await bob('/api/session');
const registration = { name, consent: true, consentAdmin: true };
const a = await alice('/api/session', 'POST', registration); const b = await bob('/api/session', 'POST', registration);
assert.equal(a.status, 200); assert.equal(b.status, 200); assert.notEqual(a.body.user.id, b.body.user.id);
const targets = [a.body.user.id, b.body.user.id];
assert.equal((await owner('/signin-with-chatgpt?return_to=/')).status, 302);
const session = (await owner('/api/session')).body; assert.equal(session.isAdmin, true); assert.equal(session.localMode, true); assert.equal(session.mode, 'demo');
try {
  assert.equal((await alice('/api/messages')).body.messages.length, 1); // Initial tarot invitation remains.
  const text = 'Synthetic local message for isolation';
  assert.equal((await alice('/api/messages', 'POST', { content: text, requestId: crypto.randomUUID() })).status, 200);
  const before = (await alice('/api/messages')).body.messages;
  assert.equal(before.some(message => message.content === text), true);
  assert.equal((await bob('/api/messages')).body.messages.some(message => message.content === text), false);
  await alice('/api/session', 'DELETE');
  assert.equal((await alice('/api/session', 'POST', registration)).body.user.id, a.body.user.id);
  assert.deepEqual((await alice('/api/messages')).body.messages, before);
  assert.equal((await alice('/api/admin/users')).status, 401);
  assert.equal((await owner('/api/admin/ai-settings')).body.ready, false);
  assert.equal((await owner('/api/admin/ai-settings', 'POST', {})).status, 403);
  const deleted = await owner('/api/admin/users', 'DELETE', { userId: a.body.user.id, confirmName: name, confirmed: true });
  assert.equal(deleted.status, 200);
  assert.equal((await owner(`/api/admin/messages?userId=${encodeURIComponent(a.body.user.id)}`)).status, 404);
  assert.equal((await alice('/api/session')).body.user, null);
  assert.equal((await bob('/api/messages')).body.messages.length, 1);
  targets.shift();
} finally {
  for (const userId of targets) await owner('/api/admin/users', 'DELETE', { userId, confirmName: name, confirmed: true });
}
console.log('Local HTTP check passed: guest nickname restore/isolation, tarot, simulated owner, header spoof/cross-origin rejection, disabled external AI, admin deletion. Only generated synthetic profiles were removed.');
