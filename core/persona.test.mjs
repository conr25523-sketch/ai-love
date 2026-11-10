import test from 'node:test';
import assert from 'node:assert/strict';
import { SYSTEM_PROMPT, buildOpening, buildReflectionReply, symbolicFrame } from './persona.mjs';

test('opening greets by name and invites direct conversation', () => {
  const opening = buildOpening('มิน');
  assert.match(opening, /สวัสดี มิน/);
  assert.match(opening, /เรื่องอะไรอยู่ในใจ/);
  assert.doesNotMatch(opening, /โหมดทดลอง|generative AI|เลข/);
  assert.equal((opening.match(/\?/g) || []).length, 1);
  assert.doesNotMatch(buildOpening({ secret: true }), /object Object/);
});

test('work reflection stays tentative without requiring an answer', () => {
  const reply = buildReflectionReply('งานเยอะมาก เหนื่อย เจ้านายสั่งเพิ่มอีก');
  assert.match(reply, /อาจกำลังใช้พลัง/);
  assert.match(reply, /แรงกดดัน/);
  assert.doesNotMatch(reply, /\?/);
});

test('relationship reply does not claim to know another person’s intentions', () => {
  const reply = buildReflectionReply('แฟนไม่ตอบข้อความเลย');
  assert.match(reply, /ยัง(?:ไม่รู้|บอก).*(?:เหตุผล|เจตนา|ความคิด)/);
  assert.doesNotMatch(reply, /ลงสตอรี่/);
  assert.doesNotMatch(reply, /เขาไม่รัก|เขานอกใจ/);
});

test('explicit follow-up uses recent user context and ignores assistant content', () => {
  const reply = buildReflectionReply('มันเหนื่อยมาก', [
    { role: 'user', content: 'หัวหน้าสั่งงานเพิ่ม' },
    { role: 'assistant', content: 'แฟนของคุณเป็นอย่างไร' },
  ]);
  assert.match(reply, /ถ้ายังหมายถึงเรื่องเมื่อกี้/);
  assert.match(reply, /งานหรือการเรียน/);
});

test('new explicit topic overrides previous context', () => {
  const reply = buildReflectionReply('แฟนไม่ตอบข้อความ', [{ role: 'user', content: 'งานเยอะมาก' }]);
  assert.match(reply, /แฟน|ยังไม่ตอบ|รอคำตอบ/);
  assert.doesNotMatch(reply, /งานหรือการเรียน/);
});

test('uncertainty reflects options without deciding or asking', () => {
  const reply = buildReflectionReply('สับสน ไม่รู้ว่าจะเลือกทางไหนดี');
  assert.match(reply, /ชั่งใจระหว่างทางเลือก/);
  assert.doesNotMatch(reply, /คุณควรเลือก/);
  assert.doesNotMatch(reply, /\?/);
});

test('acute risk takes priority over regular work and relationship replies', () => {
  const reply = buildReflectionReply('งานไม่ไหว กินยาเกินขนาดแล้ว');
  assert.match(reply, /ฉุกเฉินทันที/);
  assert.match(reply, /คนที่ไว้ใจ/);
  // Only the two verified Thai public lines may appear; no other number is ever invented.
  assert.deepEqual(reply.match(/\b\d{3,}\b/g), ['1323', '1669']);
});

test('risk without explicit immediate action asks about present safety', () => {
  assert.match(buildReflectionReply('อยากตาย'), /อันตรายทันทีไหม/);
  assert.match(buildReflectionReply('อยากทำร้ายคนอื่น'), /อันตรายทันทีไหม/);
});

test('explicit denial is acknowledged without assuming immediate danger', () => {
  const reply = buildReflectionReply('ไม่ได้คิดฆ่าตัวตาย แค่เหนื่อย');
  assert.match(reply, /ยึดตามที่คุณบอก/);
  assert.doesNotMatch(reply, /ฉุกเฉิน/);
  assert.doesNotMatch(buildReflectionReply('ไม่อยากทำร้ายคนอื่น'), /ฉุกเฉิน/);
});

test('immediate action in a follow-up preserves the previous safety context', () => {
  const reply = buildReflectionReply('กำลังจะทำแล้ว', [{ role: 'user', content: 'อยากตาย' }]);
  assert.match(reply, /ฉุกเฉินทันที/);
});

test('marriage is treated as relationship context', () => {
  assert.match(buildReflectionReply('ไม่แน่ใจว่าควรแต่งงานไหม'), /ความสัมพันธ์/);
});

test('user can stop or ask how the demo works', () => {
  assert.doesNotMatch(buildReflectionReply('หยุด'), /\?/);
  assert.match(buildReflectionReply('อ่านใจได้ยังไง'), /ตอบด้วยกฎ/);
  assert.match(buildReflectionReply('ใช้ AI ใช่ไหม'), /ยังไม่ได้เชื่อมโมเดล AI จริง/);
  assert.match(SYSTEM_PROMPT, /ห้ามใช้จิตวิทยาจูงใจแบบแอบแฝง/);
});

test('unknown input and malformed history do not create personal claims', () => {
  assert.doesNotMatch(buildReflectionReply('ดาวสีม่วง', null), /ฉันฟังอยู่|ดาวสีม่วง|คุณเป็นคน/);
  assert.match(buildReflectionReply(null), /ค่อย/);
  const acknowledgement = buildReflectionReply('โอเค', [{ role: 'assistant', content: 'คุณเศร้า' }]);
  assert.doesNotMatch(acknowledgement, /เศร้า|\?/);
});

 test('a correction is accepted without inventing hidden feelings', () => {
  const reply = buildReflectionReply('ไม่ใช่ ฉันไม่ได้เสียใจ');
  assert.match(reply, /ขอบคุณที่ช่วยแก้/);
  assert.match(reply, /เข้าใจคลาดเคลื่อน/);
  assert.doesNotMatch(reply, /ลึก ๆ|จริง ๆ แล้ว|โหมดทดลอง/);
  assert.doesNotMatch(reply, /\?/);
});

test('ordinary emotional sharing receives reflection, not an interview', () => {
  for (const text of ['งานเยอะมาก เหนื่อย', 'แฟนไม่ตอบเลย', 'เศร้ามาก', 'หงุดหงิด', 'รู้สึกไม่มีค่า', 'ไม่แน่ใจว่าควรแต่งงานไหม', 'สับสนเลือกไม่ถูก']) {
    const reply = buildReflectionReply(text);
    assert.doesNotMatch(reply, /[?？]|ไหม|เล่าต่อได้ไหม/, text);
    assert.doesNotMatch(reply, /คุณเป็นคน|ลึก ๆ คุณ|อ่านใจ/, text);
  }
});

test('requested gentle guidance links distress to a small action without deciding a life goal', () => {
  const text = 'งานยังเครียดอยู่ ช่วยแนะนำหน่อย';
  const history = [{ role: 'user', content: 'งานเยอะและเครียด' }];
  const reply = buildReflectionReply(text, history);
  assert.match(reply, /ลอง|เริ่ม|เลือก/);
  assert.doesNotMatch(reply, /[?？]|คุณต้อง|ลาออกเลย|ฉันฟังอยู่/);
  const listening = buildReflectionReply('งานเครียด แค่อยากระบาย ไม่ต้องแนะนำ', history);
  assert.doesNotMatch(listening, /ลองจด|เลือกงาน|เป้าหมาย/);
  assert.match(listening, /ไม่รีบเสนอ|พักคำแนะนำ|ไม่แทรก|ไม่ต้องเปลี่ยน/);
  assert.match(buildReflectionReply('งานเครียด อยากตาย ช่วยแนะนำหน่อย', history), /อันตรายทันทีไหม/);
});

test('an explicit life-direction coaching request receives a realistic decision framework', () => {
  const reply = buildReflectionReply('ไม่รู้อนาคตจะไปสายไหน ช่วยมองให้ลึกหน่อย');
  assert.match(reply, /ความแน่นอน|ข้อแลกเปลี่ยน|ต้นทุน|คาดหวัง|ข้อจำกัด/);
  assert.match(reply, /ทบทวน|หลัก|ข้อมูล|ประสบการณ์/);
  assert.doesNotMatch(reply, /บรรลุ|ทุกอย่างจะดี|[?？]|ควรเรียนวิศวะ/);
});

test('friend messenger pressure and a hesitant follow-up stay on the exact stated issue', () => {
  const text = 'ทำไมเพื่อนทุกคนต้องให้ฉันบอกคนนู้นคนนี้ ทำไมไม่คุยกันเอง กูเดือดชิบหาย ไม่อยากยุ่ง';
  const reply = buildReflectionReply(text, [{ role: 'user', content: 'เบื่อ นอนไม่ค่อยหลับ ไม่รู้เป็นไร' }]);
  assert.match(reply, /หงุดหงิด|คนกลาง|พูดแทน/);
  assert.doesNotMatch(reply, /ภาพดาว|ความสัมพันธ์นี้อาจ|การนอน|[?？]/);
  const next = buildReflectionReply('เอ่อ', [{ role: 'user', content: text }, { role: 'assistant', content: 'ภาพดาวเชิงสัญลักษณ์ เรื่องความสัมพันธ์นี้อาจมีความรู้สึกหลายอย่าง' }]);
  assert.match(next, /คนกลาง|พูดแทน|บอกหรือถาม/);
  assert.doesNotMatch(next, /ภาพดาว|การนอน|ความรัก/);
  assert.match(buildReflectionReply(`${text} อยากทำร้ายคนอื่น`), /อันตรายทันทีไหม/);
});

test('short ambiguous ordinary requests receive conditional guidance without an interview', () => {
  const question = buildReflectionReply('ทำยังไงดี');
  assert.equal((question.match(/\?/g) || []).length, 0);
  assert.match(question, /ถ้า|สิ่งที่เปลี่ยนได้|ต้นทุน/);
  const history = [{ role: 'assistant', content: question }];
  assert.doesNotMatch(buildReflectionReply('ช่วยแนะนำหน่อย', history), /\?/);
  assert.doesNotMatch(buildReflectionReply('ไม่รู้', history), /\?/);
  assert.doesNotMatch(buildReflectionReply('ทำยังไงดี', [{ role: 'user', content: 'เหนื่อยกับงาน' }]), /\?/);
});

test('safety questions remain available immediately after another question', () => {
  assert.match(buildReflectionReply('อยากตาย', [{ role: 'assistant', content: 'วันนี้เป็นอย่างไรบ้าง?' }]), /อันตรายทันทีไหม\?/);
});

test('requested fortune atmosphere invites a tarot choice instead of a star preface', () => {
  const reply = buildReflectionReply('ช่วยดูดวงความรัก แฟนไม่ตอบเลย');
  assert.match(reply, /ไพ่ทาโรต์/);
  assert.match(reply, /เลือกไพ่หนึ่งใบจากสามใบด้านล่าง/);
  assert.doesNotMatch(reply, /ดวงบอก|ไพ่บอก|คุณเป็นคน|เขานอกใจ|\?/);
});

test('problem explanations avoid unsolicited cards and explicit requests start a new choice', () => {
  assert.doesNotMatch(buildReflectionReply('งานเยอะและเหนื่อยวันนี้'), /ภาพดาวเชิงสัญลักษณ์/);
  const history = [];
  const framed = [];
  for (let i = 0; i < 11; i++) {
    const text = `ดูดวง งานเยอะและเหนื่อยวันนี้ ${i}`;
    const content = buildReflectionReply(text, history);
    if (content.includes('เลือกไพ่หนึ่งใบจากสามใบด้านล่าง')) framed.push(i);
    history.push({ role: 'user', content: text }, { role: 'assistant', content });
    assert.doesNotMatch(content, /\?/);
  }
  assert.equal(framed.length, 11);
});

test('imagery does not replace safety, corrections or acknowledgement of self-worth', () => {
  const history = Array.from({ length: 5 }, () => ({ role: 'user', content: 'เหนื่อยกับงาน' }));
  for (const text of ['ดูดวง งานไม่ไหว อยากตาย', 'ดูดวง ฉันไม่มีค่า', 'ไม่ใช่ ฉันเหนื่อย', 'อ่านใจได้ยังไง', 'หยุด']) {
    assert.equal(symbolicFrame(text, history), null);
    assert.doesNotMatch(buildReflectionReply(text, history), /ภาพดาวเชิงสัญลักษณ์/);
  }
});

test('the exact screenshot sequence responds to the new social disclosure', () => {
  const first = 'คือเราไม่รู้อะไรเลยอะว่าอนาคตจะไปสายไหน';
  const second = 'แล้วเราก็โดนมองด้วยสายตาที่แบบมันให้ความรู้สึกสภาพศพตัวเอง';
  const firstReply = buildReflectionReply(first);
  const secondReply = buildReflectionReply(second, [
    { role: 'user', content: first },
    { role: 'assistant', content: firstReply },
  ]);
  assert.match(firstReply, /อนาคต/);
  assert.match(secondReply, /สายตา.*ภาพ.*ตัวเอง/);
  assert.notEqual(secondReply, firstReply);
  assert.doesNotMatch(secondReply, /ทางเลือก|อนาคต|ฉุกเฉิน|ฆ่าตัวตาย|[?？]/);
  assert.doesNotMatch(secondReply, /คุณเป็นคน/);
  assert.match(secondReply, /อคติ|มาตรวัด|คำตีความ/);
});

test('short emotional disclosures do not inherit an unrelated old topic', () => {
  const history = [{ role: 'user', content: 'ไม่แน่ใจว่าจะเลือกทางไหน' }];
  for (const text of ['เหนื่อยมาก', 'เศร้ามาก', 'โดนคนอื่นมอง', 'โกรธมาก']) {
    const reply = buildReflectionReply(text, history);
    assert.doesNotMatch(reply, /ทางเลือก|ชั่งใจ|ถ้ายังหมายถึง/);
  }
});

test('repeating a disclosure changes the action rather than repeating advice', () => {
  for (const text of ['งานเยอะ เหนื่อยมาก', 'แฟนไม่ตอบ', 'สับสนเลือกไม่ถูก', 'โดนคนอื่นมอง']) {
    const history = [];
    let last = '';
    const responses = [];
    for (let i = 0; i < 5; i++) {
      const reply = buildReflectionReply(text, history);
      assert.notEqual(reply, last, text);
      assert.doesNotMatch(reply, /[?？]/);
      assert.doesNotMatch(reply, /โหมดทดลอง|กฎของ/);
      history.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
      last = reply;
      responses.push(reply);
    }
    assert.ok(new Set(responses).size >= 3, text);
  }
});

test('an unsupported topic does not acquire invented personal advice from assistant history', () => {
  const first = buildReflectionReply('เรื่องอวกาศ');
  const second = buildReflectionReply('เรื่องอวกาศ', [{ role: 'assistant', content: first }]);
  assert.ok(second.trim());
  assert.doesNotMatch(second, /คุณเป็นคน|ต้นทุน|ควรเลือก|ความสัมพันธ์/);
  assert.doesNotMatch(second, /ฉันฟังอยู่|เรื่องอวกาศ|[?？]/);
  assert.doesNotMatch(buildReflectionReply('เรื่องอวกาศ', [{ role: 'assistant', content: second }]), /[?？]/);
});

test('repeated unfamiliar input does not invent new life lessons merely for variety', () => {
  const history = [];
  const replies = [];
  for (let i = 0; i < 12; i++) {
    const text = 'เรื่องมุมดาวสีม่วง';
    const reply = buildReflectionReply(text, history);
    assert.doesNotMatch(reply, /ฉันฟังอยู่|เรื่องมุมดาวสีม่วง|รายละเอียดไม่พอ|[?？]/);
    assert.ok(reply.length < 260, `Unknown input should not trigger a long canned lecture at turn ${i + 1}`);
    assert.doesNotMatch(reply, /ต้นทุนชีวิต|ทำให้ทุกฝ่ายพอใจ|คุณกำลังชั่งใจ|ความไว้ใจ|เทียบตัวเองกับคนอื่น/);
    replies.push(reply);
    history.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
  }
});

test('social metaphors do not hide explicit current self-harm intent', () => {
  const reply = buildReflectionReply('โดนมองเหมือนศพตัวเอง อยากตาย');
  assert.match(reply, /อันตรายทันทีไหม/);
  assert.doesNotMatch(reply, /ภาพดาวเชิงสัญลักษณ์/);
});

test('the future model prompt requests context and natural reply length with truthful identity', () => {
  assert.doesNotMatch(SYSTEM_PROMPT, /อย่างน้อย 3 บรรทัด/);
  assert.match(SYSTEM_PROMPT, /ไม่กำหนดขั้นต่ำบรรทัด/);
  assert.match(SYSTEM_PROMPT, /ใครเป็นคนทำ/);
  assert.match(SYSTEM_PROMPT, /รายละเอียดล่าสุด/);
  assert.match(SYSTEM_PROMPT, /ไม่อ้างว่าเป็นมนุษย์/);
  assert.match(SYSTEM_PROMPT, /ไม่เพียงสลับคำ/);
});

test('decision language is not confused with social judgement', () => {
  const reply = buildReflectionReply('ตัดสินใจไม่ถูก');
  assert.match(reply, /ทางเลือก/);
  assert.doesNotMatch(reply, /ถูกตัดสิน|ถูกมอง/);
});

test('a first disclosure is not labelled as a repeat without history', () => {
  const reply = buildReflectionReply('ยังไม่รู้ว่าอนาคตจะไปสายไหน');
  assert.match(reply, /อนาคต/);
  assert.doesNotMatch(reply, /กลับมาพูด|คำตอบเมื่อกี้/);
});

test('teen slang and elongated words receive relevant reflection', () => {
  assert.match(buildReflectionReply('เหนื่อยยย เครียดดดเรื่องเรียน'), /แรงกดดัน/);
  assert.match(buildReflectionReply('วันนี้เฟลอะ'), /เสียความรู้สึก|ผิดหวัง/);
  assert.match(buildReflectionReply('นอยอ่ะ'), /ไม่สบายใจ|ค้างใจ/);
  assert.match(buildReflectionReply('มั่ยไหวแล้ว'), /เหนื่อย/);
  assert.match(buildReflectionReply('หมดแพชชันอะ'), /เหนื่อย/);
  assert.match(buildReflectionReply('โดน ghost เลย'), /อีกฝ่ายเงียบ/);
});

test('negation and laughter do not reverse emotional meaning', () => {
  assert.match(buildReflectionReply('ไม่ได้เศร้า แค่เหนื่อย'), /เหนื่อย/);
  assert.doesNotMatch(buildReflectionReply('ไม่ได้เศร้า แค่เหนื่อย'), /กำลังเศร้า/);
  for (const text of ['ไม่นอยนะ 555', 'ไม่เฟลนะ', 'ไม่ งง นะ']) {
    assert.match(buildReflectionReply(text), /ยึดตาม|ไม่สรุป/);
    assert.doesNotMatch(buildReflectionReply(text), /ฟังดูเหมือน|กำลังเศร้า|มีความสุข/);
  }
  assert.doesNotMatch(buildReflectionReply('เหงาอะ 555'), /มีความสุข|ขำ/);
});

test('slang hyperbole and genuine uncertainty are distinguished conservatively', () => {
  assert.doesNotMatch(buildReflectionReply('ขิตละ 555 งานเยอะ'), /ฉุกเฉิน|ทำร้ายตัวเอง/);
  assert.match(buildReflectionReply('อยากตุยเพราะสอบ 555'), /เรายังไม่แน่ใจ.*ทำร้ายตัวเองไหม/);
  assert.match(buildReflectionReply('อยากตุย เขาหล่อแต่ชีวิตเราไม่ไหว'), /ทำร้ายตัวเองไหม/);
  assert.doesNotMatch(buildReflectionReply('ไม่อยากหายไป แค่อยากพัก'), /ทำร้ายตัวเอง|ฉุกเฉิน/);
  assert.doesNotMatch(buildReflectionReply('ขำจนจะตุย'), /ทำร้ายตัวเอง|ฉุกเฉิน/);
});

test('names and unknown slang are not echoed or assigned feelings', () => {
  for (const text of ['นอยเออร์', 'เฟลิกซ์', 'กงงงง']) {
    const reply = buildReflectionReply(text);
    assert.doesNotMatch(reply, /ฉันฟังอยู่|คุณเป็นคน|เศร้า|กังวล/);
    assert.doesNotMatch(reply, /ผิดหวัง|ค้างใจ|ชั่งใจ/);
  }
});

test('the screenshot clarification explains search in the preceding future context', () => {
  const history = [
    { role: 'user', content: 'ไม่รู้เลยว่าอนาคตจะไปสายไหน' },
    { role: 'assistant', content: 'อาจเริ่มค้นหาจากเรื่องที่สนใจทีละนิด' },
  ];
  for (const text of ['ค้นหานี่คือค้นหาแบบไหนอะ', 'แบบการเริ่มค้นหาที่นายบอกมันคือการค้นหาแบบไหน', 'เราอยากให้ช่วยอธิบายนิยามการค้นหาของนาย']) {
    const reply = buildReflectionReply(text, history);
    assert.match(reply, /ลอง|สังเกต/);
    assert.match(reply, /ตัวเอง/);
    assert.doesNotMatch(reply, /อยากให้ช่วย|หมายถึงเรื่องไหน|[?？]/);
    history.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
  }
});

test('unrecognized off-topic turns never repeatedly interrogate the user', () => {
  const history = [{ role: 'assistant', content: 'วันนี้รู้สึกอย่างไรบ้าง?' }];
  for (const text of ['ดาวสีม่วง', 'เรื่องอวกาศ', 'เนบิวลาลึกลับ', 'อะไรก็ไม่รู้']) {
    const reply = buildReflectionReply(text, history);
    assert.doesNotMatch(reply, /[?？]|อยากให้ช่วย|หมายถึงเรื่องไหน/);
    history.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
  }
});

test('search in a new topic is not forced into old future counselling', () => {
  const history = [{ role: 'assistant', content: 'ค่อย ๆ ค้นหาตัวเอง' }];
  assert.doesNotMatch(buildReflectionReply('การค้นหาไฟล์คืออะไร', history), /รู้จักตัวเอง|อนาคตครบ/);
});

test('prompt permits natural play and grounded praise without forced counselling', () => {
  assert.match(SYSTEM_PROMPT, /ตามหัวข้อใหม่/);
  assert.match(SYSTEM_PROMPT, /อีโมจิ/);
  assert.match(SYSTEM_PROMPT, /ไม่ชมลอย/);
  assert.match(SYSTEM_PROMPT, /ไม่ดึงกลับไปวิเคราะห์จิตใจ/);
});

test('short study uncertainty receives a starting point without another goal question', () => {
  const reply = buildReflectionReply('ตอนนี้เราไม่รุ้จะเรียนอะไร');
  assert.match(reply, /ค่อย|ไม่.*รีบ|ยังไม่.*บังคับ/);
  assert.match(reply, /ลอง|เริ่ม|เป้าหมาย/);
  assert.match(reply, /เรียน|คณะ|ชีวิต|อนาคต|เป้าหมาย/);
  assert.equal((reply.match(/[?？]/g) || []).length, 0);
  assert.doesNotMatch(reply, /ข้อมูลไม่พอ|รายละเอียดไม่พอ|ต้องรู้ข้อจำกัด|ควรเรียน(?:แพทย์|วิศวะ)/);
  const followUp = buildReflectionReply('ยังไม่รู้เป้าหมายเลย', [
    { role: 'user', content: 'ตอนนี้เราไม่รุ้จะเรียนอะไร' }, { role: 'assistant', content: reply },
  ]);
  assert.match(followUp, /ลอง|เริ่ม|เล็ก|ค่อย/);
  assert.doesNotMatch(followUp, /[?？]|รายละเอียดไม่พอ/);
});

test('math screenshot progresses from ability and preference to the stated enjoyment', () => {
  const first = 'คือเราเก่งคณิตแต่ไม่ได้ชอบอะ';
  const firstReply = buildReflectionReply(first);
  assert.match(firstReply, /คณิต|ความถนัด/);
  assert.match(firstReply, /ชอบ|สนใจ/);
  assert.doesNotMatch(firstReply, /รายละเอียดไม่พอ|คุณเป็นคน|ควรเรียนวิศวะ/);
  const second = 'คือเราเก่งคณิตแต่ไม่ได้ชอบเรารู้สึกสนุกเวลาได้ท้าทาย';
  const secondReply = buildReflectionReply(second, [
    { role: 'user', content: first }, { role: 'assistant', content: firstReply },
  ]);
  assert.match(secondReply, /ท้าทาย/);
  assert.notEqual(secondReply, firstReply);
  assert.doesNotMatch(secondReply, /รายละเอียดไม่พอ|คุณเป็นคน|[?？]/);
});

test('career exploration questions pause after an existing question', () => {
  const reply = buildReflectionReply('ไม่รู้จะเรียนคณะไหน', [{ role: 'assistant', content: 'ตอนนี้อยากเล่าเรื่องไหน?' }]);
  assert.match(reply, /ลอง|เริ่ม|ค่อย/);
  assert.doesNotMatch(reply, /[?？]|รายละเอียดไม่พอ/);
  assert.match(SYSTEM_PROMPT, /ข้อมูลสั้น ๆ ก็เพียงพอ/);
});

test('the newest screenshot follows discovery enjoyment without a data gate', () => {
  const previous = 'คือเราเก่งคณิตแต่ไม่ได้ชอบเรารู้สึกสนุกเวลาได้ท้าทาย';
  const reply = buildReflectionReply('สนุกที่ได้รู้ในสิ่งที่ไม่รู้', [
    { role: 'user', content: previous },
    { role: 'assistant', content: buildReflectionReply(previous) },
  ]);
  assert.match(reply, /ค้นพบ|เรียนรู้|อยากรู้/);
  assert.doesNotMatch(reply, /รายละเอียดไม่พอ|ข้อมูลไม่พอ|ไม่ครบ|[?？]|คุณเป็นคน|ต้องเรียน/);
});

test('ordinary replies never gate conversation on more biography or understanding', () => {
  const lacking = /(?:รายละเอียด|ข้อมูล).{0,10}(?:ไม่พอ|ไม่เพียงพอ)|จับประเด็น.*(?:ไม่ได้|ไม่ครบ)|เข้าใจไม่ครบ|ยังไม่รู้รายละเอียด/;
  for (const text of ['อะไรก็ไม่รู้', 'ดาวสีม่วง', 'ชอบความแปลกใหม่', 'มีเรื่องงาน', 'ไม่แน่ใจเรื่องแฟน', 'เหนื่อย', 'เศร้า', 'ผิดหวัง', 'มองตัวเอง', 'ทำยังไงดี']) {
    const first = buildReflectionReply(text, [{ role: 'assistant', content: 'คุณอยากให้ชีวิตมีอะไร?' }]);
    const second = buildReflectionReply(text, [{ role: 'assistant', content: first }]);
    assert.doesNotMatch(first, lacking, text);
    assert.doesNotMatch(second, lacking, text);
    assert.doesNotMatch(first, /[?？]/, text);
    assert.ok(second.trim(), text);
    assert.doesNotMatch(second, /ต้องเล่าประวัติ|ตอบคำถามก่อน|คุณเป็นคน/, text);
  }
});
