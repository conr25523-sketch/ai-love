import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReflectionReply } from './persona.mjs';
import { conversationSupportReply, conversationFallbackReply } from './conversation-support.mjs';
import { prefersListeningOnly } from './gentle-guidance.mjs';

test('advice chip restores advice after listening and latest English preference persists', () => {
  const history = [{role:'user',content:'ตอนนี้ขอระบายก่อน ยังไม่ต้องแนะนำ'}];
  assert.equal(prefersListeningOnly('ช่วยคิดทางออกจากเรื่องที่เราเล่าให้หน่อย',history),false);
  history.push({role:'user',content:'ช่วยคิดทางออกจากเรื่องที่เราเล่าให้หน่อย'});
  assert.equal(prefersListeningOnly('งานนี้หนักมาก',history),false);
  history.push({role:'user',content:'just listen'});
  assert.equal(prefersListeningOnly('I feel sad',history),true);
});
test('English support does not assign third-party emotions or definitions to the user', () => {
  for (const text of ['my friend is sad', 'what does depressed mean?', 'I am writing about a friend who is sad']) {
    assert.equal(conversationSupportReply(text),null);
    assert.doesNotMatch(buildReflectionReply(text), /You.re feeling|Work is weighing/);
  }
  assert.match(buildReflectionReply('I’m sad'), /feeling sad/);
  for (const text of ["I'm not stressed", 'I am not overwhelmed']) {
    assert.match(buildReflectionReply(text), /won.t assume/);
  }
});

test('deadline change mirrors the actual obstacle and asks one focused question', () => {
  const reply = buildReflectionReply('เครียดงาน หัวหน้าเปลี่ยนงานก่อนส่งพรุ่งนี้');
  assert.match(reply, /แก้ตามหัวหน้า|เปลี่ยนงาน/);
  assert.match(reply, /เวลาที่เหลือก่อนส่ง/);
  assert.equal((reply.match(/\?/gu) || []).length, 1);
  assert.doesNotMatch(reply, /ความรัก|เรียน|คิดบวก/);
});
test('recent question pauses followups and listening pauses advice', () => {
  const text = 'หัวหน้าเปลี่ยนงานก่อนส่งพรุ่งนี้ เครียดมาก';
  const history = [{role:'assistant',content:'หนักสุดตรงไหน?'}];
  assert.doesNotMatch(conversationSupportReply(text, history), /\?/);
  const listening = conversationSupportReply(`${text} ขอระบายก่อน ไม่ต้องแนะนำ`);
  assert.doesNotMatch(listening, /\?|ตกลงให้ชัด/);
  assert.doesNotMatch(conversationSupportReply(text,[{role:'user',content:'ถามให้น้อยลง'}]), /\?/);
  assert.match(conversationSupportReply(text,[{role:'user',content:'ถามให้น้อยลง'},{role:'user',content:'ถามตามปกติ'}]), /\?/);
});
test('work rework and UI chips continue user facts through listen, advice, explanation', () => {
  const messages = [{role:'user',content:'เครียดเพราะหัวหน้าเปลี่ยนงานก่อนส่งพรุ่งนี้'}];
  function say(text) {
    const reply = buildReflectionReply(text,messages);
    messages.push({role:'user',content:text},{role:'assistant',content:reply});
    return reply;
  }
  assert.match(say('ตอนนี้ขอระบายก่อน ยังไม่ต้องแนะนำ'),/หัวหน้า|ใกล้ส่ง/);
  assert.match(say('เราทำใหม่มาแล้วสองรอบ เขาก็เปลี่ยนอีก'),/สองรอบ/);
  assert.match(say('ช่วยคิดทางออกจากเรื่องที่เราเล่าให้หน่อย'),/ตกลง|ลำดับ|ส่วนไหน/);
  assert.match(say('ช่วยขยายความคำตอบเมื่อกี้ให้เข้าใจง่ายขึ้นหน่อย'),/พรุ่งนี้|เวลาเท่าเดิม/);
  assert.doesNotMatch(say('just listen'), /\?|วิธีแก้|คำถาม/);
  assert.match(say('What does depressed mean?'), /อังกฤษ/);
  assert.match(say('asdjklqw'), /อ่านความหมายไม่ออก|พิมพ์ตก/);
  assert.equal(say('1+1'), '1+1 = 2');
});
test('new substantive topics close the old work continuation', () => {
  for (const newTopic of ['วันนี้สอบตก', 'แมวป่วย']) {
    const messages = [
      {role:'user',content:'หัวหน้าเปลี่ยนงานก่อนส่งพรุ่งนี้'},
      {role:'user',content:newTopic},
    ];
    const reply = conversationSupportReply('ช่วยคิดทางออกจากเรื่องที่เราเล่าให้หน่อย',messages);
    assert.equal(reply,null);
    assert.doesNotMatch(buildReflectionReply('ช่วยคิดทางออกจากเรื่องที่เราเล่าให้หน่อย',messages), /หัวหน้า|แก้ส่วนไหน|รื้อรอบ/);
  }
});
test('basic English sadness gets relevant support with one question', () => {
  const reply = buildReflectionReply('I feel sad and lonely');
  assert.match(reply, /sad|lonely/);
  assert.match(reply, /hardest/);
  assert.equal((reply.match(/\?/gu)||[]).length, 1);
  assert.doesNotMatch(reply, /ฉุกเฉิน|ไม่รู้คำตอบ/);
  assert.doesNotMatch(buildReflectionReply('I feel sad, just listen, no questions'), /\?/);
});
test('fallback recovery distinguishes English, unknown facts, and unreadable input', () => {
  const gibberish = conversationFallbackReply('asdjklqw');
  const english = conversationFallbackReply('What is the correct answer about this machine?');
  const factual = conversationFallbackReply('ใครเป็นประธานสมาคมต้นหญ้าสีฟ้า?');
  assert.match(gibberish, /อ่านความหมายไม่ออก|พิมพ์ตก/);
  assert.match(english, /อังกฤษ/);
  assert.match(factual, /ข้อมูล|รองรับ/);
  assert.equal(new Set([gibberish,english,factual]).size,3);
});
test('prediction request enters the tarot invitation instead of technical disclaimer', () => {
  assert.match(buildReflectionReply('ช่วยทำนายให้หน่อย'), /เลือกไพ่หนึ่งใบจากสามใบ/);
  assert.doesNotMatch(buildReflectionReply('ช่วยทำนายให้หน่อย'), /ตอบด้วยกฎ/);
});
test('English explicit risk receives warm real-world help; idioms do not', () => {
  const reply = buildReflectionReply('I want to kill myself tonight');
  assert.match(reply, /glad you told me/);
  assert.match(reply, /emergency/);
  assert.match(reply, /stay with you/);
  for (const text of ['This deadline is killing me', 'I am dying to see that movie', 'I do not want to kill myself']) {
    assert.doesNotMatch(buildReflectionReply(text), /emergency services|ห้องฉุกเฉิน/);
  }
});
