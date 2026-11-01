import test from 'node:test';
import assert from 'node:assert/strict';
import { relationshipSupportReply, isBreakupDisclosure } from './relationship-support.mjs';
import { gentleGuidanceReply } from './gentle-guidance.mjs';

const user = content => ({ role: 'user', content });
const assistant = content => ({ role: 'assistant', content });

test('sparse breakup disclosure validates stated duration and asks one focused question', () => {
  const reply = relationshipSupportReply('เราเลิกกับแฟนที่คบมา3ปี');
  assert.match(reply, /3 ปี/);
  assert.match(reply, /ส่วนไหน.*หนัก.*ที่สุด\?/);
  assert.doesNotMatch(reply, /บริษัท|คำพิพากษา|สิ่งที่ต้องฝึก|เขาไม่รัก|เขาทิ้ง/);
  assert.equal((reply.match(/\?/g) || []).length, 1);
});

test('breakup guilt never becomes company or performance failure advice', () => {
  const text = 'เราเลิกกับแฟนที่คบมา3ปี รู้สึกผิดที่เลิก ผิดหวังในตัวเอง';
  const reply = relationshipSupportReply(text);
  assert.match(reply, /รู้สึกผิด|ความผูกพัน/);
  assert.doesNotMatch(reply, /บริษัท|คำพิพากษา|สิ่งที่ต้องฝึก|ประสิทธิภาพ|ไม่มีคุณค่า/);
  assert.equal(gentleGuidanceReply(text, [], undefined, { respondOnDisclosure: true }), null);
});

test('explicit sadness and anger are reflected before offering a perspective', () => {
  const reply = relationshipSupportReply('เลิกกับแฟนแล้วทั้งเสียใจและโกรธ');
  assert.match(reply, /ทั้งความเสียใจและความโกรธ/);
  assert.doesNotMatch(reply, /เขานอกใจ|เขาเห็นแก่ตัว|ต้องให้อภัย/);
});

test('listening and question preferences persist without advice or followup', () => {
  const history = [user('ขอระบายก่อน ไม่ต้องถามนะ')];
  const reply = relationshipSupportReply('เพิ่งเลิกกับแฟนที่คบกันมาสามปี เสียใจมาก', history);
  assert.match(reply, /สาม ปี|เสียใจ/);
  assert.doesNotMatch(reply, /\?|ลอง|ควร|กลับไปจะเหมาะ/);
});

test('ongoing longing retains actual breakup context but pauses questions', () => {
  const first = 'เราเลิกกับแฟนที่คบมา3ปี';
  const reply = relationshipSupportReply('ยังคิดถึงเขาอยู่', [user(first), assistant(relationshipSupportReply(first))]);
  assert.match(reply, /3 ปี|ความสัมพันธ์/);
  assert.match(reply, /คิดถึง/);
  assert.doesNotMatch(reply, /คุณบอกว่ายังเสียใจ/);
  assert.doesNotMatch(reply, /\?|บริษัท|หัวหน้า/);
});

test('new subject, third-party story, quotation and negation do not become personal breakup', () => {
  const history = [user('เราเลิกกับแฟนที่คบมา3ปี')];
  for (const text of ['งานที่บริษัทเครียดมาก', 'เพื่อนเราเลิกกับแฟน', 'เขาเลิกกับแฟนของเขา', 'สมมติว่าเราเลิกกับแฟน', 'คำว่าอกหักแปลว่าอะไร', 'เรายังไม่เลิกกัน', 'เราไม่ได้เลิกกับแฟน', 'ไม่อยากเลิกกับแฟน']) {
    assert.equal(relationshipSupportReply(text, history), null, text);
  }
});

test('acute harm routes remain owned by safety handling', () => {
  assert.equal(relationshipSupportReply('เลิกกับแฟนแล้วอยากตาย'), null);
});

test('overwhelmed breakup distress and being left receive grounded support', () => {
  const reply = relationshipSupportReply('แฟนทิ้งเราไปแล้ว เสียใจจนไม่ไหวแล้ว');
  assert.match(reply, /ความสัมพันธ์|เสียใจ/);
  assert.doesNotMatch(reply, /บริษัท|คำพิพากษา|เขาไม่รัก|ห้องฉุกเฉิน/);
  assert.equal(isBreakupDisclosure('แฟนทิ้งเราไปแล้ว'), true);
  assert.equal(isBreakupDisclosure('แฟนบอกเลิกเรา'), true);
});

test('negated guilt is not mirrored as guilt, nor anger as sadness', () => {
  const reply = relationshipSupportReply('เลิกกับแฟนแล้ว ไม่ได้รู้สึกผิด ไม่เศร้า แต่โกรธ');
  assert.match(reply, /ความโกรธที่คุณเล่า/);
  assert.doesNotMatch(reply, /คุณบอกว่ารู้สึกผิด|คุณบอกว่ายังเสียใจ|ทั้งความเสียใจ/);
  assert.equal(relationshipSupportReply('เราถูกบอกว่างานไม่ดี'), null);
});

test('breakup recognition is bounded to stated events, not marriage/work substrings', () => {
  assert.equal(isBreakupDisclosure('เครียดงานแต่งงาน'), false);
  assert.equal(isBreakupDisclosure('แฟนบอกเลิก'), true);
});
