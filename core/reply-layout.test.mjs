import test from 'node:test';
import assert from 'node:assert/strict';
import { formatReplyLines } from './reply-layout.mjs';
import { buildReflectionReply } from './persona.mjs';
import { analyzeStatedProblem } from './problem-analysis.mjs';

const lines = value => value.split('\n').filter(line => line.trim());
const delivered = (text, messages = []) => formatReplyLines(buildReflectionReply(text, messages), { text, messages });

test('short turns remain short without adding a lesson or changing meaning', () => {
  for (const content of ['หวัดดี', 'ยินดีนะ', 'ฝันดีนะ พักให้สบาย', '555', 'ได้เลย พักตรงนี้ก่อนนะ', 'ส่งได้ว่า “เราขอพักก่อน แล้วค่อยคุยกันนะ”']) {
    assert.equal(formatReplyLines(content, { text: 'ขอบคุณนะ' }), content);
    assert.equal(lines(formatReplyLines(content)).length, 1);
  }
  const greeting = delivered('หวัดดี');
  assert.ok(greeting.length < 100);
  assert.doesNotMatch(greeting, /ต้นทุน|ความคาดหวัง|บทเรียน|ตัดสินนิสัย|ต้องเห็นด้วย/);
});

test('formatting preserves substantive responses and existing three-line output', () => {
  const content = 'งานเพิ่มแต่เวลายังเท่าเดิม ความรับผิดชอบกับกำลังที่มีต้องดูคู่กัน ลองจัดลำดับก่อนรับเพิ่ม';
  const reply = formatReplyLines(content);
  assert.equal(reply.replace(/\s+/g, ' '), content);
  assert.equal(reply, content);
  const structured = 'บรรทัดที่หนึ่ง\nบรรทัดที่สอง\nบรรทัดที่สาม';
  assert.equal(formatReplyLines(structured), structured);
  assert.equal(formatReplyLines(''), '');
});

test('listening preferences, stop and safety survive formatting without filler', () => {
  const messages = [{ role: 'user', content: 'ไม่ต้องแนะนำ แค่อยากระบาย' }];
  const listening = delivered('เหนื่อยกับงาน', messages);
  assert.ok(listening.trim());
  assert.doesNotMatch(listening, /ลอง|ต่อรอง|ต้นทุน|เป้าหมายชีวิต/u);
  const stopped = delivered('หยุด');
  assert.ok(stopped.trim());
  assert.doesNotMatch(stopped, /ลอง|[?？]/u);
  assert.match(delivered('อยากตาย'), /อันตรายทันทีไหม/u);
  assert.match(delivered('อยากหายไป'), /ทำร้ายตัวเองไหม/u);
  assert.doesNotMatch(delivered('อยากหายไป'), /ปรัชญา|ต้นทุน|เป้าหมาย/u);
});

test('long prose is wrapped using only its own words, with existing paragraphs preserved', () => {
  const content = 'คุณเล่าว่างานเพิ่มขึ้นแต่เวลายังเท่าเดิม '.repeat(12) + 'ลองเลือกงานที่สำคัญหนึ่งอย่างก่อน';
  const reply = formatReplyLines(content);
  assert.equal(reply.replace(/\s+/g, ' '), content);
  assert.ok(reply.includes('\n'));
  assert.equal(formatReplyLines('ย่อหน้าแรก\n\nย่อหน้าที่สอง'), 'ย่อหน้าแรก\n\nย่อหน้าที่สอง');
  assert.equal(formatReplyLines(null), '');
});

test('detailed analysis ties explicitly conflicting needs to constraints and a review criterion', () => {
  const cases = [
    ['เราเก่งคณิตแต่ไม่ได้ชอบ', 'ability-interest', /ความถนัด|ความเก่ง/u, /เวลา|ต้นทุน/u],
    ['แม่อยากให้เรียนหมอแต่เราไม่อยากเรียน เราอยากเลือกเอง', 'family-choice', /ครอบครัว|ที่บ้าน/u, /ค่าเรียน|ค่าใช้จ่าย/u],
    ['หัวหน้าสั่งงานเพิ่มจนเหนื่อย แต่กลัวเสียรายได้', 'work-income', /รายได้/u, /อำนาจต่อรอง/u],
  ];
  for (const [text, kind, focus, constraint] of cases) {
    const plan = analyzeStatedProblem(text);
    assert.equal(plan.kind, kind);
    assert.ok(plan.facts.length >= 2);
    assert.ok(plan.facts.every(fact => text.includes(fact.evidence)));
    const reply = delivered(text);
    assert.match(reply, focus);
    assert.match(reply, constraint);
    assert.doesNotMatch(reply, /[?？]|ข้อมูลไม่พอ|เขามีเจตนาร้าย/u);
  }
});

test('denials, third-party ability and unrelated subjects do not establish a personal conflict', () => {
  for (const text of ['เราไม่เก่งคณิตและไม่ชอบ', 'เพื่อนเก่งคณิตแต่ไม่ชอบ', 'เราเก่งคณิตแต่ไม่ชอบศิลปะ', 'แม่ไม่ได้บังคับให้เรียน เราไม่อยากเรียน', 'งานเยอะแต่ไม่กลัวเสียรายได้', 'ไม่รู้จะเรียนอะไร'])
    assert.equal(analyzeStatedProblem(text), null, text);
});
