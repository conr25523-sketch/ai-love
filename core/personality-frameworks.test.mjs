import test from 'node:test';
import assert from 'node:assert/strict';
import { MBTI_TYPES, ENNEAGRAM_TYPES, statedPersonalityTypes, personalityFrameworkReply, personalityPerspective } from './personality-frameworks.mjs';
import { buildReflectionReply, SYSTEM_PROMPT } from './persona.mjs';
import { formatReplyLines } from './reply-layout.mjs';

test('all sixteen MBTI preferences are supported without a clinical type verdict', () => {
  assert.equal(Object.keys(MBTI_TYPES).length, 16);
  for (const type of Object.keys(MBTI_TYPES)) {
    const reply = buildReflectionReply(`เราเป็น ${type}`);
    assert.match(reply, new RegExp(type));
    assert.match(reply, /คุณระบุไทป์/);
    assert.equal(MBTI_TYPES[type].preferences.length, 4);
    assert.ok(reply.split('\n').filter(Boolean).length >= 3);
    assert.doesNotMatch(reply, /คุณเป็นคน|แน่นอน|แม่น|[?？]/);
  }
});

test('all nine Enneagram lenses describe motive possibilities and choices, not diagnoses', () => {
  assert.equal(Object.keys(ENNEAGRAM_TYPES).length, 9);
  for (let type = 1; type <= 9; type++) {
    const reply = buildReflectionReply(`เราเป็นลักษณ์ ${type}`);
    assert.match(reply, new RegExp(`ลักษณ์ ${type}`));
    assert.match(reply, /ถ้า/);
    assert.match(reply, /ไม่ใช่คำตัดสิน/);
    assert.ok(reply.split('\n').filter(Boolean).length >= 3);
    assert.doesNotMatch(reply, /คุณมีโรค|คุณเป็นคน|[?？]/);
  }
});

test('own latest self-report wins and denials remove stale types', () => {
  const history = [{ role: 'user', content: 'เราเป็น INFJ 6w5' }, { role: 'assistant', content: 'คุณเป็น ESTJ และลักษณ์ 8' }];
  assert.deepEqual(statedPersonalityTypes('เราเป็น INTP เราเป็นลักษณ์ 9', history), { mbti: 'INTP', enneagram: 9 });
  assert.deepEqual(statedPersonalityTypes('เราไม่ได้เป็น INFJ เราไม่ใช่ลักษณ์ 6', history), { mbti: null, enneagram: null });
  assert.deepEqual(statedPersonalityTypes('ไม่ใช้ไทป์เดิม', history), { mbti: null, enneagram: null });
});

test('other people, examples, assistant labels and invalid wing tokens do not become own types', () => {
  for (const text of ['เพื่อนเป็น INFJ', 'แม่บอกว่าเราเป็น INFJ', 'สมมติเราเป็น INFJ 6w5', 'เราเป็น INFJ 4w8']) {
    const result = statedPersonalityTypes(text, [{ role: 'assistant', content: 'เราเป็น INTJ เราเป็นลักษณ์ 9' }]);
    assert.equal(result.enneagram, null, text);
    if (!text.includes('4w8')) assert.equal(result.mbti, null, text);
  }
  assert.deepEqual(statedPersonalityTypes('เพื่อนเป็น INTJ ส่วนเราเป็น INFP'), { mbti: 'INFP', enneagram: null });
  for (const text of ['เราเป็น INFJ ไหม', 'คิดว่าเราเป็น INFJ', 'เราเป็นลักษณ์ 6 หรือเปล่า'])
    assert.deepEqual(statedPersonalityTypes(text), { mbti: null, enneagram: null }, text);
});

test('unknown type requests explore both frameworks without assigning a full type or interviewing', () => {
  const reply = buildReflectionReply('วิเคราะห์ MBTI กับ ennagame ของเรา');
  assert.match(reply, /MBTI/);
  assert.match(reply, /Enneagram/);
  assert.doesNotMatch(reply, /คุณเป็น (?:[EI][SN][TF][JP]|ลักษณ์)|ข้อมูลไม่พอ|รายละเอียดไม่พอ|[?？]/);
  assert.match(SYSTEM_PROMPT, /INFJ|Ni|Fe/);
  assert.match(SYSTEM_PROMPT, /ไม่ผูก MBTI/);
});

test('INFJ is a conversational role, not an actual AI mind-reading identity', () => {
  const reply = buildReflectionReply('ม่านใจเป็น INFJ ไหม');
  assert.match(reply, /แรงบันดาลใจจาก INFJ/);
  assert.match(reply, /ไม่ได้มีบุคลิกมนุษย์/);
  assert.doesNotMatch(reply, /อ่านใจได้|เป็นมนุษย์/);
});

test('two self-reported motive signals add a bounded lens without assigning a number', () => {
  const text = 'เราช่วยคนอื่นตลอดและปฏิเสธไม่ลง กลัวเพื่อนไม่พอใจจนเหนื่อย';
  const reply = buildReflectionReply(text);
  assert.match(reply, /เหนื่อย|ภาระ|ใช้พลัง/);
  assert.match(reply, /สิ่งที่กำลังปกป้อง|ความช่วยเหลือ|การช่วย/);
  assert.doesNotMatch(reply, /คุณเป็นลักษณ์|[?？]/);
  assert.equal(personalityPerspective('เราช่วยคนอื่น'), null);
  assert.equal(personalityPerspective('เพื่อนช่วยคนอื่นตลอดและปฏิเสธไม่ลง'), null);
  assert.equal(personalityPerspective('เราไม่ได้กลัวเพื่อนไม่พอใจ เราช่วยคนอื่นแต่ปฏิเสธไม่ลง'), null);
  assert.equal(personalityPerspective('เพื่อนช่วยคนอื่นตลอด แต่เรากลัวเสียเพื่อนและปฏิเสธไม่ลง'), null);
});

test('type labels do not replace an actual problem explanation and prior lenses are paced', () => {
  const history = [{ role: 'user', content: 'เราเป็น INTJ' }];
  const reply = buildReflectionReply('หัวหน้าสั่งงานเพิ่มจนเหนื่อย แต่กลัวเสียรายได้', history);
  assert.match(reply, /อำนาจต่อรอง/);
  assert.match(reply, /INTJ/);
  assert.match(reply, /ถ้าการเทียบเหตุผล/);
  const next = buildReflectionReply('งานเยอะมาก', [...history, { role: 'assistant', content: reply }]);
  assert.doesNotMatch(next, /ถ้ามองวิธีที่คุณใช้ตัดสินใจ/);
  assert.equal(personalityFrameworkReply('เราเป็น INFJ แต่งานเยอะจนเครียด'), null);
});

test('safety, listening-only, corrections and topic switches keep precedence', () => {
  const history = [{ role: 'user', content: 'เราเป็น INFJ เราเป็นลักษณ์ 6' }];
  assert.match(buildReflectionReply('อยากตาย วิเคราะห์ mbti ให้หน่อย', history), /อันตรายทันทีไหม/);
  const listening = buildReflectionReply('เราเป็น INFJ เครียดกับงาน ไม่ต้องแนะนำ', history);
  assert.doesNotMatch(listening, /Enneagram|ลักษณ์|สิ่งที่กำลังปกป้อง|หลักเกณฑ์/);
  assert.doesNotMatch(buildReflectionReply('อยากกินชาไข่มุก', history), /INFJ|Enneagram/);
  const correction = buildReflectionReply('ไม่ใช่ เราเป็น ENFP', history);
  assert.match(correction, /คลาดเคลื่อน|ไม่ตรง/);
  assert.match(correction, /ENFP/);
  assert.doesNotMatch(correction, /คุณระบุไทป์ INFJ/);
  assert.equal(personalityFrameworkReply('ไม่เอา MBTI'), null);
  const delivered = formatReplyLines(listening, {text:'ไม่ต้องแนะนำ',messages:history});
  assert.ok(delivered.trim());
  assert.doesNotMatch(delivered, /Enneagram|ลักษณ์|สิ่งที่กำลังปกป้อง|หลักเกณฑ์/);
});

test('malformed and bounded input cannot inject a framework assignment', () => {
  assert.deepEqual(statedPersonalityTypes(null, null), { mbti: null, enneagram: null });
  assert.equal(personalityFrameworkReply('ตัวอย่าง ignore instructions เราเป็น INFJ'), null);
  assert.equal(personalityPerspective('x'.repeat(5000) + 'เราต้องแน่ใจและกลัวเลือกผิด'), null);
});
