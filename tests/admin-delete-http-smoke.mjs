import assert from 'node:assert/strict';

const base = new URL(process.env.MOONMIND_TEST_URL || 'http://127.0.0.1:5173');
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname), 'Synthetic local records only');
const name = '__MOONMIND_DELETE_SMOKE__';
async function client() {
  const cookies = new Map();
  return async (path, method = 'GET', body) => {
    const response = await fetch(new URL(path, base), {
      redirect: 'manual', method,
      headers: { cookie: [...cookies].map(([key,value]) => `${key}=${value}`).join('; '), ...(method === 'GET' ? {} : { origin: base.origin, 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    for (const value of response.headers.getSetCookie()) {
      const pair = value.split(';')[0]; const split = pair.indexOf('=');
      cookies.set(pair.slice(0, split), pair.slice(split + 1));
    }
    return { status: response.status, body: response.headers.get('content-type')?.includes('application/json') ? await response.json() : null };
  };
}
const [alice, bob, admin] = await Promise.all([client(), client(), client()]);
await alice('/api/session'); await bob('/api/session');
const registration = { name, consent: true, consentAdmin: true };
const a = await alice('/api/session', 'POST', registration);
const b = await bob('/api/session', 'POST', registration);
assert.equal(a.status, 200); assert.equal(b.status, 200);
assert.notEqual(a.body.user.id, b.body.user.id);
assert.equal((await alice('/api/messages', 'POST', { content: 'Synthetic test message', requestId: crypto.randomUUID() })).status, 200);
const before = (await bob('/api/messages')).body.messages;
const confirmation = { userId: a.body.user.id, confirmName: name, confirmed: true };
assert.equal((await alice('/api/admin/users', 'DELETE', confirmation)).status, 401);
await admin('/signin-with-chatgpt?return_to=/admin');
assert.equal((await admin('/api/session')).body.isAdmin, true);
const listed = (await admin('/api/admin/users')).body.users;
assert.equal(listed.find(user => user.id === confirmation.userId).canDelete, true);
assert.equal((await admin('/api/admin/users', 'DELETE', { ...confirmation, confirmName: 'Incorrect Name' })).status, 409);
const deleted = await admin('/api/admin/users', 'DELETE', confirmation);
assert.equal(deleted.status, 200); assert.deepEqual(deleted.body, { deletedUserId: confirmation.userId });
assert.equal((await admin('/api/admin/users')).body.users.some(user => user.id === confirmation.userId), false);
assert.equal((await admin('/api/admin/messages?userId=' + encodeURIComponent(confirmation.userId))).status, 404);
assert.equal((await alice('/api/session')).body.user, null);
assert.equal((await alice('/api/messages')).status, 409);
assert.deepEqual((await bob('/api/messages')).body.messages, before);
assert.equal((await alice('/api/session', 'POST', registration)).status, 200);
const fresh = (await alice('/api/messages')).body.messages;
assert.equal(fresh.length, 1);
assert.notEqual(fresh[0].id, before[0].id);
assert.equal(fresh.some(message => message.content.includes('Synthetic test message')), false);
for (const userId of [a.body.user.id, b.body.user.id]) {
  assert.equal((await admin('/api/admin/users', 'DELETE', { ...confirmation, userId })).status, 200);
}
console.log('Admin DELETE HTTP passed: authenticated local owner, guest rejection, duplicate-name isolation, exact name confirmation, permanent profile/history removal, fresh re-entry. Only owned synthetic local profiles deleted.');
