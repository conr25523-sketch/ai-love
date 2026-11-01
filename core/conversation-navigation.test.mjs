import test from 'node:test';
import assert from 'node:assert/strict';
import { conversationSuggestions } from './conversation-navigation.mjs';

const thread = (text, reply = 'เรื่องนี้มีทั้งสิ่งที่ควบคุมได้และสิ่งที่ต้องรับมือ เราลองแยกสิ่งที่ทำให้เหนื่อยออกจากข้อจำกัดที่มีอยู่ แล้วเลือกเรื่องที่อยากจัดการก่อนก็ได้') => [{ role: 'user', content: text }, { role: 'assistant', content: reply }];

test('optional navigation offers listening and practical help after distress', () => {
  assert.deepEqual(conversationSuggestions(thread('เครียดงาน หัวหน้าเปลี่ยนงานก่อนส่ง')).map(item => item.id), ['listen', 'options', 'expand']);
});
test('navigation never adds emotional coaching to arithmetic or unknown factual requests', () => {
  assert.deepEqual(conversationSuggestions(thread('1+1ได้เท่าไหร่', '1+1 = 2')), []);
  assert.deepEqual(conversationSuggestions(thread('เมืองหลวงของญี่ปุ่นคืออะไร')), []);
});
test('no navigation while awaiting reply, tarot choice or during crisis', () => {
  assert.deepEqual(conversationSuggestions([{ role: 'user', content: 'เครียดจัง' }]), []);
  assert.deepEqual(conversationSuggestions(thread('เครียด', 'เลือกไพ่หนึ่งใบจากสามใบด้านล่าง')), []);
  assert.deepEqual(conversationSuggestions(thread('เศร้าจนอยากตาย')), []);
});
test('listen preference avoids duplicate invitation and reflection can be expanded', () => {
  assert.equal(conversationSuggestions(thread('เราเครียด ขอระบาย ยังไม่ต้องแนะนำ')).some(item => item.id === 'listen'), false);
  assert.deepEqual(conversationSuggestions(thread('ชีวิตมันต้องมีเป้าหมายด้วยเหรอ')).map(item => item.id), ['expand']);
  assert.deepEqual(conversationSuggestions(thread('ชีวิตมันต้องมีเป้าหมายด้วยเหรอ', 'แล้วแต่คุณเลย')), []);
});
test('English urgent distress and its brief follow-ups have no optional coaching chips', () => {
  for (const text of ["I am sad and don't want to live", 'I am sad and want to die', 'I am sad and want to end my life', 'I feel lonely and hurt myself', 'I am overwhelmed and in immediate danger']) {
    assert.deepEqual(conversationSuggestions(thread(text)), []);
  }
  assert.deepEqual(conversationSuggestions([
    { role: 'user', content: "I don't want to be alive" },
    { role: 'assistant', content: 'Are you safe right now?' },
    ...thread('ยังเศร้าอยู่'),
  ]), []);
});
