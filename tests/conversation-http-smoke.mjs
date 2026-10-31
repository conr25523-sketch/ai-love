import assert from 'node:assert/strict';
const base = new URL(process.env.MOONMIND_TEST_URL || 'http://127.0.0.1:5173');
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname), 'Only synthetic local records');
const session = await fetch(new URL('/api/session', base));
assert.equal(session.status, 200);
const initial = await session.json();
assert.equal(initial.mode, 'demo', 'Never use a paid model in this smoke test');
assert.equal(initial.user, null);
const cookie = session.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
assert.ok(cookie);
const call = async (path, method = 'GET', body) => {
  const response = await fetch(new URL(path, base), {
    method, headers: { cookie, ...(body === undefined ? {} : { origin: base.origin, 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.equal(response.status, 200);
  return response.json();
};
await call('/api/session', 'POST', { name: '__MOONMIND_NATURAL_SMOKE__', consent: true, consentAdmin: false });
const send = async content => (await call('/api/messages', 'POST', { content, requestId: crypto.randomUUID() })).messages.find(message => message.role === 'assistant').content;
const first = await send('คือเราไม่รู้อะไรเลยอะว่าอนาคตจะไปสายไหน');
assert.match(first, /อนาคต/);
assert.equal((first.match(/[?？]/g) || []).length, 1);
const disclosure = 'แล้วเราก็โดนมองด้วยสายตาที่แบบมันให้ความรู้สึกสภาพศพตัวเอง';
const second = await send(disclosure);
assert.match(second, /สายตา/);
assert.doesNotMatch(second, /อนาคต|ฉุกเฉิน|โหมดทดลอง/);
assert.notEqual(second, first);
assert.doesNotMatch(second, /\?/);
const third = await send(disclosure);
assert.notEqual(third, second);
assert.doesNotMatch(third, /\?/);
const fourth = await send(disclosure);
assert.notEqual(fourth, third);
assert.doesNotMatch(fourth, /โหมดทดลอง|กฎของ|\?/);
assert.equal((await call('/api/messages')).messages.length, 8);
const explanation = await send('แบบการเริ่มค้นหาที่นายบอกมันคือการค้นหาแบบไหน');
assert.match(explanation, /ลอง|สังเกต/);
assert.doesNotMatch(explanation, /อยากให้ช่วย|[?？]/);
const casual = await send('เปลี่ยนเรื่องละ อยากกินชาไข่มุก');
assert.match(casual, /ชาไข่มุก/);
assert.doesNotMatch(casual, /อนาคต|ทางเลือก|รู้สึกอย่างไร|[?？]/);
const greeting = await send('สวัสดี');
assert.doesNotMatch(greeting, /วันนี้มีเรื่องอะไร|[?？]/);
const achievement = await send('วันนี้สอบผ่านแล้ว');
assert.match(achievement, /ยินดี|ผ่าน/);
assert.doesNotMatch(achievement, /ทางเลือก|[?？]/);
const education = await send('ตอนนี้เราไม่รุ้จะเรียนอะไร');
assert.match(education, /ลอง|เริ่ม|ค่อย/);
assert.equal((education.match(/[?？]/g) || []).length, 0, 'Do not recycle the earlier goal question');
assert.doesNotMatch(education, /รายละเอียดไม่พอ/);
const math = await send('คือเราเก่งคณิตแต่ไม่ได้ชอบอะ');
assert.match(math, /คณิต|ความถนัด/);
assert.doesNotMatch(math, /รายละเอียดไม่พอ|[?？]/);
const challenge = await send('คือเราเก่งคณิตแต่ไม่ได้ชอบเรารู้สึกสนุกเวลาได้ท้าทาย');
assert.match(challenge, /ท้าทาย/);
assert.notEqual(challenge, math);
assert.doesNotMatch(challenge, /รายละเอียดไม่พอ|[?？]/);
const discovery = await send('สนุกที่ได้รู้ในสิ่งที่ไม่รู้');
assert.match(discovery, /ค้นพบ|เรียนรู้/);
assert.doesNotMatch(discovery, /รายละเอียดไม่พอ|ข้อมูลไม่พอ|[?？]/);
const unknown = await send('เรื่องมุมดาวสีม่วง');
assert.doesNotMatch(unknown, /รายละเอียดไม่พอ|ข้อมูลไม่พอ|ไม่ครบ|[?？]/);
const genericReplies = [unknown];
for (let i = 0; i < 3; i++) {
  const reply = await send('เรื่องมุมดาวสีม่วง');
  assert.doesNotMatch(reply, /ฉันฟังอยู่|เรื่องมุมดาวสีม่วง|รายละเอียดไม่พอ|[?？]/);
  assert.ok(!genericReplies.includes(reply));
  genericReplies.push(reply);
}
const happinessReplies = [];
for (let i = 0; i < 3; i++) {
  const reply = await send('ไม่รู้ดิ คือเราแค่รู้สึกมีความสุขที่ได้รู้อะไรบางอย่าง');
  assert.doesNotMatch(reply, /ฉันฟังอยู่|ไม่รู้ดิ|รายละเอียดไม่พอ|[?？]/);
  assert.ok(!happinessReplies.includes(reply));
  happinessReplies.push(reply);
}
const stored = (await call('/api/messages')).messages;
assert.ok(stored.some(message => message.role === 'user' && message.content === 'เปลี่ยนเรื่องละ อยากกินชาไข่มุก'));
assert.equal(stored.length, 38);
await call('/api/messages', 'DELETE', {});
console.log('Conversation HTTP passed: short study guidance and one question, math preference and challenge screenshot, prior casual flow, original persisted history and deletion; local demo only.');
