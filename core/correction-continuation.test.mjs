import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReflectionReply, SYSTEM_PROMPT } from './persona.mjs';

test('corrected feeling replaces a prior interpretation and continues the actual problem', () => {
  const history = [{ role: 'user', content: 'งานเยอะมาก' }, { role: 'assistant', content: 'คุณเศร้าเพราะแฟนไม่ตอบ' }];
  const reply = buildReflectionReply('ไม่ใช่ เราไม่ได้เศร้า แค่เหนื่อยกับงาน', history);
  assert.match(reply, /เข้าใจคลาดเคลื่อน|ตีความไม่ตรง/);
  assert.match(reply, /งาน|ภาระ/);
  assert.match(reply, /ต้นทุน|ความสะดวก|อำนาจต่อรอง/);
  assert.doesNotMatch(reply, /แฟน|เศร้า|เราตอบถูก|จริง ๆ แล้ว|[?？]/);
});

test('a corrected subject uses the new disclosure rather than rationalizing the old answer', () => {
  const reply = buildReflectionReply('ไม่ตรง เราเก่งคณิตแต่ไม่ได้ชอบ', [
    { role: 'user', content: 'ไม่รู้จะเรียนอะไร' }, { role: 'assistant', content: 'คุณชอบคณิตและต้องเรียนคณิต' },
  ]);
  assert.match(reply, /คลาดเคลื่อน|ตีความไม่ตรง/);
  assert.match(reply, /เก่ง|ถนัด/);
  assert.match(reply, /ไม่ได้ชอบ|ไม่ชอบ|ความชอบ/);
  assert.doesNotMatch(reply, /ต้องเรียนคณิต|[?？]|ลึก ๆ คุณ/);
});

test('bare and repeated correction does not invent a replacement explanation or loop', () => {
  for (const text of ['ไม่ใช่', 'ไม่ตรง', 'เข้าใจผิด', 'ไม่ใช่ ไม่ใช่ ไม่ตรง']) {
    const reply = buildReflectionReply(text, [{ role: 'assistant', content: 'เพื่อนคุณอิจฉา' }]);
    assert.match(reply, /แก้|คลาดเคลื่อน|ไม่ตรง/);
    assert.doesNotMatch(reply, /อิจฉา|นิสัย|จริง ๆ|[?？]/);
    assert.ok(reply.length < 200);
  }
});

test('short ordinary questions receive bounded possibilities without questioning or mind reading', () => {
  for (const text of ['ทำยังไงดี', 'ช่วยแนะนำหน่อย', 'ไม่รู้จะเรียนอะไร', 'เราเก่งคณิตแต่ไม่ชอบ', 'แฟนไม่ตอบ', 'ไม่แน่ใจว่าควรแต่งงานไหม']) {
    const reply = buildReflectionReply(text);
    assert.doesNotMatch(reply, /[?？]|ข้อมูลไม่พอ|รายละเอียดไม่พอ|หมายถึงเรื่องไหน|เราอ่านใจ|คุณเป็นคน/);
    assert.match(reply, /ลอง|ถ้า|อาจ|ไม่จำเป็น|ได้/);
  }
  assert.match(SYSTEM_PROMPT, /ไม่ทำเหมือนรู้ข้อเท็จจริง/);
  assert.match(SYSTEM_PROMPT, /ไม่เปลี่ยนคำเดิมให้ดูเหมือนตอบถูก/);
});

test('safety and listening-only remain intact while handling corrections', () => {
  assert.match(buildReflectionReply('ไม่ใช่ อยากตาย'), /อันตรายทันทีไหม/);
  const reply = buildReflectionReply('ไม่ตรง เราเครียดเรื่องงาน ไม่ต้องแนะนำ');
  assert.match(reply, /แก้|คลาดเคลื่อน|ไม่ตรง/);
  assert.doesNotMatch(reply, /ความสะดวก|อำนาจต่อรอง|ลองแยก|[?？]/);
  assert.match(buildReflectionReply('อยากตุยเพราะสอบ 555'), /ทำร้ายตัวเองไหม/);
});
