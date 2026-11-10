import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { createBackend } from '../lib/backend.ts';
import { buildReflectionReply } from '../core/persona.mjs';
import { generateProviderReply } from '../lib/ai-provider.mjs';
import { drawTarotCards } from '../core/tarot-deck.mjs';
import { resolveVisitorSession, logoutVisitor, signInVisitor } from '../lib/visitor-session.ts';

function harness() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  const migrations = readdirSync(new URL('../drizzle/', import.meta.url)).filter((file) => file.endsWith('.sql')).sort();
  assert.ok(migrations.length, 'Generate the actual Drizzle migration before running tests');
  for (const file of migrations) sqlite.exec(readFileSync(new URL(`../drizzle/${file}`, import.meta.url), 'utf8'));
  const db = {
    prepare(sql) {
      const create = (values = []) => ({
        bind(...bound) { return create(bound); },
        async first() { return sqlite.prepare(sql).get(...values) ?? null; },
        async all() { return { results: sqlite.prepare(sql).all(...values) }; },
        async run() { return this.execute(); },
        execute() { return { success: true, meta: sqlite.prepare(sql).run(...values) }; },
      });
      return create();
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const result = statements.map((statement) => statement.execute()); sqlite.exec('COMMIT'); return result; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  let currentUser = 'alice';
  let clock = 2000000000000;
  let calls = 0;
  let resolveProfileId;
  let reply = async () => ({ content: 'ฉันรับฟังคุณอยู่ อยากเล่าเรื่องไหนต่อ?', mode: 'demo' });
  const api = () => createBackend({ db, getUserId: async () => currentUser, ...(resolveProfileId ? { resolveProfileId } : {}), adminIds: ['admin'], mode: () => 'demo', now: () => clock, reply: async (input) => { calls++; return reply(input); } });
  const request = (operation, data, options = {}) => {
    const isWrite = data !== undefined;
    return api().handle(operation, new Request(`https://moonmind.test/api/${options.path ?? 'test'}`, {
      method: options.method ?? (isWrite ? 'POST' : 'GET'), headers: { ...(isWrite ? { origin: options.origin ?? 'https://moonmind.test', 'content-type': options.contentType ?? 'application/json' } : {}), ...options.headers },
      ...(isWrite ? { body: options.raw ?? JSON.stringify(data) } : {}),
    }));
  };
  const register = (name = 'ชื่อซ้ำ', consentAdmin = false) => request('sessionPost', { name, consent: true, consentAdmin });
  const send = (requestId = 'request_001', content = 'วันนี้กังวลเรื่องงาน', number) => request('messagesPost', { content, requestId, ...(number === undefined ? {} : { number }) });
  return { sqlite, request, register, send, setUser: (id) => { currentUser = id; }, setProfileResolver: (fn) => { resolveProfileId = fn; }, setReply: (fn) => { reply = fn; }, tick: (ms) => { clock += ms; }, calls: () => calls };
}

const deleteAccount = (h, userId = 'alice', confirmName = 'Same Name', options = {}) => h.request('adminUsersDelete', { userId, confirmName, confirmed: true }, { method: 'DELETE', ...options });

test('real local provider recalls profile names after returning without leaking another user', async t => {
  const h = harness(); t.after(() => h.sqlite.close());
  h.setReply(input => generateProviderReply(input, {}));
  await h.register('เมย์');
  const answer = async (key, text) => {
    const response = await h.send(key, text); assert.equal(response.status, 200);
    return (await response.json()).messages.find(message => message.role === 'assistant').content;
  };
  assert.match(await answer('profile_name_001', 'ฉันชื่ออะไร'), /เมย์/);
  h.setUser('bob'); await h.register('นนท์');
  const second = await answer('profile_name_002', 'เราชื่ออะไร');
  assert.match(second, /นนท์/); assert.doesNotMatch(second, /เมย์/);
  h.setUser('alice'); await h.register('เมย์');
  assert.match(await answer('profile_name_003', 'จำชื่อเราได้ไหม'), /เมย์/);
});

test('admin permanent deletion removes exactly one profile, messages and requests despite duplicate names', async () => {
  const h = harness();
  await h.register('Same Name', true); await h.send();
  h.setUser('bob'); await h.register('Same Name', true); await h.send();
  const other = await (await h.request('messagesGet')).json();
  h.setUser('admin');
  assert.equal((await (await h.request('adminUsers')).json()).users.find(user => user.id === 'alice').canDelete, true);
  const result = await deleteAccount(h);
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { deletedUserId: 'alice' });
  for (const [table, key] of [['profiles', 'id'], ['messages', 'user_id'], ['requests', 'user_id']]) {
    assert.equal(h.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${key} = ?`).get('alice').n, 0);
    assert.ok(h.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${key} = ?`).get('bob').n > 0);
  }
  assert.equal((await deleteAccount(h)).status, 404);
  assert.equal((await h.request('adminMessages', undefined, { path: 'admin/messages?userId=alice' })).status, 404);
  h.setUser('alice');
  assert.equal((await (await h.request('sessionGet')).json()).user, null);
  assert.equal((await h.request('messagesGet')).status, 409);
  h.setUser('bob'); assert.deepEqual(await (await h.request('messagesGet')).json(), other);
  h.sqlite.close();
});

test('permanent deletion requires an admin, current visible profile, exact confirmation and same-origin DELETE', async () => {
  const h = harness(); await h.register('Same Name', true); await h.send();
  h.setUser(null); assert.equal((await deleteAccount(h)).status, 401);
  h.setUser('alice'); assert.equal((await deleteAccount(h)).status, 403);
  h.setUser('admin'); await h.register('Admin', true);
  assert.equal((await (await h.request('adminUsers')).json()).users.find(user => user.id === 'admin').canDelete, false);
  assert.equal((await deleteAccount(h, 'admin', 'Admin')).status, 403);
  assert.equal((await deleteAccount(h, 'alice', 'Old Name')).status, 409);
  assert.equal((await deleteAccount(h, 'missing')).status, 404);
  assert.equal((await h.request('adminUsersDelete', { userId: 'alice', confirmName: 'Same Name' }, { method: 'DELETE' })).status, 400);
  assert.equal((await deleteAccount(h, 'alice', 'Same Name', { method: 'POST' })).status, 405);
  assert.equal((await h.request('adminUsersDelete')).status, 405);
  assert.equal((await deleteAccount(h, 'alice', 'Same Name', { origin: 'https://evil.test' })).status, 403);
  assert.equal((await deleteAccount(h, 'alice', 'Same Name', { headers: { 'sec-fetch-site': 'cross-site' } })).status, 403);
  assert.equal((await deleteAccount(h, 'alice', 'Same Name', { contentType: 'text/plain' })).status, 415);
  assert.equal((await deleteAccount(h, 'alice', 'Same Name', { raw: '{' })).status, 400);
  assert.equal((await deleteAccount(h, 'alice', 'Same Name', { raw: ' '.repeat(24001) })).status, 413);
  h.setUser('bob'); await h.register('Private', false);
  h.setUser('admin'); assert.equal((await deleteAccount(h, 'bob', 'Private')).status, 404);
  assert.equal(h.sqlite.prepare('SELECT COUNT(*) AS n FROM profiles').get().n, 3);
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS n FROM messages WHERE user_id = 'alice'").get().n, 3);
  h.sqlite.close();
});

test('failed cascaded deletion rolls back the profile and transcript atomically', async () => {
  const h = harness(); await h.register('Same Name', true); await h.send();
  h.sqlite.exec("CREATE TRIGGER reject_delete BEFORE DELETE ON messages BEGIN SELECT RAISE(ABORT, 'fixture failure'); END");
  h.setUser('admin'); assert.equal((await deleteAccount(h)).status, 503);
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS n FROM profiles WHERE id = 'alice'").get().n, 1);
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS n FROM messages WHERE user_id = 'alice'").get().n, 3);
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS n FROM requests WHERE user_id = 'alice'").get().n, 1);
  h.sqlite.close();
});

test('a late generation cannot resurrect a deleted account even after the same ID re-registers', async () => {
  const h = harness(); await h.register('Same Name', true);
  let release, started;
  const signal = new Promise(resolve => { started = resolve; });
  h.setReply(() => { started(); return new Promise(resolve => { release = resolve; }); });
  const pending = h.send('request_delete_race', 'Private text to delete'); await signal;
  h.setUser('admin'); assert.equal((await deleteAccount(h)).status, 200);
  h.setUser('alice'); await h.register('Same Name', true);
  const fresh = await (await h.request('messagesGet')).json();
  assert.equal(fresh.messages.length, 1);
  release({ content: 'Late private reply', mode: 'demo' });
  assert.equal((await pending).status, 409);
  assert.deepEqual(await (await h.request('messagesGet')).json(), fresh);
  assert.equal(h.sqlite.prepare('SELECT COUNT(*) AS n FROM requests').get().n, 0);
  let learning;
  h.setReply(async input => { learning = input.learningMessages; return { content: 'New reply', mode: 'demo' }; });
  assert.equal((await h.send('request_delete_race', 'Fresh text')).status, 200);
  assert.deepEqual(learning.map(message => message.content), ['Fresh text']);
  h.sqlite.close();
});

test('guest logout pauses access and the same nickname resumes the complete legacy transcript without reseeding tarot', async () => {
  const h = harness();
  const previous = await resolveVisitorSession(new Request('https://moonmind.test/api/session'));
  h.setUser(previous.userId);
  await h.register('Same Nickname');
  await h.send('logout_test_001', 'Private guest message');
  const logout = logoutVisitor(new Request('https://moonmind.test/api/session', { method: 'DELETE', headers: { origin: 'https://moonmind.test', cookie: previous.setCookie.split(';')[0] } }));
  assert.equal(logout.status, 200);
  const original = await (await h.request('messagesGet')).json();
  h.setUser(null);
  assert.equal((await h.request('messagesGet')).status, 401);
  h.setProfileResolver(async name => {
    const legacy = h.sqlite.prepare('SELECT name FROM profiles WHERE id = ?').get(previous.userId);
    const entry = await signInVisitor(new Request('https://moonmind.test/api/session'), previous.userId, name, legacy?.name ?? null);
    h.setUser(entry.userId);
    return entry.userId;
  });
  await h.register('Same Nickname');
  const nextHistory = await (await h.request('messagesGet')).json();
  assert.deepEqual(nextHistory.messages, original.messages);
  assert.equal(h.sqlite.prepare('SELECT COUNT(*) AS n FROM messages WHERE user_id = ?').get(previous.userId).n, 3);
  await h.register('Another Nickname');
  assert.equal((await (await h.request('messagesGet')).json()).messages.length, 1);
  await h.register('Same Nickname');
  assert.deepEqual((await (await h.request('messagesGet')).json()).messages, original.messages);
  assert.equal(h.calls(), 1);
  h.sqlite.close();
});

test('guest registration validates consent and origin before resolving the returning profile', async () => {
  const h = harness(); let resolves = 0;
  h.setUser(null);
  h.setProfileResolver(async () => { resolves++; return 'guest:returned'; });
  assert.equal((await h.request('sessionPost', { name: 'Existing Name', consent: false, consentAdmin: false })).status, 400);
  assert.equal((await h.request('sessionPost', { name: 'Existing Name', consent: true, consentAdmin: false }, { origin: 'https://evil.test' })).status, 403);
  assert.equal(resolves, 0);
  assert.equal((await h.register('Existing Name')).status, 200);
  assert.equal(resolves, 1);
  h.sqlite.close();
});

test('first consented registration opens one persisted tarot spread without a provider call', async () => {
  const h=harness();
  assert.equal((await h.request('sessionPost',{name:'First Visitor',consent:false,consentAdmin:false})).status,400);
  assert.equal(h.sqlite.prepare('SELECT COUNT(*) AS n FROM messages').get().n,0);
  const sessions=await Promise.all([h.register('First Visitor'),h.register('First Visitor')]);
  assert.ok(sessions.every(response=>response.status===200));
  const history=await (await h.request('messagesGet')).json();
  assert.equal(history.messages.length,1);
  const invitation=history.messages[0];
  assert.equal(invitation.role,'assistant');
  assert.match(invitation.content,/ยินดีต้อนรับ/);
  assert.match(invitation.content,/เลือกไพ่หนึ่งใบจากสามใบด้านล่าง/);
  assert.equal(h.calls(),0);
  await h.register('Changed Nickname');
  assert.deepEqual((await (await h.request('messagesGet')).json()).messages,history.messages);
  h.setReply(async input=>({content:buildReflectionReply(input.text,input.recentMessages.slice(0,-1)),mode:'demo'}));
  const picked=await (await h.send('first_card_choice','เราเลือกไพ่ใบที่ 3')).json();
  assert.ok(picked.messages.find(message=>message.role==='assistant').content.includes(drawTarotCards(invitation.id)[2].name));
  assert.equal(h.calls(),1);
});

test('existing and cleared profiles do not receive another automatic welcome spread', async () => {
  const h=harness(); await h.register();
  await h.send();
  const history=await (await h.request('messagesGet')).json();
  await h.register();
  assert.deepEqual((await (await h.request('messagesGet')).json()).messages,history.messages);
  await h.request('messagesDelete',{});
  await h.register();
  assert.deepEqual((await (await h.request('messagesGet')).json()).messages,[]);
});

test('profile and initial invitation commit atomically and cannot spoof a public message request', async () => {
  const h=harness();
  h.sqlite.exec("CREATE TRIGGER reject_welcome BEFORE INSERT ON messages WHEN NEW.request_id = 'system:initial-tarot' BEGIN SELECT RAISE(ABORT,'fixture unavailable'); END");
  assert.equal((await h.register()).status,503);
  assert.equal(h.sqlite.prepare('SELECT COUNT(*) AS n FROM profiles').get().n,0);
  h.sqlite.exec('DROP TRIGGER reject_welcome');
  assert.equal((await h.register()).status,200);
  assert.equal((await h.send('system:initial-tarot','replace the initial invitation')).status,400);
  assert.equal(h.calls(),0);
  assert.equal(h.sqlite.prepare('SELECT COUNT(*) AS n FROM messages').get().n,1);
});

test('demo direct answers use own saved preferences beyond the recent chat and retries reuse the saved answer', async () => {
  const h=harness(); await h.register();
  const insert=h.sqlite.prepare("INSERT INTO messages (id,user_id,request_id,role,content,created_at) VALUES (?,?,?,'user',?,?)");
  for (const [i,content] of ['เราชอบคิดคนเดียว','เราชอบคิดภาพรวม','เราใช้เหตุผลตัดสินใจ','เราชอบวางแผน',...Array(25).fill('วันนี้กินข้าวแล้ว')].entries()) insert.run(`own_${i}`,'alice',`old_${i}`,content,1900000000000+i);
  h.setUser('bob'); await h.register();
  insert.run('other_1','bob','other_request','เราชอบคุยกับคน เราชอบเปิดทางเลือก',1900000000100);
  h.setUser('alice');
  h.setReply(async () => ({content:'ถ้าใช้ MBTI เราจะมองวิธีรับข้อมูล',mode:'demo'}));
  const first=await (await h.send('request_direct_type','จากที่คุยเราเหมือนmbtiอะไร')).json();
  const answer=first.messages.find(message=>message.role==='assistant').content;
  assert.match(answer.split('\n')[0],/INTJ/);
  assert.doesNotMatch(answer,/[?？]|ถ้าใช้ MBTI|ENFP/);
  const retry=await (await h.send('request_direct_type','จากที่คุยเราเหมือนmbtiอะไร')).json();
  assert.equal(retry.messages.find(message=>message.role==='assistant').content,answer);
  assert.equal(h.calls(),1);
  const ownHistory=await (await h.request('messagesGet')).json();
  assert.equal(ownHistory.messages.find(message=>message.id===first.messages.find(message=>message.role==='assistant').id).content,answer);
});

test('demo tarot choice persists through the existing request and history flow', async () => {
  const h=harness(); await h.register();
  h.setReply(async input=>({content:buildReflectionReply(input.text,input.recentMessages.slice(0,-1)),mode:'demo'}));
  const start=await (await h.send('request_tarot_start','เปิดไพ่ทาโรต์ให้หน่อย')).json();
  const invitation=start.messages.find(message=>message.role==='assistant');
  assert.match(invitation.content,/เลือกไพ่หนึ่งใบจากสามใบด้านล่าง/);
  h.tick(10000);
  const picked=await (await h.send('request_tarot_pick','เราเลือกไพ่ใบที่ 2')).json();
  const answer=picked.messages.find(message=>message.role==='assistant').content;
  assert.ok(answer.includes(drawTarotCards(invitation.id)[1].name));
  // The reading is followed by exactly one probe question that opens the deeper round.
  assert.equal((answer.match(/[?？]/gu)||[]).length,1);
  assert.ok(answer.trim().endsWith('?'));
  const retry=await (await h.send('request_tarot_pick','เราเลือกไพ่ใบที่ 2')).json();
  assert.equal(retry.messages.find(message=>message.role==='assistant').content,answer);
  assert.equal(h.calls(),2);
});

test('substantive answers are persisted and reused without artificial length or another generation', async () => {
  for (const mode of ['demo', 'ai']) {
    const h = harness();
    await h.register();
    // ai is a fixture result: this test never connects to an external model.
    h.setReply(async input => ({ content: buildReflectionReply(input.text), mode }));
    const first = await (await h.send('request_lines', 'งานเยอะมาก')).json();
    const answer = first.messages.find(message => message.role === 'assistant').content;
    assert.match(answer, /งาน|ภาระ/);
    assert.equal(answer.replace(/\s+/gu, ' '), buildReflectionReply('งานเยอะมาก').replace(/\s+/gu, ' '));
    assert.equal(first.mode, mode);
    const retry = await (await h.send('request_lines', 'งานเยอะมาก')).json();
    assert.equal(retry.messages.find(message => message.role === 'assistant').content, answer);
    assert.equal(h.calls(), 1);
    const history = await (await h.request('messagesGet')).json();
    assert.equal(history.messages.find(message => message.id === first.messages.find(row => row.role === 'assistant').id).content, answer);
  }
});

test('brief conversation is stored verbatim without unrelated padding', async () => {
  const h = harness(); await h.register();
  h.setReply(async () => ({ content: 'ฝันดีนะ 🌙', mode: 'demo' }));
  const result = await (await h.send('request_goodnight', 'ไปนอนละ ฝันดี')).json();
  const answer = result.messages.find(message => message.role === 'assistant');
  assert.equal(answer.content, 'ฝันดีนะ 🌙');
  assert.equal((await (await h.request('messagesGet')).json()).messages.at(-1).content, answer.content);
  h.sqlite.close();
});

test('authenticated identity is required and a name never selects another user', async () => {
  const h = harness();
  h.setUser(null);
  assert.equal((await h.request('sessionGet')).status, 401);
  assert.equal((await h.register()).status, 401);
  h.setUser('alice');
  await h.register(); await h.send();
  h.setUser('bob'); await h.register();
  const body = await (await h.request('messagesGet', undefined, { path: 'messages?userId=alice&name=ชื่อซ้ำ' })).json();
  assert.equal(body.messages.length, 1);
  assert.match(body.messages[0].content,/เลือกไพ่หนึ่งใบจากสามใบด้านล่าง/);
  assert.equal(body.messages[0].role,'assistant');
  assert.equal((await (await h.request('sessionGet')).json()).user.id, 'bob');
  assert.equal((await h.request('adminUsers')).status, 403);
});

test('mutations require same origin, JSON, valid consent and bounded body', async () => {
  const h = harness();
  assert.equal((await h.request('sessionPost', { name: 'x', consent: true, consentAdmin: false }, { origin: 'https://evil.test' })).status, 403);
  assert.equal((await h.request('sessionPost', { name: 'x', consent: true, consentAdmin: false }, { headers: { origin: '' } })).status, 403);
  assert.equal((await h.request('sessionPost', { name: 'x', consent: true, consentAdmin: false }, { headers: { 'sec-fetch-site': 'cross-site' } })).status, 403);
  assert.equal((await h.request('sessionPost', {}, { contentType: 'text/plain' })).status, 415);
  assert.equal((await h.request('sessionPost', {}, { raw: '{' })).status, 400);
  assert.equal((await h.request('sessionPost', {}, { raw: 'a'.repeat(24001) })).status, 413);
  assert.equal((await h.request('sessionPost', { name: 'x', consent: false, consentAdmin: false })).status, 400);
  await h.register();
  assert.equal((await h.send('request_001', 'x'.repeat(4001))).status, 400);
  assert.equal((await h.send('request_001', 'x', 37)).status, 400);
  assert.equal((await (await h.request('messagesGet')).json()).messages.length, 1);
  assert.equal((await h.send('request_001', 'x', 1.5)).status, 400);
  assert.equal(h.calls(), 0);
});

test('admin allowlist sees consent only and revocation takes effect', async () => {
  const h = harness();
  await h.register('Alice', true); await h.send();
  h.setUser('bob'); await h.register('Bob', false); await h.send();
  h.setUser('admin');
  const users = (await (await h.request('adminUsers')).json()).users;
  assert.deepEqual(users.map((user) => user.id), ['alice']);
  assert.equal(users[0].messageCount, 3);
  assert.equal((await h.request('adminMessages', undefined, { path: 'admin/messages?userId=bob' })).status, 404);
  assert.equal((await (await h.request('adminMessages', undefined, { path: 'admin/messages?userId=alice' })).json()).messages.length, 3);
  h.setUser('alice'); await h.request('sessionPatch', { consentAdmin: false });
  h.setUser('admin');
  assert.deepEqual((await (await h.request('adminUsers')).json()).users, []);
  assert.equal((await h.request('adminMessages', undefined, { path: 'admin/messages?userId=alice' })).status, 404);
});

test('successful retry is idempotent and rejects a changed payload', async () => {
  const h = harness(); await h.register();
  const first = await h.send(); assert.equal(first.status, 200);
  const original = await first.json();
  assert.deepEqual(await (await h.send()).json(), original);
  assert.equal(h.calls(), 1);
  assert.equal((await h.send('request_001', 'changed')).status, 409);
  assert.equal((await h.send('request_001', 'วันนี้กังวลเรื่องงาน', 30)).status, 400);
  assert.equal((await (await h.request('messagesGet')).json()).messages.length, 3);
});

test('provider failure preserves user message, retry saves a single assistant', async () => {
  const h = harness(); await h.register();
  h.setReply(async () => { throw new Error('secret provider detail'); });
  const failed = await h.send(); assert.equal(failed.status, 502);
  assert.equal((await failed.json()).recoverable, true);
  assert.equal((await (await h.request('messagesGet')).json()).messages.length, 2);
  h.setReply(async (input) => {
    assert.equal(input.recentMessages.filter((message) => message.role === 'user').length, 1);
    return { content: 'ลองดูความรู้สึกของคุณด้วยกัน', mode: 'demo' };
  });
  assert.equal((await h.send()).status, 200);
  assert.equal((await (await h.request('messagesGet')).json()).messages.length, 3);
  assert.equal(h.calls(), 2);
});

test('concurrent requests cannot create duplicate user messages or provider calls', async () => {
  const h = harness(); await h.register();
  let release;
  let started;
  const signal = new Promise((resolve) => { started = resolve; });
  h.setReply(() => { started(); return new Promise((resolve) => { release = resolve; }); });
  const first = h.send(); await signal;
  assert.equal((await h.send()).status, 409);
  assert.equal((await h.send('request_002')).status, 429);
  assert.equal(h.calls(), 1);
  release({ content: 'คำตอบ', mode: 'demo' });
  assert.equal((await first).status, 200);
  assert.equal((await (await h.request('messagesGet')).json()).messages.length, 3);
});

test('deletion while generation runs cannot resurrect history', async () => {
  const h = harness(); await h.register();
  let release;
  let started;
  const signal = new Promise((resolve) => { started = resolve; });
  h.setReply(() => { started(); return new Promise((resolve) => { release = resolve; }); });
  const first = h.send(); await signal;
  assert.equal((await h.request('messagesDelete', {})).status, 200);
  release({ content: 'คำตอบล่าช้า', mode: 'demo' });
  assert.equal((await first).status, 409);
  assert.deepEqual((await (await h.request('messagesGet')).json()).messages, []);
  assert.equal(h.sqlite.prepare('SELECT COUNT(*) AS n FROM requests').get().n, 0);
});

test('stale generation loses lock to a retry and cannot overwrite it', async () => {
  const h = harness(); await h.register();
  let release;
  let started;
  const signal = new Promise((resolve) => { started = resolve; });
  h.setReply(() => { started(); return new Promise((resolve) => { release = resolve; }); });
  const first = h.send(); await signal;
  h.tick(180001);
  h.setReply(async () => ({ content: 'คำตอบใหม่', mode: 'demo' }));
  assert.equal((await h.send()).status, 200);
  release({ content: 'คำตอบเก่า', mode: 'demo' });
  assert.equal((await first).status, 409);
  const messages = (await (await h.request('messagesGet')).json()).messages;
  assert.equal(messages.length, 3);
  assert.equal(messages[2].content, 'คำตอบใหม่');
  assert.doesNotMatch(messages[2].content, /คำตอบเก่า/);
});

test('rate limit and retry cap are enforced by SQL', async () => {
  const h = harness(); await h.register();
  for (let i = 0; i < 20; i++) assert.equal((await h.send(`request_${String(i).padStart(3, '0')}`)).status, 200);
  assert.equal((await h.send('request_limit')).status, 429);
  h.tick(3600001);
  assert.equal((await h.send('request_after')).status, 200);
  h.setReply(async () => { throw new Error('offline'); });
  for (let i = 0; i < 5; i++) assert.equal((await h.send('request_failed')).status, 502);
  assert.equal((await h.send('request_failed')).status, 429);
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS n FROM messages WHERE request_id = 'request_failed'").get().n, 1);
});

test('deleting own history leaves other users intact', async () => {
  const h = harness(); await h.register(); await h.send();
  h.setUser('bob'); await h.register(); await h.send();
  h.setUser('alice'); await h.request('messagesDelete', {});
  assert.deepEqual((await (await h.request('messagesGet')).json()).messages, []);
  h.setUser('bob');
  assert.equal((await (await h.request('messagesGet')).json()).messages.length, 3);
});

test('account storage cap refuses new content while existing retry stays available', async () => {
  const h = harness(); await h.register(); await h.send();
  h.sqlite.exec("WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 998) INSERT INTO messages (id, user_id, request_id, role, content, created_at) SELECT 'fill_' || n, 'alice', 'fill_' || n, 'user', 'เก็บไว้', 1000 + n FROM seq");
  assert.equal((await h.send('request_overfull')).status, 429);
  assert.equal((await h.send()).status, 200);
  assert.equal(h.calls(), 1);
});

function seedMessage(h, { id, userId = 'alice', role = 'user', content, createdAt = 1999999990000 }) {
  h.sqlite.prepare('INSERT INTO messages (id, user_id, request_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, userId, `seed_${id}`, role, content, createdAt);
}

test('learning source preserves older user interests beyond the recent 20 dialogue messages', async () => {
  const h = harness(); await h.register();
  seedMessage(h, { id: 'old_interest', content: 'ฉันชอบปลูกต้นไม้', createdAt: 1999999990000 });
  for (let i = 0; i < 35; i++) seedMessage(h, { id: `assistant_${i}`, role: 'assistant', content: `assistant inference ${i}`, createdAt: 1999999990001 + i });
  let observed;
  h.setReply(async (input) => { observed = input; return { content: 'รับฟังอยู่', mode: 'demo' }; });
  assert.equal((await h.send('request_memory', 'ตอนนี้เหนื่อยกับงาน')).status, 200);
  assert.ok(observed.recentMessages.length > 20 && observed.recentMessages.length <= 200);
  assert.equal(observed.recentMessages.some((message) => message.id === 'old_interest'), true);
  assert.deepEqual(observed.learningMessages.map((message) => message.content), ['ฉันชอบปลูกต้นไม้', 'ตอนนี้เหนื่อยกับงาน']);
  assert.ok(observed.learningMessages.every((message) => message.role === 'user'));
  assert.equal(observed.learningMessages.at(-1).content, observed.text);
});

test('saved selected tarot card survives the short dialogue window and profile switching', async t => {
  const h = harness(); t.after(() => h.sqlite.close());
  h.setReply(input => generateProviderReply(input, {}));
  await h.register('เมย์');
  const messages = (await (await h.request('messagesGet')).json()).messages;
  const invitation = messages.find(message => message.role === 'assistant' && message.content.includes('เลือกไพ่หนึ่งใบ'));
  const expected = drawTarotCards(invitation.id)[1];
  assert.equal((await h.send('saved_card_choice', 'เราเลือกไพ่ใบที่ 2')).status, 200);
  for (let i = 0; i < 30; i++) seedMessage(h, { id: `card_window_${i}`, role: i % 2 ? 'assistant' : 'user', content: 'คุยเรื่องทั่วไป', createdAt: 2000000000100 + i });
  h.tick(1000);
  const result = await (await h.send('saved_card_recall', 'เราได้ไพ่อะไร')).json();
  assert.ok(result.messages.find(message => message.role === 'assistant').content.includes(expected.name));
  h.setUser('bob'); await h.register('นนท์');
  const other = await (await h.send('other_card_recall', 'เราได้ไพ่อะไร')).json();
  assert.doesNotMatch(other.messages.find(message => message.role === 'assistant').content, /คุณได้ไพ่ “/);
});

test('saved Chariot and a three-year breakup stay on topic with validation before one followup', async t => {
  const h = harness(); t.after(() => h.sqlite.close());
  h.setReply(input => generateProviderReply(input, {}));
  await h.register('มิ้นท์');
  let round, cards;
  for (let i = 0; i < 1000; i++) {
    round = `chariot-review-${i}`; cards = drawTarotCards(round);
    if (cards.some(card => card.id === 7)) break;
  }
  assert.ok(cards.some(card => card.id === 7));
  seedMessage(h, { id: round, role: 'assistant', content: 'เลือกไพ่หนึ่งใบจากสามใบด้านล่าง', createdAt: 2000000000001 });
  h.tick(10);
  assert.equal((await h.send('breakup_card_choice', `เราเลือกไพ่ใบที่ ${cards.findIndex(card => card.id === 7) + 1}`)).status, 200);
  const send = async (key, text) => {
    h.tick(10); const response = await h.send(key, text); assert.equal(response.status, 200);
    return (await response.json()).messages.find(message => message.role === 'assistant').content;
  };
  const reply = await send('breakup_topic_001', 'เราเลิกกับแฟนที่คบมา3ปี เสียใจและโกรธมาก ควรทำยังไง?');
  assert.match(reply, /3 ปี|3ปี/);
  assert.match(reply, /เสียใจ/); assert.match(reply, /โกรธ/);
  assert.match(reply, /รถศึก/);
  assert.doesNotMatch(reply, /บริษัท|คำพิพากษา|สิ่งที่ต้องฝึก|เขาจะกลับมาหาคุณ/);
  assert.equal((reply.match(/[?？]/gu) || []).length, 1);
  assert.ok(reply.indexOf('เสียใจ') < reply.lastIndexOf('?'));
  assert.ok(reply.trim().endsWith('?'), 'The follow-up remains last, after the symbolic lens');
  const next = await send('breakup_topic_002', 'เรายังคิดถึงเขาอยู่');
  assert.doesNotMatch(next, /บริษัท|คำพิพากษา|สิ่งที่ต้องฝึก|ถ้ามองผ่านภาพไพ่/);
  assert.doesNotMatch(next, /การจบความสัมพันธ์ที่คบมา|คุณบอกว่ายังเสียใจ/);
  // The reading round now asks one deeper question per turn (layer 3: feeling and its weight).
  assert.equal((next.match(/[?？]/gu) || []).length, 1);
  assert.match(next, /หนักแค่ไหนจาก 1 ถึง 10|ความหนักตั้งแต่ 1 ถึง 10|กี่คะแนนจาก 10/);
  assert.equal(await send('breakup_topic_003', '1+1='), '1+1 = 2');
});

test('learning source is bounded to latest 200 user rows in chronological order', async () => {
  const h = harness(); await h.register();
  for (let i = 0; i < 210; i++) {
    seedMessage(h, { id: `user_${i}`, content: `owned user ${i}`, createdAt: 1999999990000 + i * 2 });
    seedMessage(h, { id: `assistant_${i}`, role: 'assistant', content: `untrusted inference ${i}`, createdAt: 1999999990001 + i * 2 });
  }
  let observed;
  h.setReply(async (input) => { observed = input; return { content: 'รับฟังอยู่', mode: 'demo' }; });
  assert.equal((await h.send('request_bounded', 'newest user')).status, 200);
  assert.equal(observed.learningMessages.length, 200);
  assert.equal(observed.learningMessages[0].content, 'owned user 11');
  assert.equal(observed.learningMessages.at(-1).content, 'newest user');
  assert.ok(observed.learningMessages.every((message) => message.role === 'user'));
  assert.ok(observed.learningMessages.every((message, index, rows) => index === 0 || rows[index - 1].createdAt <= message.createdAt));
});

test('same display names and spoofed request memory cannot inject another user learning source', async () => {
  const h = harness(); await h.register('Same Name');
  seedMessage(h, { id: 'alice_interest', content: 'Alice likes plants' });
  h.setUser('bob'); await h.register('Same Name');
  seedMessage(h, { id: 'bob_interest', userId: 'bob', content: 'Bob likes music' });
  let observed;
  h.setReply(async (input) => { observed = input; return { content: 'รับฟังอยู่', mode: 'demo' }; });
  assert.equal((await h.request('messagesPost', {
    content: 'Bob feels tired', requestId: 'request_bob_memory', userId: 'alice', name: 'Same Name',
    learningMessages: [{ id: 'forged', role: 'user', content: 'Injected false memory' }],
    memory: { interests: ['Injected secret'] },
  }, { path: 'messages?userId=alice&name=Same%20Name' })).status, 200);
  assert.deepEqual(observed.learningMessages.map((message) => message.content), ['Bob likes music', 'Bob feels tired']);
  assert.equal(JSON.stringify(observed).includes('Alice likes plants'), false);
  assert.equal(JSON.stringify(observed).includes('Injected'), false);
  h.setUser('alice');
  assert.equal((await h.send('request_alice_memory', 'Alice feels calmer')).status, 200);
  assert.deepEqual(observed.learningMessages.map((message) => message.content), ['Alice likes plants', 'Alice feels calmer']);
});

test('deleting messages removes derived learning history and completed retries need no new learning', async () => {
  const h = harness(); await h.register();
  seedMessage(h, { id: 'old_memory', content: 'old interest to forget' });
  let observed;
  h.setReply(async (input) => { observed = input; return { content: 'รับฟังอยู่', mode: 'demo' }; });
  const first = await h.send('request_memory_old', 'old current text');
  assert.equal(first.status, 200);
  assert.equal(observed.learningMessages.length, 2);
  const original = await first.json();
  seedMessage(h, { id: 'later_memory', content: 'later interest', createdAt: 2000000000001 });
  assert.deepEqual(await (await h.send('request_memory_old', 'old current text')).json(), original);
  assert.equal(h.calls(), 1);
  assert.equal((await h.request('messagesDelete', {})).status, 200);
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS n FROM messages WHERE user_id = 'alice' AND role = 'user'").get().n, 0);
  assert.equal((await h.send('request_memory_new', 'fresh start')).status, 200);
  assert.deepEqual(observed.learningMessages.map((message) => message.content), ['fresh start']);
  assert.equal(JSON.stringify(observed.learningMessages).includes('old interest'), false);
  assert.equal(h.calls(), 2);
});
