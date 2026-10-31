import test from 'node:test';
import assert from 'node:assert/strict';
import { VISITOR_COOKIE_NAME, VISITOR_COOKIE_MAX_AGE, resolveVisitorSession, logoutVisitor, visitorIsSignedOut, signInVisitor, selectedVisitorId } from '../lib/visitor-session.ts';

const request = (cookie, url = 'https://moonmind.test/api/session') => new Request(url, { headers: cookie === undefined ? {} : { cookie } });
const cookiePair = (session) => session.setCookie.split(';')[0];

test('logout suspends chat without expiring the browser identity and the same name resumes it', async () => {
  const initial = await resolveVisitorSession(request());
  const response = logoutVisitor(new Request('https://moonmind.test/api/session', { method: 'DELETE', headers: { origin: 'https://moonmind.test', cookie: cookiePair(initial) } }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { loggedOut: true });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const paused = response.headers.get('set-cookie');
  assert.match(paused, /^moonmind_guest_signed_out=1; Max-Age=15552000; Path=\/; HttpOnly; SameSite=Lax; Secure$/);
  const returning = request(`${cookiePair(initial)}; ${paused.split(';')[0]}`);
  assert.equal(visitorIsSignedOut(returning), true);
  assert.deepEqual(await resolveVisitorSession(returning, { allowCreate: false }), { userId: initial.userId });
  const entry = await signInVisitor(returning, initial.userId, 'Same Name', 'Same Name');
  assert.equal(entry.userId, initial.userId);
  const signedIn = request(`${cookiePair(initial)}; ${entry.cookies.map(value => value.split(';')[0]).join('; ')}`);
  assert.equal(visitorIsSignedOut(signedIn), false);
  assert.equal(await selectedVisitorId(signedIn, initial.userId), initial.userId);
});

test('nicknames can switch and return on one browser but cannot open another browser history', async () => {
  const browser = await resolveVisitorSession(request());
  const other = await resolveVisitorSession(request());
  const alice = await signInVisitor(request(), browser.userId, 'Alice', null);
  const bob = await signInVisitor(request(), browser.userId, 'Bob', null);
  assert.notEqual(alice.userId, bob.userId);
  assert.equal((await signInVisitor(request(), browser.userId, ' Alice ', null)).userId, alice.userId);
  assert.equal((await signInVisitor(request(), browser.userId, 'ＡＬＩＣＥ', null)).userId, alice.userId);
  assert.notEqual((await signInVisitor(request(), other.userId, 'Alice', null)).userId, alice.userId);
  const chosenCookie = alice.cookies[0].split(';')[0];
  assert.equal(await selectedVisitorId(request(chosenCookie), browser.userId), alice.userId);
  assert.notEqual(await selectedVisitorId(request(chosenCookie), other.userId), alice.userId);
  assert.equal(await selectedVisitorId(request('moonmind_guest_profile=guest:known-user'), browser.userId), browser.userId);
  assert.equal(alice.cookies.some(value => value.includes('Alice')), false);
});

test('existing legacy history stays with its own nickname while a new nickname gets another profile', async () => {
  const browser = await resolveVisitorSession(request());
  const old = await signInVisitor(request(), browser.userId, ' Old Name ', 'old name');
  const another = await signInVisitor(request(), browser.userId, 'New Name', 'old name');
  assert.equal(old.userId, browser.userId);
  assert.notEqual(another.userId, browser.userId);
  assert.equal((await signInVisitor(request(), browser.userId, 'Old Name', 'old name')).userId, browser.userId);
});

test('logout is idempotent without a cookie and supports HTTP local preview', async () => {
  for (const cookie of [undefined, 'moonmind_visitor=invalid']) {
    const response = logoutVisitor(new Request('http://localhost:5173/api/session', { method: 'DELETE', headers: { origin: 'http://localhost:5173', ...(cookie ? { cookie } : {}) } }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('set-cookie').includes('; Secure'), false);
  }
});

test('logout rejects unsafe methods, foreign/missing origins and cross-site requests without clearing cookies', () => {
  for (const [method, headers, status] of [
    ['GET', { origin: 'https://moonmind.test' }, 405],
    ['POST', { origin: 'https://moonmind.test' }, 405],
    ['DELETE', {}, 403],
    ['DELETE', { origin: 'https://evil.test' }, 403],
    ['DELETE', { origin: 'https://moonmind.test.evil.test' }, 403],
    ['DELETE', { origin: 'https://moonmind.test', 'sec-fetch-site': 'cross-site' }, 403],
  ]) {
    const response = logoutVisitor(new Request('https://moonmind.test/api/session', { method, headers }));
    assert.equal(response.status, status);
    assert.equal(response.headers.get('set-cookie'), null);
  }
});

test('new browsers receive independent cryptographically random opaque identities', async () => {
  const sessions = await Promise.all(Array.from({ length: 100 }, () => resolveVisitorSession(request())));
  assert.equal(new Set(sessions.map((session) => session.userId)).size, 100);
  assert.equal(new Set(sessions.map(cookiePair)).size, 100);
  for (const session of sessions) {
    assert.match(session.userId, /^guest:[a-f0-9]{64}$/);
    assert.match(cookiePair(session), /^moonmind_visitor=v1\.[A-Za-z0-9_-]{43}$/);
    assert.equal(session.setCookie.includes(session.userId), false);
  }
});

test('same cookie resolves to the same hashed identity across paths without refresh', async () => {
  const initial = await resolveVisitorSession(request());
  const pair = cookiePair(initial);
  const returning = await resolveVisitorSession(request(`theme=dark; ${pair}; unrelated=hello`));
  const anotherPath = await resolveVisitorSession(request(pair, 'https://moonmind.test/api/messages'));
  assert.deepEqual(returning, { userId: initial.userId });
  assert.deepEqual(anotherPath, returning);
  const token = pair.slice(pair.indexOf('=') + 1);
  const expected = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`moonmind:visitor:${token}`))).toString('hex');
  assert.equal(initial.userId, `guest:${expected}`);
});

test('malformed, injected, truncated, noncanonical and duplicate cookies are discarded', async () => {
  const original = await resolveVisitorSession(request());
  const pair = cookiePair(original);
  const malformed = [
    `${VISITOR_COOKIE_NAME}=`,
    VISITOR_COOKIE_NAME,
    `${VISITOR_COOKIE_NAME}=alice`,
    `${VISITOR_COOKIE_NAME}=guest:${'a'.repeat(64)}`,
    `${VISITOR_COOKIE_NAME}=v1.${'A'.repeat(42)}`,
    `${VISITOR_COOKIE_NAME}=v1.${'A'.repeat(44)}`,
    `${VISITOR_COOKIE_NAME}=v1.${'A'.repeat(42)}B`,
    `${VISITOR_COOKIE_NAME}=v1.${'A'.repeat(42)}%`,
    `${VISITOR_COOKIE_NAME}="${pair.split('=')[1]}"`,
    `${VISITOR_COOKIE_NAME}=${encodeURIComponent(pair.split('=')[1]).replace('.', '%2E')}`,
    `${pair}; ${pair}`,
    `${pair}; ${VISITOR_COOKIE_NAME}=invalid`,
    `${VISITOR_COOKIE_NAME}=invalid; ${pair}`,
    `${pair}; ${VISITOR_COOKIE_NAME}`,
    `${VISITOR_COOKIE_NAME}=${'A'.repeat(17000)}`,
  ];
  for (const cookie of malformed) {
    const session = await resolveVisitorSession(request(cookie));
    assert.ok(session.setCookie, `must replace: ${cookie.slice(0, 80)}`);
    assert.notEqual(session.userId, original.userId);
    assert.match(cookiePair(session), /^moonmind_visitor=v1\.[A-Za-z0-9_-]{43}$/);
  }
});

test('a guessed well-formed bearer token cannot select a known visitor identity', async () => {
  const original = await resolveVisitorSession(request());
  const guessed = await resolveVisitorSession(request(`${VISITOR_COOKIE_NAME}=v1.${'A'.repeat(43)}`));
  assert.notEqual(guessed.userId, original.userId);
  assert.match(guessed.userId, /^guest:[a-f0-9]{64}$/);
  // No name query, fake admin cookie, or supplied profile ID changes the token's identity.
  const polluted = await resolveVisitorSession(request(`${cookiePair(original)}; admin=true; userId=${guessed.userId}`, 'https://moonmind.test/api/session?name=admin&userId=alice'));
  assert.deepEqual(polluted, { userId: original.userId });
});

test('cookie has 180-day lifetime, HttpOnly, SameSite, root path and HTTPS Secure flag', async () => {
  assert.equal(VISITOR_COOKIE_MAX_AGE, 15552000);
  const https = await resolveVisitorSession(request());
  assert.ok(https.setCookie.includes('; Max-Age=15552000; Path=/; HttpOnly; SameSite=Lax; Secure'));
  assert.equal(https.setCookie.includes('Domain='), false);
  const http = await resolveVisitorSession(request(undefined, 'http://localhost:5173/api/session'));
  assert.ok(http.setCookie.includes('; Max-Age=15552000; Path=/; HttpOnly; SameSite=Lax'));
  assert.equal(http.setCookie.includes('; Secure'), false);
});

test('allowCreate false never mints missing or rejected cookies', async () => {
  const initial = await resolveVisitorSession(request());
  assert.equal(await resolveVisitorSession(request(), { allowCreate: false }), null);
  assert.equal(await resolveVisitorSession(request(`${VISITOR_COOKIE_NAME}=invalid`), { allowCreate: false }), null);
  assert.equal(await resolveVisitorSession(request(`${cookiePair(initial)}; ${cookiePair(initial)}`), { allowCreate: false }), null);
  assert.deepEqual(await resolveVisitorSession(request(cookiePair(initial)), { allowCreate: false }), { userId: initial.userId });
  assert.ok((await resolveVisitorSession(request(), { allowCreate: true })).setCookie);
});
