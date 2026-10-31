import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { createBackend } from '../lib/backend.ts';
import { buildReflectionReply } from '../core/persona.mjs';
import { buildConversationMemory, applyMemoryStyle } from '../core/conversation-memory.mjs';

// Actual SQL, history selection and delivery path. Synthetic local identities;
// a deterministic reply dependency keeps these tests independent of API access.
function conversation() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const file of readdirSync(new URL('../drizzle/', import.meta.url)).filter(file => file.endsWith('.sql')).sort())
    sqlite.exec(readFileSync(new URL('../drizzle/' + file, import.meta.url), 'utf8'));
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
      try { const result = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return result; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  let clock = 2000000000000, turn = 0;
  const backend = createBackend({ db, getUserId: async () => 'review', adminIds: [], mode: () => 'demo', now: () => ++clock,
    reply: async ({ text, recentMessages, learningMessages }) => {
      const previous = recentMessages.at(-1)?.content === text && recentMessages.at(-1)?.role === 'user' ? recentMessages.slice(0,-1) : recentMessages;
      const memory = buildConversationMemory(learningMessages);
      return { content: applyMemoryStyle(buildReflectionReply(text, previous, { memory }), text, memory), mode: 'demo' };
    },
  });
  const request = (operation, body) => backend.handle(operation, new Request('https://local-review.test/api/test', {
    method: 'POST', headers: { origin: 'https://local-review.test', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }));
  return {
    async start() { assert.equal((await request('sessionPost', { name: 'Synthetic review', consent: true, consentAdmin: false })).status, 200); },
    async say(content) {
      const response = await request('messagesPost', { content, requestId: 'dialogue_turn_' + turn++ });
      assert.equal(response.status, 200);
      return (await response.json()).messages.find(message => message.role === 'assistant').content;
    },
    close() { sqlite.close(); },
  };
}

test('persisted delivery answers math and appearance imagery without unrelated counselling or food', async t => {
  const chat = conversation(); t.after(() => chat.close()); await chat.start();
  await chat.say('วันนี้เหนื่อยอะ');
  const maths = await chat.say('1+1ได้เท่าไหร่');
  assert.equal(maths, '1+1 = 2');
  const metaphor = await chat.say('คนเราหลงรูปลักษณ์ภายนอก แต่ในร่างกายก็มีตับไตไส้พุง เศษอาหารกับไขมัน');
  assert.match(metaphor, /รูปลักษณ์|ร่างกาย|ภายนอก/);
  assert.doesNotMatch(metaphor, /เมนู|เลือกกิน|หิว|มื้อ|ข้าวผัด|สงบจิตใจ/);
});

test('persisted delivery drafts from the corrected issue rather than an earlier assistant assumption', async t => {
  const chat = conversation(); t.after(() => chat.close()); await chat.start();
  await chat.say('แฟนลืมมารับเรา พอเราบอกว่าเสียใจเขากลับบอกว่าเรื่องแค่นี้เอง');
  await chat.say('ไม่ได้ติดที่เขาลืม เราติดที่เขาทำเหมือนความรู้สึกเราไร้สาระ');
  const draft = await chat.say('ช่วยเขียนให้เราส่งหาเขาหน่อย แบบไม่ทางการ');
  assert.match(draft, /เธอ|แก|คุณ/);
  assert.match(draft, /ความรู้สึก|เสียใจ|ไร้สาระ/);
  assert.doesNotMatch(draft, /ที่เขา|เราจะยึด|ข้อมูลไม่พอ|เขาไม่รัก|นอกใจ/);
  const short = await chat.say('ขอสั้นกว่านี้');
  assert.ok(short.length < draft.length);
});

test('food jokes, laughter and goodbye preserve casual context through saved history', async t => {
  const chat = conversation(); t.after(() => chat.close()); await chat.start();
  assert.match(await chat.say('วันนี้ไปกินปิ้งย่างมา อร่อยจัด'), /ปิ้งย่าง|อร่อย|มื้อ|กิน/);
  const joke = await chat.say('จ่ายจนกระเป๋าตังร้องไห้ละ555');
  assert.match(joke, /เงิน|กระเป๋า|มื้อ|จ่าย|อิ่ม/);
  assert.doesNotMatch(joke, /กำลังเศร้า|กำลังเหงา|ต้นทุนชีวิต|ความคาดหวัง/);
  const laugh = await chat.say('5555');
  assert.doesNotMatch(laugh, /ทางเลือก|ข้อเท็จจริง|ต้นทุน|เป้าหมายชีวิต/);
  const goodbye = await chat.say('ไปนอนก่อนนะ ฝันดี');
  assert.match(goodbye, /ฝันดี|หลับ|พักผ่อน/);
  assert.ok(goodbye.length < 180);
});

test('partner work remains a relationship context and draft requests produce sendable wording', async t => {
  const chat = conversation(); t.after(() => chat.close()); await chat.start();
  await chat.say('แฟนอ่านไม่ตอบทั้งวัน แต่ยังลงสตอรี่ เราน้อยใจ');
  const busy = await chat.say('ฝั่งเขาบอกว่างานยังไม่เสร็จ');
  assert.match(busy, /เขา|แฟน|ตอบ|รอ|ยุ่ง/);
  assert.doesNotMatch(busy, /เรื่องงานหรือการเรียนค่อย|ความรับผิดชอบของคุณ/);
  const draft = await chat.say('ช่วยพิมพ์ข้อความไว้ส่งให้เขาหน่อย');
  assert.match(draft, /ว่าง|ตอบ|คุย|ยุ่ง|คิดถึง/);
  assert.doesNotMatch(draft, /ต้นทุน|ปรัชญา|สิทธิ์เลือก/);
  const short = await chat.say('ขอสั้นกว่านี้');
  assert.ok(short.length < draft.length);
  assert.match(short, /ว่าง|ตอบ|คุย|คิดถึง/);
});

test('corrected easy-work boredom replaces the earlier exhaustion interpretation', async t => {
  const chat = conversation(); t.after(() => chat.close()); await chat.start();
  await chat.say('เราเหนื่อยกับงานมาก');
  const corrected = await chat.say('ไม่ได้หนัก งานมันง่ายจนเบื่อ');
  assert.match(corrected, /ง่าย|เบื่อ|ท้าทาย/);
  assert.doesNotMatch(corrected, /คนอื่นโยน|งานล้น|พักก่อน|ภาระไม่เท่ากัน/);
  const next = await chat.say('ทำอะไรก่อนได้บ้าง');
  assert.match(next, /ทักษะ|ท้าทาย|งาน|เรียนรู้|ทดลอง|ลอง/);
  assert.doesNotMatch(next, /^ถ้าเรื่องที่เล่าเกี่ยวกับสิ่งที่ควรเลือก/);
});

test('pet loss stays about grief and absence rather than unrelated life decisions', async t => {
  const chat = conversation(); t.after(() => chat.close()); await chat.start();
  const loss = await chat.say('หมาที่เลี้ยงมาสิบกว่าปีเพิ่งจากไป');
  assert.match(loss, /เสียใจ|สูญเสีย|ผูกพัน|จากไป|คิดถึง/);
  assert.doesNotMatch(loss, /ทางเลือก|ต้นทุน|ทำให้ทุกฝ่ายพอใจ/);
  const empty = await chat.say('กลับมาห้องแล้วไม่มีใครวิ่งมารับ');
  assert.match(empty, /คิดถึง|เงียบ|เคย|หาย|รอ|กลับ|ผูกพัน/);
  assert.doesNotMatch(empty, /ความตั้งใจดีไม่ได้รับประกัน|ต้นทุน|เป้าหมายชีวิต/);
});

test('listening responds to the disclosed exclusion without coaching or repeated announcements', async t => {
  const chat = conversation(); t.after(() => chat.close()); await chat.start();
  const first = await chat.say('ขอระบายเฉยๆ ไม่ต้องแนะนำ เพื่อนเมินเราต่อหน้าคนอื่น');
  assert.match(first, /เมิน|ต่อหน้า|เพื่อน|ถูกมองข้าม/);
  const second = await chat.say('รู้สึกเหมือนเราไม่มีความหมายกับเขาเลย');
  assert.match(second, /ความหมาย|สำคัญ|มองข้าม|เจ็บ|เสียใจ|เพื่อน/);
  assert.doesNotMatch(second, /ลอง|ต้นทุน|เป้าหมายชีวิต|เราพักคำแนะนำไว้ก่อนนะ/);
  const stop = await chat.say('พอแล้ว');
  assert.ok(stop.length < 160);
  assert.doesNotMatch(stop, /ลอง|[?？]/);
});

test('new concrete topics replace old advice and unknown subjects do not trigger arbitrary philosophy', async t => {
  const chat = conversation(); t.after(() => chat.close()); await chat.start();
  await chat.say('เราไม่รู้จะเรียนอะไร');
  const painting = await chat.say('เปลี่ยนเรื่อง เราวาดรูปไว้แต่สีมันหม่น อยากให้สดใส');
  assert.match(painting, /สี|แสง|รูป|สดใส|หม่น/);
  assert.doesNotMatch(painting, /เลือกคณะ|เรียนต่อ|เป้าหมายชีวิต/);
  const unknown = await chat.say('มุมดาวสีม่วง');
  assert.doesNotMatch(unknown, /ความอยากของเรากับเงื่อนไขชีวิต|การเข้าใจคนอื่นก็ไม่จำเป็น|ทำให้ทุกฝ่ายพอใจ|คุณกำลังชั่งใจ/);
});
