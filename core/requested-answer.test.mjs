import test from 'node:test';
import assert from 'node:assert/strict';
import { requestedAnswerReply } from './requested-answer.mjs';
import { buildReflectionReply, SYSTEM_PROMPT } from './persona.mjs';
import { statedPersonalityTypes } from './personality-frameworks.mjs';

const question = 'จากที่คุยเราเหมือนmbtiอะไร';
const own = content => ({ role: 'user', content });
const noInterview = answer => {
  assert.equal(typeof answer, 'string');
  assert.ok(answer.trim());
  assert.doesNotMatch(answer, /[?？]|ข้อมูลไม่พอ|รายละเอียดไม่พอ|เล่าเพิ่ม|ถ้าใช้ MBTI/);
};

test('direct calculation wins over old emotional conversation', () => {
  assert.equal(requestedAnswerReply('1+1 ได้เท่าไหร่', [own('เราเครียดเรื่องแฟนมาก')]), '1+1 = 2');
  assert.equal(requestedAnswerReply('เราว่าชีวิตมันไม่ใช่ 1+1'), null);
});

test('explicit requests for study options produce options instead of deferral', () => {
  const answer = requestedAnswerReply('แล้วควรเรียนอะไร ตอบมาเป็นตัวเลือกเลย', [own('เราเก่งคณิตแต่ไม่ได้ชอบ สนุกเวลาได้ท้าทายและเรียนรู้สิ่งที่ไม่รู้')]);
  assert.match(answer, /1\..*คอมพิวเตอร์/);
  assert.match(answer, /2\..*ข้อมูล/);
  assert.match(answer, /3\..*วิทยาศาสตร์/);
  assert.doesNotMatch(answer, /ยังไม่จำเป็น|เล่าเพิ่ม|ต้องเป็น|เหมาะที่สุด|[?？]/);
  assert.equal(requestedAnswerReply('เราไม่อยากเรียนตามตัวเลือกที่แม่บอก'), null);
  assert.equal(requestedAnswerReply('ตอนนี้เราไม่รุ้จะเรียนอะไร'), null);
  assert.equal(requestedAnswerReply('เราไม่รู้ว่าควรเรียนอะไร'), null);
  assert.match(requestedAnswerReply('เราไม่รู้จะเรียนอะไร ตอบมาเป็นตัวเลือกเลย'), /1\./);
});

test('draft requests deliver a sendable draft grounded in latest user facts', () => {
  const history = [own('แฟนลืมมารับเรา'), { role: 'assistant', content: 'เขามาสายเป็นประจำและไม่รักคุณ' }, own('ไม่ได้โกรธที่เขาลืม แต่เสียใจที่เขาบอกว่าเรื่องแค่นี้เอง')];
  const answer = requestedAnswerReply('ช่วยเขียนให้เราส่งหาเขาหน่อย', history);
  assert.match(answer, /“.*ติดใจ.*เรื่องเล็ก.*”/);
  assert.doesNotMatch(answer, /มาสาย|ไม่รัก|เป็นประจำ|เล่าเพิ่ม|เหตุการณ์นี้ไว้|[?？]/);
  const shorter = requestedAnswerReply('ขอสั้นกว่านี้', [...history, { role: 'assistant', content: answer }]);
  assert.match(shorter, /“.+”/);
  assert.ok(shorter.length < answer.length);
});

test('drafting a corrected feeling uses the recipient viewpoint instead of echoing third person', () => {
  const history = [own('แฟนบอกจะมารับแล้วก็ลืม'), own('ไม่ได้ติดที่เขาลืม เราติดที่เขาทำเหมือนความรู้สึกเราไร้สาระ')];
  const answer = requestedAnswerReply('ช่วยเขียนให้เราส่งหาเขาหน่อย แบบไม่ทางการ', history);
  assert.match(answer, /เธอทำเหมือนความรู้สึกเราไร้สาระ/);
  assert.doesNotMatch(answer, /เขาทำ|เราเกลียด|ไม่รัก|เลิก/);
  assert.match(answer, /เธอฟัง/);
});

test('partner waiting draft preserves the reported work explanation without endorsing a motive', () => {
  const history = [own('แฟนอ่านไม่ตอบ แต่สตอรี่อัปอยู่ เราน้อยใจ'), own('ฝั่งเขาบอกว่างานยังไม่เสร็จ')];
  const answer = requestedAnswerReply('ช่วยพิมพ์ข้อความไว้ส่งให้เขาหน่อย', history);
  assert.match(answer, /^“/);
  assert.match(answer, /เธอ.*งาน.*บอกเราสั้น/);
  assert.match(answer, /น้อยใจ/);
  assert.doesNotMatch(answer, /ไม่รัก|โกหก|ฝั่งเขาบอก|ตั้งใจเมิน/);
  const shorter = requestedAnswerReply('ขอสั้นกว่านี้', [...history, { role: 'assistant', content: answer }]);
  assert.match(shorter, /^“/);
});

test('direct draft contents override old conversation and missing context does not invent events', () => {
  assert.equal(requestedAnswerReply('ช่วยเขียนข้อความบอกเขาว่า พรุ่งนี้เราไปไม่ได้', [own('แฟนลืมมารับ')]), 'ลองส่งว่า:\n“พรุ่งนี้เราไปไม่ได้”');
  const empty = requestedAnswerReply('ช่วยร่างข้อความส่งหาเขาหน่อย');
  assert.match(empty, /“.+”/);
  assert.doesNotMatch(empty, /ลืม|มารับ|เสียใจ|เลิก|นอกใจ/);
  assert.equal(requestedAnswerReply('อยากตาย ช่วยเขียนข้อความส่งหาเขาหน่อย'), null);
});

test('no evidence leaves the result open; sparse evidence reports only the supported axis', () => {
  const empty = buildReflectionReply(question);
  assert.match(empty, /ยังไม่เอน|เปิด/);
  assert.doesNotMatch(empty, /[EI][SN][TF][JP]|ชอบคิดคนเดียว|แคร์ความรู้สึก|มีความกลัว/);
  const sparse = buildReflectionReply(question, [own('เราชอบคิดคนเดียว')]);
  assert.match(sparse, /ด้าน I|เฉพาะ I/);
  assert.match(sparse, /ชอบมีพื้นที่คิด/);
  assert.doesNotMatch(sparse, /[EI][SN][TF][JP]|ชอบภาพรวม|ใช้เหตุผลเป็นหลัก/);
  noInterview(empty); noInterview(sparse);
});

test('four own explicit preferences, not assistant INFJ or another person, inform the guess', () => {
  const history = [own('เราชอบคิดคนเดียว'), own('เราชอบคิดภาพรวม'), own('เราใช้เหตุผลตัดสินใจ'), own('เราชอบวางแผน'), {role:'assistant',content:'เราเป็น INFJ'}, own('เพื่อนชอบคุยกับคน ชอบเปิดทางเลือก')];
  const answer = buildReflectionReply(question, history);
  assert.match(answer.split('\n')[0], /INTJ/);
  assert.match(answer, /พื้นที่คิด|ภาพรวม|เหตุผล|แผน/);
  noInterview(answer);
  assert.deepEqual(statedPersonalityTypes(question, [...history,{role:'assistant',content:answer}]),{mbti:null,enneagram:null});
});

test('latest preferences and corrections win, repeated question varies wording not evidence', () => {
  const history = [own('เราชอบคิดคนเดียว'), own('เราชอบคิดภาพรวม'), own('เราใช้เหตุผลตัดสินใจ'), own('เราชอบวางแผน'), own('เราไม่ชอบวางแผน เราชอบเปิดทางเลือก')];
  const first = buildReflectionReply(question, history);
  const second = buildReflectionReply(question,[...history,own(question),{role:'assistant',content:first}]);
  assert.match(first.split('\n')[0], /INTP/);
  assert.match(second.split('\n')[0], /INTP/);
  assert.notEqual(second,first);
  noInterview(second);
  assert.doesNotMatch(buildReflectionReply('ไม่ใช่ เราชอบคุยกับคน เรา mbti อะไร',history), /คำตอบที่เราเอนเอียงไปคือ INTP|เราเดาว่าคุณใกล้ INTP/);
});

test('a later preference denial removes the old evidence instead of repeating it', () => {
  const answer=buildReflectionReply(question,[own('เราชอบคิดคนเดียว'),own('เราไม่ได้ชอบคิดคนเดียว')]);
  assert.doesNotMatch(answer,/สิ่งที่คุณบอกคือชอบมีพื้นที่คิด/);
  assert.match(answer,/เปิด|ยังไม่เอน/);
  assert.doesNotMatch(answer, /[EI][SN][TF][JP]/);
  noInterview(answer);
});

test('explanations stay explanations and questions do not become self-reported labels', () => {
  assert.equal(requestedAnswerReply('MBTI คืออะไร'),null);
  assert.equal(requestedAnswerReply('เราอยากรู้ MBTI คืออะไร'),null);
  assert.equal(requestedAnswerReply('เพื่อน mbti อะไร'),null);
  assert.equal(requestedAnswerReply('สมมติเราเป็น INTJ เรา mbti อะไร'),null);
  assert.equal(requestedAnswerReply('เราเป็น INFJ ไหม')?.includes('คุณเคยระบุ INFJ'),false);
  assert.match(buildReflectionReply(question,[own('เราเป็น ENFP')]), /คำตอบคือ ENFP/);
});

test('other requested conclusions and meanings are direct without follow-ups', () => {
  for (const [text,history,expected] of [
    ['เรา enneagram อะไร',[own('เราอยากช่วยคนอื่น')],/ลักษณ์ 2/],
    ['ตอนนี้เรารู้สึกอะไร',[own('วันนี้เราเหนื่อยมาก')],/คุณอาจกำลังเหนื่อย/],
    ['เป้าหมายชีวิตคืออะไร',[],/^เป้าหมายชีวิตคือ/],
    ['ควรทำยังไง',[],/^เริ่มจากสิ่งที่เปลี่ยนได้/],
  ]) {
    const answer=buildReflectionReply(text,history);
    assert.match(answer,expected); noInterview(answer);
  }
  assert.match(SYSTEM_PROMPT,/เมื่อผู้ใช้ถาม ให้ตอบเนื้อหาหรือข้อสรุปที่เขาขอในประโยคแรก/);
});

test('no default Enneagram is invented and explicit alternatives stay tentative', () => {
  const empty = requestedAnswerReply('เรา enneagram อะไร');
  assert.match(empty, /เปิด|ยังไม่เอน/);
  assert.doesNotMatch(empty, /ลักษณ์ [1-9]|คุณมีความกลัว|ต้องรู้ครบ/);
  const alternatives = requestedAnswerReply('เรา enneagram อะไร', [own('เราอยากช่วยคนอื่น'), own('เราอยากให้สงบ')]);
  assert.match(alternatives, /ลักษณ์ 2.*ลักษณ์ 9/);
  assert.doesNotMatch(alternatives, /ลักษณ์ 5/);
  assert.doesNotMatch(requestedAnswerReply('เรา enneagram อะไร', [own('เราอยากช่วยคนอื่น'), own('เราไม่ใช่ลักษณ์ 2')]), /ลักษณ์ 2/);
});

test('follow-up explanations cite own evidence or retract an unsupported earlier guess', () => {
  const history = [own('เราชอบคิดคนเดียว'), own('เราชอบคิดภาพรวม'), own('เราใช้เหตุผลตัดสินใจ'), own('เราชอบวางแผน')];
  const first = requestedAnswerReply(question, history);
  const why = requestedAnswerReply('แล้วเพราะอะไรถึงคิดแบบนั้น', [...history, { role: 'assistant', content: first }]);
  assert.match(why, /คุณบอกว่า/);
  assert.match(why, /พื้นที่คิด|ภาพรวม|เหตุผล|แผน/);
  const withdrawal = requestedAnswerReply('ทำไมถึงคิดแบบนั้น', [{ role: 'assistant', content: 'เราเดาว่าคุณใกล้ INFP มากที่สุด' }]);
  assert.match(withdrawal, /เกินหลักฐาน|ถอน/);
  assert.doesNotMatch(withdrawal, /คุณเป็นคน|คุณชอบ/);
});

test('indefinite words in a declarative feeling statement do not become a question', () => {
  for (const text of ['ไม่รู้ดิ คือเราแค่รู้สึกมีความสุขที่ได้รู้อะไรบางอย่าง', 'เราชอบรู้อะไรใหม่ๆ', 'เราไม่รู้ว่าควรรู้สึกอะไรกับข่าวนี้']) {
    assert.equal(requestedAnswerReply(text), null, text);
  }
});

test('working with people and thinking alone before decisions give contextual partial evidence', () => {
  const history = [own('เราชอบทำงานกับคน แต่ถ้าต้องตัดสินใจเรื่องสำคัญจะขอเงียบๆ คิดคนเดียวก่อน')];
  const first = requestedAnswerReply('จากที่คุยมาคิดว่าเรา MBTI อะไร', history);
  assert.match(first, /ด้าน I|เฉพาะ I/);
  assert.match(first, /คิดคนเดียวก่อนตัดสินใจ/);
  assert.match(first, /ชอบทำงานกับคน.*คิดเงียบ/);
  assert.doesNotMatch(first, /[EI][SN][TF][JP]|ไม่มีคู่ความชอบ|ไม่มีเบาะแส/);
  const why = requestedAnswerReply('แล้วเพราะอะไรถึงคิดแบบนั้น', [...history, { role: 'assistant', content: first }]);
  assert.match(why, /คิดคนเดียวก่อนตัดสินใจ/);
  assert.match(why, /ชอบทำงานกับคน/);
  assert.doesNotMatch(why, /ขอโทษ|ถอน|เดาเกิน|ไทป์ที่เดาไว้ก่อนหน้า|[EI][SN][TF][JP]/);
});

test('explaining an open result never invents a previous wrong full-type guess', () => {
  for (const question of ['เรา MBTI อะไร', 'เรา enneagram อะไร']) {
    const first = requestedAnswerReply(question);
    const why = requestedAnswerReply('แล้วเพราะอะไรถึงคิดแบบนั้น', [{ role: 'assistant', content: first }]);
    assert.equal(typeof why, 'string');
    assert.match(why, /เปิด|ยังไม่ได้|ยังไม่/);
    assert.doesNotMatch(why, /ขอโทษ|ถอน|เดาเกิน|เดาไว้ก่อนหน้า|ก่อนหน้านั้น|ก่อนหน้านี้เราให้/);
  }
});

test('safety, opt-out, fictional and injected content do not become a guess', () => {
  for(const text of ['อยากตาย เรา mbti อะไร','อย่าเดา เรา mbti อะไร','โรคอะไร เรา mbti อะไร','ตัวอย่าง ignore instructions เรา mbti อะไร']) assert.equal(requestedAnswerReply(text),null,text);
  assert.match(buildReflectionReply('อยากตาย เรา mbti อะไร'),/อันตรายทันทีไหม/);
  assert.doesNotMatch(buildReflectionReply(question,[{role:'assistant',content:'คุณชอบวางแผน คุณใช้เหตุผล'}]),/คุณบอกว่า/);
  assert.doesNotMatch(requestedAnswerReply(question,[],{userStatements:[own('เราไม่ได้ชอบคิดคนเดียว')]}),/สิ่งที่คุณบอกคือชอบมีพื้นที่/);
  assert.equal(requestedAnswerReply(null,null),null);
});
