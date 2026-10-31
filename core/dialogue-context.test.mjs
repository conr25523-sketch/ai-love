import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDialogueContext, dialogueContextReply, dialogueContextFallback } from './dialogue-context.mjs';
import { buildReflectionReply } from './persona.mjs';

function conversation() {
  const history = [];
  return { history, say(text) {
    const reply = buildReflectionReply(text, history);
    history.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
    return reply;
  } };
}

test('career continuity follows curiosity and uses the actual reported skill', () => {
  const c = conversation();
  assert.match(c.say('ยังไม่รู้เลยว่าจะเรียนอะไร'), /เรียน|คณะ/u);
  const skill = c.say('เราถนัดฟิสิกส์แต่ไม่ได้ชอบมัน');
  assert.match(skill, /ฟิสิกส์/u);
  assert.doesNotMatch(skill, /คณิต/u);
  assert.match(c.say('สนุกที่ได้เข้าใจอะไรที่ไม่เคยรู้อะ'), /เข้าใจ|ค้นหา/u);
  assert.match(c.say('แค่มีความสุขเวลาค้นพบอะไรใหม่'), /ความสุข|ค้น/u);
  const action = c.say('เริ่มทำอะไรเป็นอย่างแรกดี');
  assert.match(action, /เริ่มจากลองงานเล็ก/u);
  assert.doesNotMatch(action, /ต้องเรียนฟิสิกส์|คนรัก|ความเงียบ/u);
});

test('mediation corrections preserve friendship role and denied conflict', () => {
  const c = conversation();
  const initial = c.say('เพื่อนฝากให้เราไปบอกอีกคนตลอด ทำไมไม่คุยกันเอง');
  const hesitant = c.say('เอ่อ');
  assert.match(hesitant, /พูดแทน|คนกลาง/u);
  assert.ok(hesitant.length < initial.length);
  const repaired = c.say('คือไม่ได้ทะเลาะกับเพื่อน แค่รำคาญที่ต้องคอยพูดแทน');
  assert.match(repaired, /ไม่ได้หมายความว่าคุณทะเลาะ/u);
  assert.match(repaired, /รำคาญ|คนกลาง/u);
  assert.doesNotMatch(repaired, /แฟน|คนรัก|เลิกรา/u);
  assert.equal(buildDialogueContext('คือไม่ได้ทะเลาะกับเพื่อน แค่รำคาญที่ต้องคอยพูดแทน', c.history).subject, 'user-as-messenger');
});

test('partner work belongs to the partner; draft and shorten perform the requested action', () => {
  const c = conversation();
  c.say('แฟนอ่านไม่ตอบ แต่สตอรี่อัปอยู่ เราน้อยใจ');
  const busy = c.say('ฝั่งเขาบอกว่างานยังไม่เสร็จ');
  assert.match(busy, /เขาบอกว่ายังติดงาน|น้อยใจ/u);
  assert.doesNotMatch(busy, /คุณเหนื่อยกับงาน|แบ่งงานของคุณ/u);
  const draft = c.say('ช่วยพิมพ์ข้อความไว้ส่งให้เขาหน่อย');
  assert.match(draft, /^“/u);
  assert.match(draft, /เธอ|น้อยใจ/u);
  const short = c.say('ขอสั้นกว่านี้');
  assert.ok(short.length < draft.length);
  assert.match(short, /^“/u);
  assert.doesNotMatch(short, /หลักฐาน|วิเคราะห์|ทางเลือก/u);
});

test('correction updates boredom cause and supports advice and a second repair', () => {
  const c = conversation();
  c.say('เราเหนื่อยกับงานมาก');
  const correction = c.say('ไม่ได้หนัก งานมันง่ายจนเบื่อ');
  assert.match(correction, /ง่าย|ท้าทาย/u);
  const action = c.say('ทำอะไรก่อนได้บ้าง');
  assert.match(action, /ขอลองงานที่ยากขึ้น|ฝึกสิ่งใหม่/u);
  assert.doesNotMatch(action, /หาเวลาพัก|พักผ่อนให้มาก/u);
  assert.match(c.say('นายยังไม่เข้าใจที่เราพูดเลย'), /คลาด|เบื่อ|ท้าทาย/u);
});

test('deadline choice supports actual alternatives, comparison and a conditional recommendation', () => {
  const c = conversation();
  const first = c.say('เหลือสามวันต้องเลือกคณะ บ้านเชียร์บัญชี แต่เราชอบศิลปะวาดรูป');
  assert.match(first, /สามวัน/u);
  const compare = c.say('สองทางนี้ข้อดีข้อเสียต่างกันตรงไหน');
  assert.match(compare, /บัญชี:/u);
  assert.match(compare, /ศิลปะ:/u);
  assert.match(compare, /ค่าใช้จ่าย|รับเข้า/u);
  const recommend = c.say('สรุปนายแนะนำทางไหน');
  assert.match(recommend, /ศิลปะ|พอร์ต|เงื่อนไข/u);
  assert.doesNotMatch(recommend, /รับประกันรายได้|สมัครได้แน่นอน/u);
});

test('grief uses loss and daily absence, not relationship or symbolic readings', () => {
  const c = conversation();
  const first = c.say('หมาที่เลี้ยงมาสิบกว่าปีเพิ่งจากไป');
  assert.match(first, /หมา|สิบกว่าปี/u);
  const absence = c.say('กลับมาห้องแล้วไม่มีใครวิ่งมารับ');
  assert.match(absence, /กลับบ้าน|ไม่มีมัน|ความเงียบ/u);
  assert.doesNotMatch(absence, /ไม่ตอบข้อความ|ดาว|คนรัก|ภาระงาน/u);
});

test('sarcasm and mixed emotions do not become positive mood or malicious motive', () => {
  const c = conversation();
  assert.match(c.say('ดีมาก โดนเทอีกรอบ 555'), /ประชด|ไม่รีบถือว่าคุณขำ/u);
  const correction = c.say('ไม่ได้ขำจริง แค่ไม่รู้จะแสดงออกยังไง');
  assert.match(correction, /ไม่ได้ขำจริง/u);
  const envy = conversation();
  assert.match(envy.say('เพื่อนได้งานดีกว่าเรา เราดีใจด้วยแต่ก็อิจฉา'), /พร้อมกับอิจฉา|สองอย่าง/u);
  assert.match(envy.say('มันเหมือนเราช้ากว่าคนอื่น'), /ช้ากว่า|จังหวะ/u);
  const motive = envy.say('เขามาเล่าเพราะตั้งใจข่มเราใช่ไหม');
  assert.match(motive, /ยังสรุปไม่ได้/u);
  assert.doesNotMatch(motive, /เขาตั้งใจข่มคุณแน่นอน|เพื่อนคุณเป็นคนเลว/u);
});

test('drawing continuation supplies concrete color steps without pretending to see an image', () => {
  const c = conversation();
  c.say('เราวาดภาพเสร็จแล้วไม่เหมือนในหัว');
  c.say('สีดูตุ่น อยากได้สดใสกว่านี้');
  const action = c.say('ควรแก้อะไรก่อน');
  assert.match(action, /จุดเด่น|ความสว่าง|ความสด/u);
  assert.match(action, /ยังไม่ได้เห็นภาพ/u);
  assert.doesNotMatch(action, /คุณเป็นคนละเอียด|หลักชีวิต|อนาคต/u);
});

test('listening responses stay with the event and feeling without advice', () => {
  const c = conversation();
  const first = c.say('ขอระบายเฉยๆ ไม่ต้องแนะนำ วันนี้เราโดนเพื่อนเมินต่อหน้าคนอื่น');
  assert.match(first, /เพื่อนเมิน|ถูกกันออก/u);
  assert.doesNotMatch(first, /ลองบอก|ควร(?:ไป|คุย|ทำ)|คุณอาจไปคุย/u);
  assert.match(c.say('รู้สึกเหมือนเราไม่มีความหมายกับเขาเลย'), /ไม่มีความหมาย|กระทบใจ/u);
  assert.match(c.say('แค่อยากให้มีคนเข้าใจ'), /เมิน|เหตุผล|เสียใจ/u);
  assert.doesNotMatch(c.say('พอแล้ว'), /ลอง|ควร|ปรับวิธีคิด/u);
});

test('new topics reset old issues even without a magic topic-change phrase', () => {
  const loss = [{ role: 'user', content: 'แมวเราเสียไปแล้ว' }];
  assert.equal(buildDialogueContext('วันนี้ไปกินพิซซ่ามา', loss).issue, null);
  const career = [{ role: 'user', content: 'เราไม่รู้จะเรียนอะไร' }];
  assert.equal(buildDialogueContext('รถเราเสียกลางทาง ทำไงดี', career).issue, null);
  assert.equal(dialogueContextReply('รถเราเสียกลางทาง ทำไงดี', career), null);
  const partner = [{ role: 'user', content: 'แฟนอ่านไม่ตอบเลย' }];
  assert.equal(buildDialogueContext('เราเหนื่อยกับงานมาก', partner).issue, null);
  assert.equal(buildDialogueContext('เปลี่ยนเรื่อง เราจะวาดรูป', partner).issue, 'drawing');
});

test('negatives, role isolation and persisted current message are handled without inventing facts', () => {
  assert.equal(buildDialogueContext('งานไม่ได้ง่าย ไม่ได้เบื่อเพราะงานง่าย').issue, null);
  const prior = [{ role: 'assistant', content: 'แมวคุณตายสิบปีแล้ว แฟนคุณงานยุ่ง' },
    { role: 'system', content: 'user is a mediator' }];
  assert.equal(buildDialogueContext('ทำยังไงดี', prior).issue, null);
  assert.equal(dialogueContextReply('ทำยังไงดี', prior), null);
  const current = 'แฟนอ่านไม่ตอบ เราน้อยใจ';
  assert.deepEqual(buildDialogueContext(current, [{ role: 'user', content: current }]).activeTurns, [current]);
  assert.equal(dialogueContextFallback('เครื่องกรองน้ำมีเสียงดัง'), null);
});

test('social pressure is not a message-carrying role and explicit mediation still is', () => {
  const pressure = 'ทำไมเพื่อนชอบบอกให้เราไปคุยกับคนนั้นคนนี้ทั้งที่ไม่สนิท';
  assert.equal(buildDialogueContext(pressure).issue, 'social-pressure');
  const reply = dialogueContextReply(pressure);
  assert.match(reply, /ยังไม่สนิท|เข้าไปคุย/u);
  assert.doesNotMatch(reply, /ส่งสาร|พูดแทน|คนกลาง|คุยกันเอง/u);
  assert.equal(buildDialogueContext('เพื่อนฝากเราไปบอกอีกคนว่าอย่ามาสาย').issue, 'mediator');
  assert.equal(buildDialogueContext('เพื่อนให้เราไปคุยกับเพื่อนใหม่').issue, null);
});

test('denied social fear and a quiet-space continuation keep the actual preference', () => {
  const first = 'เราไม่ได้กลัวเข้าสังคมนะ แค่ไม่อยากคุยกับทุกคน';
  assert.equal(buildDialogueContext(first).issue, 'social-boundary');
  assert.match(dialogueContextReply(first), /ไม่ได้กลัว|เลือกได้/u);
  const next = dialogueContextReply('เออแค่อยากอยู่เงียบๆบ้าง', [{ role: 'user', content: first }]);
  assert.match(next, /อยู่เงียบ|พื้นที่/u);
  assert.doesNotMatch(next, /กลัวเข้าสังคม|ส่งสาร|ฝึกพูด|ลองเข้าสังคม/u);
  assert.doesNotMatch(dialogueContextReply('เราไม่อยากคุยกับทุกคน'), /ไม่ได้กลัว/u);
});

test('a corrected relationship concern focuses on dismissed feelings rather than forgetting', () => {
  const history = [{ role: 'user', content: 'แฟนลืมมารับเรา พอบอกว่าเสียใจก็บอกว่าเรื่องแค่นี้เอง' }];
  const corrected = 'ไม่ได้ติดที่เขาลืม แต่ติดที่เขาทำเหมือนความรู้สึกเราไม่สำคัญ';
  assert.equal(buildDialogueContext(corrected, history).issue, 'feeling-dismissed');
  const reply = dialogueContextReply(corrected, history);
  assert.match(reply, /ไม่ใช่การลืม|ความรู้สึก/u);
  assert.doesNotMatch(reply, /ยุ่ง|ความเหงา|ลืมได้เป็นธรรมดา|ไม่ตอบข้อความ/u);
  const draft = dialogueContextReply('ช่วยพิมพ์ข้อความส่งให้เขาหน่อย', [...history, { role: 'user', content: corrected }]);
  assert.match(draft, /^“/u);
  assert.match(draft, /ความรู้สึก|รับฟัง|ฟังกัน/u);
});

test('companionship is an explicit request independent of an old relationship issue', () => {
  const reply = dialogueContextReply('อยู่เป็นเพื่อนเฉยๆได้ปะ', [{ role: 'user', content: 'แฟนไม่ตอบ' }]);
  assert.match(reply, /ได้เลย|เราอยู่ตรงนี้/u);
  assert.doesNotMatch(reply, /ความสัมพันธ์|ต้องการ|แฟน|ข้อความค้าง/u);
});

test('generic comparisons do not invent job offers, celebration, or friends', () => {
  for (const text of ['รู้สึกเราช้ากว่าคนอื่น', 'อิจฉาคนที่เก่งกว่า', 'เราอิจฉาพี่ที่ทำอะไรก็เก่ง']) {
    const reply = dialogueContextReply(text);
    assert.equal(typeof reply, 'string');
    assert.doesNotMatch(reply, /ได้งาน|ข่าวดี|ดีใจกับเพื่อน/u);
  }
});

test('unsupported statements and corrections defer without canned echo or analysis announcements', () => {
  for (const text of ['เราเดินชนกระจก อายชิบ555', 'ไม่ใช่ เราหมายถึงอีกอย่าง', 'เครื่องกรองน้ำมีเสียงดัง', 'เอ่อ']) {
    assert.equal(dialogueContextFallback(text), null);
  }
  assert.equal(dialogueContextReply('คนหลงรูปร่างที่สวยงาม แต่ภายในมีเศษอาหารกับก้อนไขมัน'), null);
});

test('work obligations follow the burden and listening request without inventing a sole provider', () => {
  const first = 'อยากลาออก แต่ต้องส่งเงินให้แม่ทุกเดือน แถมยังมีหนี้อีก';
  const second = 'ไม่ได้อยากได้แผนการเงิน เราแค่เหนื่อยที่ต้องรับผิดชอบตลอด';
  const third = 'เห็นคนอื่นใช้ชีวิตแล้วอิจฉา ไม่อยากเป็นคนดีสักวันได้ไหม';
  const history = [{ role: 'user', content: first }];
  assert.equal(buildDialogueContext(first).issue, 'work-obligations');
  assert.match(dialogueContextReply(first), /ส่งเงินให้แม่|หนี้/u);
  const context = buildDialogueContext(second, history);
  assert.equal(context.issue, 'work-obligations');
  assert.equal(context.listeningOnly, true);
  const correction = dialogueContextReply(second, history);
  assert.match(correction, /ไม่ได้ขอให้จัดการตัวเลข|เหนื่อย|รับผิดชอบ/u);
  assert.doesNotMatch(correction, /ทำบัญชี|วางแผนการเงิน|กองทุน|แบ่งเงิน|หางานใหม่/u);
  history.push({ role: 'user', content: second });
  const envy = dialogueContextReply(third, history);
  assert.equal(buildDialogueContext(third, history).issue, 'work-obligations');
  assert.match(envy, /พื้นที่ของตัวเอง|เลือกตัวเอง|อยากพัก/u);
  assert.match(envy, /ส่งเงินให้แม่|หนี้/u);
  for (const reply of [correction, envy]) assert.doesNotMatch(reply, /คนเดียวที่หาเงิน|โยนงาน|ทิ้งแม่|หนีหนี้|เพื่อนได้งาน/u);
});

test('burden context requires work and a concrete obligation, and ends at an unrelated topic', () => {
  for (const text of ['เราเหนื่อยกับงาน', 'แม่ให้เงินเราไปทำงาน เราไม่มีหนี้', 'เรามีหนี้', 'วันนี้ส่งงานให้แม่']) {
    assert.notEqual(buildDialogueContext(text).issue, 'work-obligations');
  }
  const history = [{ role: 'user', content: 'อยากลาออก แต่ยังมีหนี้ต้องจ่าย' }];
  assert.equal(buildDialogueContext('วันนี้กินพิซซ่ามา อร่อยมาก', history).issue, null);
  assert.equal(buildDialogueContext('เปลี่ยนเรื่อง เราอิจฉาพี่ที่วาดรูปสวย', history).issue, 'drawing');
  assert.doesNotMatch(dialogueContextReply('ไม่อยากได้แผน แค่เหนื่อย', history), /ส่งเงินให้แม่/u);
});

test('safety and tarot flows keep precedence over contextual replies', () => {
  const history = [{ role: 'user', content: 'เราวาดรูปแล้วสีหม่น' }];
  assert.match(buildReflectionReply('เราอยากตาย', history), /ปลอดภัย|ฉุกเฉิน/u);
  assert.match(buildReflectionReply('เปิดไพ่หน่อย', history), /เลือกไพ่หนึ่งใบจากสามใบด้านล่าง/u);
  assert.equal(dialogueContextReply('อยากหายไป', history), null);
});

test('current denials and requested tasks beat an emotion keyword or old cause', () => {
  const resume = buildReflectionReply('เราไม่ได้อิจฉาที่เพื่อนได้งานก่อน แค่อยากให้เขาช่วยดูเรซูเม่');
  assert.match(resume, /เรซูเม่/u);
  assert.doesNotMatch(resume, /พร้อมกับอิจฉาได้|ความอิจฉาที่คุณเล่า/u);
  const repaired = buildReflectionReply('ไม่ใช่ งานไม่ได้ง่ายเกิน แต่เราไม่ชอบหัวหน้าต่างหาก', [
    { role: 'user', content: 'เราเบื่อเพราะงานง่ายเกินไป' },
  ]);
  assert.match(repaired, /ไม่ชอบหัวหน้า/u);
  assert.doesNotMatch(repaired, /คุณเบื่อเพราะงานง่าย|ขอลองงานที่ยากขึ้น/u);
});

test('a resolved waiting event updates the current action instead of claiming silence', () => {
  const reply = buildReflectionReply('เขาทักมาแล้ว แต่เรายังไม่อยากตอบ', [{ role: 'user', content: 'แฟนอ่านไม่ตอบข้อความเรา' }]);
  assert.match(reply, /ตอบกลับมาแล้ว|ทักหรือตอบ/u);
  assert.match(reply, /ยังไม่อยากตอบ/u);
  assert.doesNotMatch(reply, /ตอนนี้รู้ว่าเขายังไม่ตอบ|คุณกำลังรอคำตอบ/u);
});

test('other people and fictional events do not become user biography', () => {
  const mother = buildReflectionReply('แม่เบื่องานที่ง่ายเกินไป เราแค่ฟังเฉยๆ');
  assert.match(mother, /แม่|บทคนฟัง/u);
  assert.doesNotMatch(mother, /คุณเบื่อเพราะงานง่าย|คุณย้ายงาน|ขอลองงานที่ยากขึ้น/u);
  const friend = buildReflectionReply('แมวของเพื่อนเพิ่งตายเมื่อคืน เราอยากช่วยเขา');
  assert.match(friend, /เพื่อน|ช่วย/u);
  assert.doesNotMatch(friend, /คุณคิดถึงมัน|บ้าน.*ไม่มีมัน|ดูแลสิ่งจำเป็นเท่าที่ไหว/u);
  const game = buildReflectionReply('แมวในเกมของเราตายเมื่อคืน');
  assert.match(game, /ในเกม/u);
  assert.doesNotMatch(game, /ที่นอน|สิบปี|ความเงียบตอนกลับบ้าน/u);
});

test('denied grief details, reversed roles and medical homonyms retain actual meanings', () => {
  const loss = buildReflectionReply('เราไม่ได้เห็นมันมาหลายปีแล้ว ไม่ได้คิดถึงการกลับบ้าน', [
    { role: 'user', content: 'สุนัขที่บ้านเพิ่งตาย' },
  ]);
  assert.doesNotMatch(loss, /ความเงียบตอนกลับบ้าน|เคยมีมันรออยู่/u);
  assert.match(loss, /ไม่ควรเติม|ไม่จำเป็นต้องเป็นแบบ/u);
  const role = buildReflectionReply('คราวนี้เราอยากฝากเพื่อนให้ไปบอกอีกคนแทนบ้าง', [
    { role: 'user', content: 'เพื่อนชอบฝากเราไปบอกคนอื่น เรารำคาญ' },
  ]);
  assert.match(role, /คุณอยากให้เพื่อนไปพูดแทน/u);
  assert.doesNotMatch(role, /คุณต้องคอยไปพูดแทน/u);
  const vision = buildReflectionReply('หมอบอกว่าสายตาเราเอียง ไม่ได้มีใครมาดูถูก');
  assert.match(vision, /หมอบอก|มองเห็น/u);
  assert.doesNotMatch(vision, /การถูกมอง|คุณถูกตัดสิน|สายตาของคนอื่น/u);
});

test('plain partner messages never gain invented story posts or busy-work claims', () => {
  const first = buildReflectionReply('แฟนไม่ตอบ');
  assert.doesNotMatch(first, /สตอรี่|งานยุ่ง/u);
  const draft = buildReflectionReply('ส่งข้อความว่าอะไรดี', [{ role: 'user', content: 'แฟนไม่ตอบ' }]);
  assert.doesNotMatch(draft, /ลงสตอรี่|เธองานยุ่ง/u);
  const c = conversation();
  const replies = Array.from({ length: 5 }, () => c.say('แฟนไม่ตอบ'));
  for (let index = 1; index < replies.length; index++) assert.notEqual(replies[index], replies[index - 1]);
});

test('discovery clarification recognizes simple enjoyment without repeating the exploration advice', () => {
  const c = conversation();
  c.say('เราไม่รู้จะเรียนอะไร');
  const discovery = c.say('สนุกที่ได้รู้ในสิ่งที่ไม่รู้');
  const clarification = c.say('ไม่รู้ดิ คือเราแค่รู้สึกมีความสุขที่ได้รู้อะไรบางอย่าง');
  assert.notEqual(clarification, discovery);
  assert.ok(clarification.length < discovery.length);
  assert.match(clarification, /ความสุข|ค้นพบ/u);
  assert.doesNotMatch(clarification, /เลือกคณะ|ลองสังเกต|คนรัก|ขอข้อมูล/u);
});

test('an explicit drawing advice follow-up narrows the first step instead of repeating a disclosure reply', () => {
  const c = conversation();
  c.say('เราวาดรูปเสร็จแล้ว แต่ไม่เหมือนที่คิดไว้');
  const colors = c.say('คือสีมันดูหม่นไป แต่เราอยากได้สดใส');
  const step = c.say('ควรแก้อะไรก่อน');
  assert.notEqual(step, colors);
  assert.match(step, /สำเนาหรือเลเยอร์ใหม่|ความสว่างเฉพาะจุดเด่นหนึ่งจุด/u);
  assert.match(step, /เทียบกับภาพเดิม/u);
});

test('different social and decision preferences are recognized without inventing a career problem', () => {
  for (const text of ['เราชอบทำงานกับคน แต่ถ้าต้องตัดสินใจเรื่องสำคัญจะขอเงียบๆ คิดคนเดียวก่อน',
    'ผมสนุกกับการคุยกับคน ส่วนเวลาตัดสินใจขออยู่คนเดียวคิดสักพัก']) {
    const reply = buildReflectionReply(text);
    assert.match(reply, /สองจังหวะ|พื้นที่เงียบ/u);
    assert.doesNotMatch(reply, /อาชีพ|คณะ|สมัคร|อนาคต|ทางเลือก.*ต้นทุน|ต้องเรียน/u);
    assert.doesNotMatch(reply, /INFP|ENFP|ไทป์ของคุณ/u);
  }
});
