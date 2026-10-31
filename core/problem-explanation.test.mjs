import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReflectionReply } from './persona.mjs';
import { gentleGuidanceReply } from './gentle-guidance.mjs';
import { unclassifiedProblemReply } from './human-realism.mjs';
import { generateProviderReply } from '../lib/ai-provider.mjs';

const examples = [
  ['งานเยอะมาก เหนื่อย เจ้านายสั่งเพิ่มอีก', /งาน|ภาระ/, /ความสะดวก|ภาระ|อำนาจต่อรอง/],
  ['แฟนไม่ตอบข้อความเลย เราน้อยใจ', /แฟน|รอคำตอบ|ความสัมพันธ์/, /ความต้องการ|เจตนา|เหตุผล/],
  ['โดนคนอื่นดูถูกและเปรียบเทียบตลอด', /สายตา|เปรียบเทียบ/, /อคติ|ลดค่า|มาตรวัด/],
  ['สอบพลาดแล้วโทษตัวเองว่าไม่ดีพอ', /ผิดพลาด|คำตัดสิน/, /มาตรฐาน|คำพิพากษา|รับผิดชอบ/],
  ['กังวลอนาคต สับสนจะเลือกทางไหนดี', /ทางเลือก|ข้างหน้า/, /คนอื่นยอมรับ|รับต้นทุน|ความกลัว/],
  ['คนนี้ทักมาเฉพาะตอนเหงา เราไม่รู้จะทำยังไง', /ความสัมพันธ์|ค้างใจ/, /ความเหงา|ความสำคัญ|การกระทำ/],
  ['มีปัญหา พยายามรักษาทุกอย่างแต่กลับยิ่งเหนื่อย', /ความคาดหวัง|ผลประโยชน์/, /ต้นทุน|เลือก|รับผิดชอบ/],
];

test('first problem disclosure receives a related explanation and human tension without requesting more data', () => {
  for (const [text, event, lens] of examples) {
    const reply = buildReflectionReply(text);
    assert.match(reply, event, text);
    assert.match(reply, lens, text);
    assert.ok(reply.length >= 140, text);
    assert.match(reply, /หลัก|แยก|ทบทวน|ข้อมูล|ต้นทุน|ความรับผิดชอบ|ความต้องการ|ขอบเขต/);
    assert.doesNotMatch(reply, /รายละเอียดไม่พอ|เล่าเพิ่ม|เอาทีละจังหวะ|ไม่จำเป็นต้องอธิบายทุกส่วน|[?？]|ฉัน/);
    assert.doesNotMatch(reply, /ทุกคนเลว|เขานอกใจ|เพื่อนไม่จริงใจ|บรรลุแน่นอน/);
  }
});

test('subsequent problem details continue explaining instead of suppressing content after coaching', () => {
  const first = buildReflectionReply('งานเยอะมากและเครียด');
  const reply = buildReflectionReply('งานก็ยังเครียดอยู่ ต้องทำแทนคนอื่นอีก', [
    { role: 'user', content: 'งานเยอะมากและเครียด' }, { role: 'assistant', content: first },
  ]);
  assert.ok(reply.length >= 260);
  assert.notEqual(first, reply);
  assert.match(reply, /ความพยายาม|ต้นทุน|ระบบงาน|เงื่อนไข/);
  assert.doesNotMatch(reply, /พักจากการหาวิธีแก้|เอาทีละจังหวะ|[?？]/);
  const history = [];
  const replies = new Set();
  for (let i = 0; i < 4; i++) {
    const text = 'งานเยอะมากและเครียด';
    const content = buildReflectionReply(text, history);
    replies.add(content);
    history.push({ role: 'user', content: text }, { role: 'assistant', content });
  }
  assert.equal(replies.size, 4);
});

test('specific peer roles connect costs and human tendencies instead of a generic dark monologue', () => {
  for (const [text, lens] of [
    ['เพื่อนโยนงานกลุ่มให้เราทำคนเดียว เหนื่อยมาก', /ความสะดวก|ต้นทุน|ยุติธรรม/],
    ['เพื่อนจี้ถามเรื่องส่วนตัวตลอด เราอึดอัด', /อยากรู้|ความพร้อม|พื้นที่/],
    ['เพื่อนพูดแทรกทุกครั้งที่เราเล่า เสียความรู้สึก', /ความเห็น|ยอมรับ|ปรับการฟัง/],
    ['เพื่อนให้เราเป็นคนกลาง เราไม่อยากเป็นคนกลาง', /ความเกรงใจ|ต้นทุน|หน้าที่/],
  ]) {
    const reply = buildReflectionReply(text);
    assert.match(reply, lens, text);
    assert.ok(reply.length >= 140);
    assert.doesNotMatch(reply, /ร่างกาย|ขับถ่าย|เขาเป็นคนเลว/);
  }
});

test('listening preference, correction, negation, names, topic switches and safety retain priority', () => {
  const history = [{ role: 'user', content: 'งานเครียด แค่อยากระบาย ไม่ต้องแนะนำ' }];
  assert.doesNotMatch(buildReflectionReply('งานเยอะมากและเหนื่อย', history), /ความสะดวก|คำพิพากษา|ลองแยก|อำนาจต่อรอง/);
  assert.match(buildReflectionReply('งานเครียด ช่วยแนะนำ', history), /ต้นทุน|ความรับผิดชอบ|ขอบเขต/);
  for (const text of ['เฟลิกซ์', 'นอยเออร์', 'งานไม่เครียด ไม่ได้เหนื่อย', 'ไม่ได้ถูกตัดสิน', 'ไม่ได้เปรียบเทียบ']) {
    assert.equal(gentleGuidanceReply(text, [], undefined, { respondOnDisclosure: true }), null, text);
  }
  assert.doesNotMatch(buildReflectionReply('ไม่ใช่ เราไม่ได้โกรธ'), /ความสะดวก|ผลประโยชน์|อคติ/);
  assert.doesNotMatch(buildReflectionReply('เปลี่ยนเรื่อง อยากกินชาไข่มุก', history), /ต้นทุน|คำพิพากษา/);
  assert.match(buildReflectionReply('มีปัญหากับงาน อยากตาย'), /อันตรายทันทีไหม/);
  for (const text of ['มีปัญหาเลือดออก', 'มีปัญหาคดีความ', 'มีปัญหาการกินยา', 'มีปัญหาภาษี', 'ปัญหาคืออะไร', 'ดาวสีม่วง']) assert.equal(unclassifiedProblemReply(text), null);
});

test('provider receives the same first-disclosure guidance and preserves raw user text', async () => {
  const bodies = [];
  const fetchImpl = async (_, options) => {
    bodies.push(JSON.parse(options.body));
    return Response.json({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'เราจะใช้เรื่องที่เล่ามาทำความเข้าใจต่อ' }] }] });
  };
  for (const text of ['งานเยอะมาก เหนื่อย', 'มีปัญหา พยายามทุกอย่างแต่กลับเหนื่อย']) {
    await generateProviderReply({ text }, { apiKey: 'mock-only', model: 'test', fetchImpl });
    assert.equal(bodies.at(-1).input.at(-1).content, text);
    assert.match(bodies.at(-1).instructions, /อธิบายต่อทันที/);
    assert.match(bodies.at(-1).instructions, /ไม่ต้องรอคำว่าด้านมืดหรือปรัชญา/);
    assert.match(bodies.at(-1).instructions, /ไม่เพิ่มคำอ่านดวงหรือภาพดาว/);
  }
  const demo = await generateProviderReply({ text: 'งานเยอะมาก เหนื่อย' });
  assert.match(demo.content, /ต้นทุน|ความสะดวก|อำนาจต่อรอง/);
});
