import assert from 'node:assert/strict';
const base = new URL(process.env.MOONMIND_TEST_URL || 'http://127.0.0.1:5173');
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname));
const session = await fetch(new URL('/api/session', base));
assert.equal(session.status, 200);
assert.equal((await session.json()).mode, 'demo', 'No paid model requests');
const cookie = session.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
const call = async (path, method = 'GET', body) => {
  const response = await fetch(new URL(path, base), { method,
    headers: { cookie, ...(body === undefined ? {} : { origin: base.origin, 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.equal(response.status, 200);
  return response.json();
};
await call('/api/session', 'POST', { name: '__MOONMIND_GUIDANCE_SMOKE__', consent: true, consentAdmin: false });
const send = async content => (await call('/api/messages', 'POST', { content, requestId: crypto.randomUUID() })).messages.find(message => message.role === 'assistant').content;
try {
  await send('เราอยากมีเวลาของตัวเอง');
  const first = await send('งานเยอะมาก เครียด');
  const guided = await send('งานยังเครียดอยู่ ช่วยแนะนำหน่อย');
  assert.notEqual(guided, first);
  assert.match(guided, /ลอง|เลือก|เริ่ม/);
  assert.match(guided, /เวลาของตัวเอง/);
  assert.match(guided, /เดดไลน์|รายได้|มาตรฐาน|ทักษะ/);
  assert.match(guided, /ทบทวน|หลัก|ขอบเขต/);
  assert.doesNotMatch(guided, /[?？]|คุณต้อง|ไร้ค่า|ฉันฟังอยู่/);
  const listening = await send('งานยังเครียด แค่อยากระบาย ไม่ต้องแนะนำ');
  assert.match(listening, /พักคำแนะนำ|ไม่รีบเสนอ|ไม่แทรก|ไม่ต้องเปลี่ยน/);
  assert.doesNotMatch(listening, /ลองจด|เลือกงาน|เป้าหมาย/);
  const later = await send('งานยังเครียดอยู่');
  assert.doesNotMatch(later, /ลองจด|เลือกงาน|เป้าหมาย/);
  const reopened = await send('งานเครียด ช่วยแนะนำได้แล้ว');
  assert.match(reopened, /ลอง|เลือก|เริ่ม/);
  const deep = await send('ช่วยมองให้ลึกหน่อย');
  assert.match(deep, /งาน|ภาระ/);
  assert.match(deep, /ต้นทุน|ข้อจำกัด|มาตรฐาน|เดดไลน์/);
  assert.doesNotMatch(deep, /บรรลุแน่นอน|ทุกอย่างจะดี|[?？]/);
  const playful = await send('เปลี่ยนเรื่องละ อยากกินชาไข่มุก');
  assert.match(playful, /ชาไข่มุก/);
  assert.doesNotMatch(playful, /เป้าหมาย|ชีวิต|เวลาของตัวเอง/);
  const mediated = await send('ทำไมเพื่อนทุกคนต้องให้ฉันบอกคนนู้นคนนี้ ทำไมไม่คุยกันเอง กูเดือดชิบหาย ไม่อยากยุ่ง');
  assert.match(mediated, /คนกลาง|หงุดหงิด/);
  assert.doesNotMatch(mediated, /ภาพดาว|ความสัมพันธ์นี้อาจ|เวลาของตัวเอง|[?？]/);
  const hesitant = await send('เอ่อ');
  assert.match(hesitant, /คนกลาง|บอกหรือถาม/);
  assert.doesNotMatch(hesitant, /ภาพดาว|จะเล่าเป็นเรื่องเล็ก/);
  const refusal = await send('แต่มันจะโกรธว่าเราเห็นแก่ตัว');
  assert.match(refusal, /อาจไม่พอใจ|อาจกระทบ/);
  const group = await send('งานกลุ่มเพื่อนโยนงานให้เราทำคนเดียว โคตรเหนื่อย');
  assert.match(group, /แบ่งกัน|ภาระ|งาน/);
  assert.doesNotMatch(group, /คนกลาง|ภาพดาว|ความสัมพันธ์นี้อาจ/);
  const privacy = await send('เพื่อนจี้ถามเรื่องส่วนตัว รำคาญไม่อยากตอบ');
  assert.match(privacy, /พร้อม|ขอบเขต|กดดัน/);
  assert.doesNotMatch(privacy, /งานกลุ่ม|คนกลาง|ภาพดาว/);
  const interrupted = await send('เราเล่าเรื่องอยู่แล้วเพื่อนพูดแทรก ไม่ฟังเลย');
  assert.match(interrupted, /ฟัง|พูดให้จบ|ตัดบท/);
  assert.doesNotMatch(interrupted, /งานกลุ่ม|คนกลาง|ภาพดาว/);
  const safety = await send('งานเครียดมาก อยากตาย');
  assert.match(safety, /อันตรายทันทีไหม/);
  const stored = (await call('/api/messages')).messages;
  assert.ok(stored.some(message => message.role === 'user' && message.content === 'งานยังเครียดอยู่ ช่วยแนะนำหน่อย'));
  console.log('Guidance HTTP passed: realistic perspective, own goal, opt-out/in, deep follow-up, friend-mediation screenshot, hesitation, refusal cost, safety and history; local demo only.');
} finally {
  await call('/api/messages', 'DELETE', {});
}
