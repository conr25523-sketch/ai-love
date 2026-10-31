import test from 'node:test';
import assert from 'node:assert/strict';
import { createPagesBridge, PAGES_ORIGIN, SESSION_HEADER } from '../lib/pages-bridge.mjs';
import { resolveVisitorSession, selectedVisitorId, signInVisitor, logoutVisitor, visitorIsSignedOut } from '../lib/visitor-session.ts';

const request = (resource = 'session', options = {}) => new Request(`https://backend.test/api/pages?resource=${resource}`, { ...options, headers: { origin: PAGES_ORIGIN, ...options.headers } });

test('bridge allows only the Pages origin and never forwards browser/admin identities', async () => {
  let calls = 0;
  const bridge = createPagesBridge(async (operation, req) => {
    calls++;
    assert.equal(operation, 'sessionGet');
    assert.equal(req.headers.get('oai-authenticated-user-id'), null);
    assert.equal(req.headers.get('cookie'), '');
    assert.equal(req.headers.get('origin'), 'https://backend.test');
    return Response.json({ isAdmin: false });
  });
  assert.equal((await bridge(request('session', { headers: { origin: 'https://evil.test' } }))).status, 403);
  assert.equal((await bridge(request('admin/users'))).status, 405);
  const response = await bridge(request('session', { headers: { 'oai-authenticated-user-id': 'owner', cookie: 'hosted=secret' } }));
  assert.equal(response.status, 200);
  assert.equal(calls, 1);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), PAGES_ORIGIN);
});

test('preflight permits guest methods without running backend or requiring cookies', async () => {
  const bridge = createPagesBridge(() => { throw new Error('must not run'); });
  const response = await bridge(request('session', { method: 'OPTIONS' }));
  assert.equal(response.status, 204);
  assert.match(response.headers.get('Access-Control-Allow-Headers'), /X-Moonmind-Session/);
  assert.equal(response.headers.get('Access-Control-Allow-Credentials'), null);
});

test('malformed or injected session headers fail before backend access', async () => {
  const bridge = createPagesBridge(() => { throw new Error('must not run'); });
  for (const value of ['null', '[]', '{', JSON.stringify({ admin: '1' }), JSON.stringify({ moonmind_visitor: 'x; admin=1' })]) {
    assert.equal((await bridge(request('session', { headers: { [SESSION_HEADER]: value } }))).status, 400);
  }
});

test('guest secret, nickname selection, logout and return survive without third-party cookies', async () => {
  const bridge = createPagesBridge(async (operation, req) => {
    if (operation === 'sessionDelete') return logoutVisitor(req);
    const visitor = await resolveVisitorSession(req);
    const response = Response.json({ signedOut: visitorIsSignedOut(req), id: await selectedVisitorId(req, visitor.userId) });
    if (visitor.setCookie) response.headers.append('Set-Cookie', visitor.setCookie);
    if (operation === 'sessionPost') {
      const { name } = await req.json();
      const entry = await signInVisitor(req, visitor.userId, name, null);
      for (const cookie of entry.cookies) response.headers.append('Set-Cookie', cookie);
    }
    return response;
  });
  let token;
  const call = async (method = 'GET', name) => {
    const response = await bridge(request('session', { method, headers: { ...(token ? { [SESSION_HEADER]: token } : {}), 'content-type': 'application/json' }, ...(name ? { body: JSON.stringify({ name }) } : {}) }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Set-Cookie'), null);
    token = response.headers.get(SESSION_HEADER);
    return response.json();
  };
  await call();
  await call('POST', 'alice');
  const alice = await call();
  await call('DELETE');
  assert.equal((await call()).signedOut, true);
  await call('POST', 'bob');
  const bob = await call();
  assert.notEqual(bob.id, alice.id);
  await call('POST', 'alice');
  const resumed = await call();
  assert.equal(resumed.id, alice.id);
  assert.equal(resumed.signedOut, false);
});
