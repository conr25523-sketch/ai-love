import assert from 'node:assert/strict';

const base = new URL(process.env.MOONMIND_TEST_URL || 'http://127.0.0.1:5173');
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname), 'Local synthetic records only');
const name = '__MOONMIND_GUEST_SMOKE__';
async function visitor() {
  const response = await fetch(new URL('/api/session', base));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.authenticated, false);
  assert.equal(data.isAdmin, false);
  assert.equal(data.user, null);
  assert.equal(data.mode, 'demo');
  const cookies = new Map();
  const remember = response => {
    for (const value of response.headers.getSetCookie()) {
      const pair = value.split(';')[0]; const split = pair.indexOf('=');
      cookies.set(pair.slice(0, split), pair.slice(split + 1));
    }
  };
  remember(response);
  assert.ok(cookies.has('moonmind_visitor'));
  return async (path, method = 'GET', body) => {
    const result = await fetch(new URL(path, base), {
      method, headers: { cookie: [...cookies].map(([name,value]) => `${name}=${value}`).join('; '), ...(method === 'GET' ? {} : { origin: base.origin, 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    remember(result);
    return { status: result.status, body: await result.json() };
  };
}
const [alice, bob] = await Promise.all([visitor(), visitor()]);
const register = { name, consent: true, consentAdmin: true };
const a = await alice('/api/session', 'POST', register);
const b = await bob('/api/session', 'POST', register);
assert.equal(a.status, 200); assert.equal(b.status, 200);
assert.notEqual(a.body.user.id, b.body.user.id);
const sent = await alice('/api/messages', 'POST', { content: 'สวัสดี', requestId: crypto.randomUUID() });
assert.equal(sent.status, 200);
assert.equal(sent.body.messages.length, 2);
assert.ok(!sent.body.messages[1].content.includes('โหมดทดลอง'));
const beforeLogout = (await alice('/api/messages')).body.messages;
assert.equal(beforeLogout.length, 3);
assert.equal((await bob('/api/messages?name=' + name + '&userId=' + a.body.user.id)).body.messages.length, 1);
assert.equal((await alice('/api/session', 'DELETE')).status, 200);
assert.equal((await alice('/api/session')).body.user, null);
assert.equal((await alice('/api/messages')).status, 401);
assert.equal((await alice('/api/messages', 'POST', { content: 'must not save while logged out', requestId: crypto.randomUUID() })).status, 401);
const returned = await alice('/api/session', 'POST', register);
assert.equal(returned.body.user.id, a.body.user.id);
assert.deepEqual((await alice('/api/messages')).body.messages, beforeLogout);
assert.equal((await alice('/api/session', 'DELETE')).status, 200);
const otherName = await alice('/api/session', 'POST', { ...register, name: '__MOONMIND_GUEST_SMOKE_OTHER__' });
assert.notEqual(otherName.body.user.id, a.body.user.id);
assert.equal((await alice('/api/messages')).body.messages.length, 1);
assert.equal((await alice('/api/session', 'DELETE')).status, 200);
assert.equal((await alice('/api/session', 'POST', register)).body.user.id, a.body.user.id);
assert.deepEqual((await alice('/api/messages')).body.messages, beforeLogout);
assert.equal((await alice('/api/admin/users')).status, 401);
assert.equal((await alice('/api/admin/messages?userId=' + a.body.user.id)).status, 401);
const signIn = await fetch(new URL('/signin-with-chatgpt?return_to=/admin', base), { redirect: 'manual' });
const adminCookie = signIn.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
const adminUsers = await (await fetch(new URL('/api/admin/users', base), { headers: { cookie: adminCookie } })).json();
assert.ok(adminUsers.users.some(user => user.id === a.body.user.id));
assert.equal((await alice('/api/session', 'PATCH', { consentAdmin: false })).status, 200);
assert.equal((await fetch(new URL('/api/admin/messages?userId=' + a.body.user.id, base), { headers: { cookie: adminCookie } })).status, 404);
for (const call of [alice, bob]) {
  assert.equal((await call('/api/messages', 'DELETE', {})).status, 200);
}
console.log('Guest HTTP passed: logout blocks chat, same-name re-entry restores full history, another nickname has separate history, same-name isolation across browsers, owner-only admin and consent revocation.');
