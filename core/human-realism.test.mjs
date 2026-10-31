import test from 'node:test';
import assert from 'node:assert/strict';
import { humanRealismReply, humanRealismTopic } from './human-realism.mjs';
import { buildOpening, buildReflectionReply, SYSTEM_PROMPT } from './persona.mjs';
import { generateProviderReply } from '../lib/ai-provider.mjs';

test('appearance lens adds embodied reality and behaviour without body contempt or generalizing', () => {
  const text = 'ทำไมคนสนใจแค่รูปร่างภายนอกที่ดึงดูด ขอชวนคิดหน่อย';
  const history = [];
  const replies = new Set();
  for (let i = 0; i < 4; i++) {
    const reply = buildReflectionReply(text, history);
    assert.match(reply, /ร่างกาย|ระบบย่อย|อวัยวะ/);
    assert.match(reply, /การกระทำ|ปฏิบัติ|พฤติกรรม|รับผิดชอบ/);
    assert.doesNotMatch(reply, /ฉัน|น่ารังเกียจ|ทุกคนเลว|คนส่วนมาก|[?？]/);
    replies.add(reply);
    history.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
  }
  assert.equal(replies.size, 4);
});

test('mixed motives lens allows doubt and uses observed actions instead of mind reading', () => {
  const text = 'เจอคนที่คุยดีแต่หวังผลประโยชน์ ขอคำแนะนำ';
  const reply = buildReflectionReply(text);
  assert.equal(humanRealismTopic(text), 'motives');
  assert.match(reply, /สรุปแทน|ไม่ได้แปล|ไม่แปล|ยังไม่/);
  assert.match(reply, /ขอบเขต|ภาระ|การกระทำ/);
  assert.doesNotMatch(reply, /ฉัน|ทุกคนเลว|โลกไม่มีความหมาย/);
});

test('dark reflection does not override listening, topic changes, body distress or safety', () => {
  const text = 'หลงรูปร่างภายนอก อยากได้มุมมอง';
  assert.doesNotMatch(buildReflectionReply(`${text} แค่อยากระบาย`), /ขับถ่าย|เสื่อม|ระบบย่อย/);
  for (const current of ['เราเกลียดร่างกายและรูปร่างตัวเอง อยากได้มุมมอง', `${text} อยากตาย`, `${text} เปลี่ยนเรื่อง`, 'คนหวังผลประโยชน์คืออะไร']) {
    assert.equal(humanRealismReply(current), null, current);
  }
  assert.match(buildReflectionReply(`${text} อยากตาย`), /ความปลอดภัย/);
  assert.doesNotMatch(buildReflectionReply('เปลี่ยนเรื่อง อยากกินชาไข่มุก'), /ร่างกาย|ผลประโยชน์/);
});

test('assistant uses เรา without rewriting user statements or stored recall evidence', async () => {
  assert.match(buildOpening('ทดสอบ'), /เราชื่อ/);
  for (const text of ['ไม่ใช่ เราไม่ได้เศร้า', 'อ่านใจได้ไง', 'อยากตาย', 'อยากตุยเพราะสอบ 555']) {
    assert.doesNotMatch(buildReflectionReply(text), /ฉัน/);
  }
  let body;
  const raw = 'ฉันหลงรูปร่างภายนอก ขอชวนคิด';
  await generateProviderReply({ text: raw }, { apiKey: 'synthetic-test-only', model: 'test-model', fetchImpl: async (_, options) => {
    body = JSON.parse(options.body);
    return Response.json({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'เราชวนดูสิ่งที่เกิดขึ้นจริงได้' }] }] });
  } });
  assert.equal(body.input.at(-1).content, raw);
  assert.match(SYSTEM_PROMPT, /ใช้ “เรา” เรียกตัวเองเสมอ/);
  assert.match(body.instructions, /แยกสิ่งที่สังเกตได้กับการเดาเจตนา/);
  assert.match(body.instructions, /ไม่เพิ่มคำอ่านดวงหรือภาพดาว/);
});
