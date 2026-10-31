import assert from 'node:assert/strict';
const base = new URL(process.env.MOONMIND_TEST_URL || 'http://127.0.0.1:5173');
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname));
const session = await fetch(new URL('/api/session', base));
assert.equal(session.status, 200);
assert.equal((await session.json()).mode, 'demo', 'Only local demo; no model calls');
const cookie = session.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
const call = async (path, method = 'GET', body) => {
  const response = await fetch(new URL(path, base), { method, headers: {
    cookie, ...(body === undefined ? {} : { origin: base.origin, 'Content-Type': 'application/json' }),
  }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  assert.equal(response.status, 200);
  return response.json();
};
await call('/api/session', 'POST', { name: '__MOONMIND_PROBLEM_SMOKE__', consent: true, consentAdmin: false });
const send = async content => (await call('/api/messages', 'POST', { content, requestId: crypto.randomUUID() })).messages.find(message => message.role === 'assistant').content;
try {
  const original = 'งานเยอะมาก เหนื่อย เจ้านายสั่งเพิ่มอีก';
  const first = await send(original);
  assert.ok(first.length >= 260);
  assert.match(first, /ความสะดวก|ต้นทุน|อำนาจต่อรอง/);
  assert.doesNotMatch(first, /เอาทีละจังหวะ|ไม่จำเป็นต้องอธิบาย|[?？]/);
  const more = await send('งานก็ยังเครียดอยู่ ต้องทำแทนคนอื่นอีก');
  assert.ok(more.length >= 260);
  assert.notEqual(more, first);
  const unspecific = await send('มีปัญหา พยายามรักษาทุกอย่างแต่กลับยิ่งเหนื่อย');
  assert.ok(unspecific.length >= 260);
  assert.match(unspecific, /ผลประโยชน์|ต้นทุน|รับผิดชอบ/);
  assert.doesNotMatch(unspecific, /น่าชื่นชม|เล่าเพิ่ม|[?？]/);
  const listen = await send('งานยังเครียด แค่อยากระบาย ไม่ต้องแนะนำ');
  assert.doesNotMatch(listen, /ความสะดวก|อำนาจต่อรอง|ลองแยก/);
  const casual = await send('เปลี่ยนเรื่อง อยากกินชาไข่มุก');
  assert.match(casual, /ชาไข่มุก/);
  assert.doesNotMatch(casual, /ต้นทุน|ความรับผิดชอบ/);
  assert.match(await send('งานเครียด อยากตาย'), /อันตรายทันทีไหม/);
  const stored = (await call('/api/messages')).messages;
  assert.ok(stored.some(message => message.role === 'user' && message.content === original));
  console.log('Problem HTTP passed: first disclosure, continuation, broad problem, listening, topic change, safety and original history.');
} finally {
  await call('/api/messages', 'DELETE', {});
}
