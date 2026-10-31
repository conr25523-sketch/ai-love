import test from 'node:test';
import assert from 'node:assert/strict';
import { generateProviderReply } from '../lib/ai-provider.mjs';

// Exercise the local provider and its memory/formatting path without API credentials.
function conversation() {
  const history = [];
  return async text => {
    const response = await generateProviderReply({ text, recentMessages: history, learningMessages: history }, {});
    assert.equal(response.mode, 'demo');
    assert.equal(typeof response.content, 'string');
    assert.ok(response.content.trim());
    history.push({ role: 'user', content: text }, { role: 'assistant', content: response.content });
    return response.content;
  };
}

test('a viewpoint about choosing one’s life invites discussion rather than a factual refusal', async () => {
  const say = conversation();
  await say('4545454-45=');
  const reply = await say('เราว่าคนที่บ้านไม่จำเป็นต้องเห็นด้วยกับทางที่เราเลือก ขอแค่ไม่บังคับให้เราใช้ชีวิตตามความฝันของเขาก็พอ');
  assert.match(reply, /เลือก|ตัดสินใจ|อิสระ|ความฝัน/);
  assert.doesNotMatch(reply, /ไม่รู้คำตอบ|รายละเอียดไม่พอ|สรุปให้แบบมั่นใจไม่ได้|สงบจิตใจ|เมนู/);
  assert.ok(reply.length > 100);
  const followup = await say('หมายความว่าไง');
  assert.notEqual(followup, reply);
  assert.match(followup, /เลือก|ตัดสินใจ|อิสระ|รับผิดชอบ/);
  assert.equal(await say('7*(3+2)='), '7*(3+2) = 35');
});

test('a new discussion does not preserve a previous life theme after a concrete topic shift', async () => {
  const say = conversation();
  await say('เราคิดว่าการเลือกชีวิตเองต้องยอมรับผลของทางที่เลือก ไม่ใช่ให้คนอื่นควบคุม');
  await say('เปลี่ยนเรื่อง วันนี้กินอะไรดี');
  const reply = await say('ขยายอีก');
  assert.doesNotMatch(reply, /เสรีภาพ|ยกสิทธิ์ตัดสินใจ|ความโกรธ|คำยอมรับ|พิสูจน์ว่าเขาผิด/);
});

test('corrected autonomy can be explained without reviving a rejected motive', async () => {
  const say = conversation();
  await say('เราว่าคนเราควรเลือกชีวิตเอง แม้คนอื่นจะพยายามควบคุม');
  await say('ไม่ได้โกรธใคร แค่ไม่อยากให้คนอื่นตัดสินใจแทน');
  const reply = await say('หมายความว่าไง');
  assert.match(reply, /ตัดสินใจ|เลือก|สิทธิ์/);
  assert.doesNotMatch(reply, /ไม่รู้คำตอบ|คุณโกรธ|ลึก.*โกรธ|อยากเอาชนะ/);
});

test('an explicit topic change with new opinion content receives that opinion', async () => {
  const say = conversation();
  await say('เราว่าคนขยันมีโอกาสไม่เท่ากัน โลกไม่ยุติธรรม');
  const reply = await say('เปลี่ยนเรื่อง เราคิดว่าคนเราควรเลือกชีวิตเอง ไม่ให้ใครมาบังคับ');
  assert.match(reply, /ตัดสินใจ|อิสระ|เลือกเอง|สิทธิ์/);
  assert.doesNotMatch(reply, /ไม่รู้คำตอบ|ได้ลงมือทำจริงแล้ว/);
  const more = await say('อ๋อ ขยายอีกหน่อย');
  assert.match(more, /ตัดสินใจ|เลือก|อิสระ|ความเห็น/);
});

test('direct arithmetic survives an emotional context without compulsory coaching', async () => {
  const say = conversation();
  await say('วันนี้เหนื่อยอะ');
  const reply = await say('1+1ได้เท่าไหร่');
  assert.match(reply, /(?:^|\D)2(?:\D|$)/);
  assert.doesNotMatch(reply, /สงบ|จิตใจ|หายใจ|เป้าหมาย|ค่อย\s*ๆ|[?？]/);
});

test('body imagery remains a discussion of appearances rather than food', async () => {
  const say = conversation();
  const reply = await say('คนส่วนมากมักจะยึดติดกับรูปร่างกับความลุ่มหลงภายนอก ทั้งๆที่ภายในคนเรามีเนื้อหนังที่น่าเกลียดน่ากลัว มีลำไส้ อ้วก เศษอาหาร ก้อนไขมันที่เกาะรวมกันเป็นนม');
  assert.match(reply, /รูปลักษณ์|ภายนอก|รูปร่าง|หลง|ร่างกาย/);
  assert.doesNotMatch(reply, /เมนู|ก๋วยเตี๋ยว|เลือกกิน|ความหิว|มื้อหนึ่ง|ข้าวไข่เจียว/);
});

test('banter follows an embarrassing story, recognizes an idiom, then stops for pain', async () => {
  const say = conversation();
  const first = await say('วันนี้เดินชนประตูกระจกต่อหน้าคนทั้งร้าน อายชิบ555');
  assert.match(first, /ชน|ประตู|หน้าผาก|สายตา/);
  assert.doesNotMatch(first, /ตีความได้หลายแบบ|รายละเอียดไม่พอ|เป้าหมายชีวิต/);
  const idiom = await say('ดีนะประตูไม่แตกไม่งั้นได้กินแกลบแน่');
  assert.match(idiom, /ประตู|ค่า|ใบเสร็จ/);
  assert.doesNotMatch(idiom, /เมนู|หิว|เลือกกิน/);
  const pain = await say('ล้อเล่นจริงๆเจ็บหน้าผากอยู่');
  assert.match(pain, /เจ็บหน้าผาก/);
  assert.doesNotMatch(pain, /555|ฮ่า|😂|🤣|ประคบ|กินยา/);
});

test('quiet company neither interviews the user nor turns into relationship coaching', async () => {
  const say = conversation();
  await say('วันนี้เหนื่อยอะ');
  for (const text of ['อืม', 'ไม่รู้จะพูดอะไร', 'อยู่เป็นเพื่อนเฉยๆได้ปะ']) {
    const reply = await say(text);
    assert.doesNotMatch(reply, /ความสัมพันธ์|ทางเลือก|เป้าหมาย|ลอง|[?？]/, text);
    assert.ok(reply.length < 220, text);
  }
});

test('a concrete choice request gives choices based on the disclosed interest', async () => {
  const say = conversation();
  await say('เราเก่งคณิตแต่ไม่ได้ชอบ เราสนุกที่ได้รู้สิ่งใหม่และแก้ปัญหา');
  const reply = await say('แล้วควรเรียนอะไร ตอบมาเป็นตัวเลือกเลย');
  assert.match(reply, /คอมพิวเตอร์|วิศว|วิทยา|สถิติ|ออกแบบ|ข้อมูล|เศรษฐ/);
  assert.doesNotMatch(reply, /ยังไม่จำเป็นต้องรีบ|รายละเอียดไม่พอ|ข้อมูลไม่พอ|อยากให้ช่วยตรงไหน/);
});

test('a message drafting request produces wording instead of a promise to retain context', async () => {
  const say = conversation();
  await say('แฟนลืมมารับเรา พอเราบอกว่าเสียใจ เขากลับบอกว่าเรื่องแค่นี้เอง');
  const draft = await say('ช่วยเขียนให้เราส่งหาเขาหน่อย');
  assert.match(draft, /เสียใจ|ความรู้สึก|เรื่องแค่นี้|มารับ/);
  assert.doesNotMatch(draft, /เราจะยึดเหตุการณ์|คุณบอกว่า|ต้นทุนชีวิต|ค่อย\s*ๆ.*เล่า/);
  const shorter = await say('ขอสั้นกว่านี้');
  assert.ok(shorter.length < draft.length);
  assert.match(shorter, /เสียใจ|ความรู้สึก|เรื่องแค่นี้|มารับ/);
});
