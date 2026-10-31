import assert from 'node:assert/strict';

const base = new URL(process.env.MOONMIND_TEST_URL || 'http://127.0.0.1:5173');
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname), 'Smoke test is restricted to local preview');
const testName = '__MOONMIND_HTTP_SMOKE__';
const page = await fetch(base);
assert.equal(page.status, 200);
const html = await page.text();
assert.ok(html.includes('ม่านใจ') && html.includes('ดูดวงเรื่องใจ'), 'Thai landing page renders');
const cssPath = html.match(/href="([^"\s]+\.css(?:\?[^"\s]*)?)"/);
if (cssPath) assert.equal((await fetch(new URL(cssPath[1], base))).status, 200);
const anonymous = await fetch(new URL('/api/session', base));
assert.equal(anonymous.status, 200);
assert.equal((await anonymous.json()).authenticated, false);
const signIn = await fetch(new URL('/signin-with-chatgpt?return_to=/', base), { redirect: 'manual' });
assert.ok([302, 303, 307].includes(signIn.status));
const cookie = signIn.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
assert.ok(cookie, 'Local mock auth cookie is issued');
const call = async (path, method = 'GET', body) => {
  const response = await fetch(new URL(path, base), {
    method, headers: { cookie, ...(body === undefined ? {} : { origin: base.origin, 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  return { status: response.status, body: result };
};
const initial = await call('/api/session');
assert.equal(initial.status, 200);
assert.ok(initial.body.user === null || initial.body.user.name === testName, 'Refusing to modify an existing local user profile');
assert.equal(initial.body.mode, 'demo', 'Smoke test never calls paid AI');
if (initial.body.user) assert.equal((await call('/api/messages', 'DELETE', {})).status, 200);
const profile = await call('/api/session', 'POST', { name: testName, consent: true, consentAdmin: true });
assert.equal(profile.status, 200);
assert.equal(profile.body.user.id, 'local_seedy');
assert.equal(profile.body.isAdmin, true);
assert.equal((await call('/api/messages', 'POST', { content: '37', number: 37, requestId: crypto.randomUUID() })).status, 400);
const payload = { content: 'สวัสดี', requestId: crypto.randomUUID() };
const first = await call('/api/messages', 'POST', payload);
assert.equal(first.status, 200);
assert.equal(first.body.messages.length, 2);
assert.ok(first.body.messages[1].content.includes(testName));
assert.ok(!first.body.messages[1].content.includes('โหมดทดลอง'));
assert.equal(first.body.mode, 'demo');
const retry = await call('/api/messages', 'POST', payload);
assert.deepEqual(retry.body, first.body);
assert.equal((await call('/api/messages')).body.messages.length, 2);
const follow = await call('/api/messages', 'POST', { content: 'ฉันเหนื่อยกับงานมาก', requestId: crypto.randomUUID() });
assert.equal(follow.status, 200);
assert.ok(follow.body.messages[1].content.includes('งาน'));
assert.equal((await call('/api/messages')).body.messages.length, 4);
assert.ok((await call('/api/admin/users')).body.users.some(user => user.id === 'local_seedy'));
assert.equal((await call('/api/admin/messages?userId=local_seedy')).body.messages.length, 4);
assert.equal((await call('/api/session', 'PATCH', { consentAdmin: false })).status, 200);
assert.equal((await call('/api/admin/messages?userId=local_seedy')).status, 404);
assert.equal((await call('/api/messages', 'DELETE', {})).status, 200);
assert.deepEqual((await call('/api/messages')).body.messages, []);
console.log('HTTP smoke passed: rendering, CSS, login, D1 persistence, continuation, idempotency, admin consent and deletion.');
console.log('Synthetic local profile may be removed using the documented name guard:', testName);
