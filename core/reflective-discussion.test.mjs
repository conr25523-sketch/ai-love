import test from 'node:test';
import assert from 'node:assert/strict';
import { reflectiveDiscussionReply, reflectiveDiscussionTopic } from './reflective-discussion.mjs';

const statement = 'ชีวิตย่อมมีอุปสรรคแต่ตราบใดที่มีเป้าหมายคนเราจะเหยียบย่ำสิ่งที่มาขวางเป้าหมายไม่ว่าจะคนสนิทหรือเชื่อใจคนเหล่านั้นก็แค่ตัวละครตัวนึงคนเหล่านั้นมาควบคุมความอิสระของเราได้เราจะเลือกเดินด้วยแข้งขาของตัวเอง';

test('another person’s dream is not presented as the speaker’s own goal', () => {
  const text = 'เราว่าคนที่บ้านไม่จำเป็นต้องเห็นด้วยกับทางที่เราเลือก ขอแค่ไม่บังคับให้เราใช้ชีวิตตามความฝันของเขาก็พอ';
  const reply = reflectiveDiscussionReply(text);
  assert.doesNotMatch(reply, /มีเป้าหมายของตัวเองช่วย/);
  const simple = reflectiveDiscussionReply('อธิบายให้เข้าใจง่าย', [{ role: 'user', content: text }, { role: 'assistant', content: reply }]);
  assert.match(simple, /พูดง่าย|สิทธิ์ตัดสินใจ/);
});

test('a sustained autonomy viewpoint gets a relevant discussion, not a lack-of-information answer', () => {
  assert.equal(reflectiveDiscussionTopic(statement), 'autonomy');
  const response = reflectiveDiscussionReply(statement);
  assert.match(response, /เลือก|ตัดสินใจ/u);
  assert.match(response, /รับผิดชอบ|เงื่อนไข/u);
  assert.doesNotMatch(response, /รายละเอียดไม่พอ|ไม่รู้คำตอบ|คุณกำลังโกรธ|ทุกคน.*ศัตรู/u);
  assert.ok(!response.includes('?'));
  assert.ok(response.split('\n\n').length >= 2);
});

test('unseen wording uses shared autonomy evidence without requiring screenshot phrases', () => {
  for (const value of [
    'เราว่าคนที่บ้านไม่จำเป็นต้องเห็นด้วยกับทางที่เราเลือก ขอแค่ไม่บังคับให้เราใช้ชีวิตตามความฝันของเขาก็พอ',
    'เสรีภาพสำหรับเราคือเลือกเองได้ และรับผิดชอบผลของมัน ไม่ใช่ต้องให้ใครมารับรองก่อน',
    'คนเราควรมีสิทธิ์เลือกชีวิตตัวเอง แม้คนใกล้ตัวจะไม่ยอมรับก็ตาม',
  ]) assert.equal(reflectiveDiscussionTopic(value), 'autonomy', value);
});

test('effort, unfairness, persistence, trust and acceptance have different substantive answers', () => {
  for (const [value, topic, expected] of [
    ['เราว่าโลกไม่ยุติธรรม คนที่พยายามเท่ากันแต่มีโอกาสไม่เท่ากัน ย่อมสำเร็จต่างกัน', 'fairness', /โอกาส|เงื่อนไข/u],
    ['ชีวิตย่อมมีอุปสรรค ถ้ามีเป้าหมายก็ต้องพยายามไปให้ถึง', 'persistence', /เปลี่ยนวิธี|ทบทวน/u],
    ['เราว่าไว้ใจคนได้แต่อย่าให้ความสนิททำให้เราลืมขอบเขต ไม่ใช่ทุกคนจะจริงใจ', 'trust', /พฤติกรรม|รับผิดชอบ/u],
    ['เราว่าการยอมรับความจริงไม่ได้แปลว่าต้องยอมแพ้ แต่เราต้องเลือกว่าจะเปลี่ยนอะไรในชีวิตได้', 'acceptance', /เปลี่ยน|เงื่อนไข/u],
  ]) {
    assert.equal(reflectiveDiscussionTopic(value), topic, value);
    assert.match(reflectiveDiscussionReply(value), expected);
  }
});

test('followup adds a concrete example and the next followup advances the point', () => {
  const first = reflectiveDiscussionReply(statement);
  const history = [{ role: 'user', content: statement }, { role: 'assistant', content: first }];
  const second = reflectiveDiscussionReply('ขยายอีก', history);
  assert.match(second, /เช่น|ตัวอย่าง/u);
  assert.notEqual(second, first);
  history.push({ role: 'user', content: 'ขยายอีก' }, { role: 'assistant', content: second });
  const third = reflectiveDiscussionReply('แล้วไงต่อ', history);
  assert.notEqual(third, second);
  assert.match(third, /ขอความช่วยเหลือ|เงื่อนไข/u);
});

test('explicit correction about deciding for oneself drops the rejected anger angle', () => {
  const response = reflectiveDiscussionReply('ไม่ได้โกรธใคร แค่ไม่อยากให้คนอื่นตัดสินใจแทน', [
    { role: 'user', content: statement },
    { role: 'assistant', content: 'คุณโกรธครอบครัวและต้องการเอาชนะเขา' },
  ]);
  assert.match(response, /เป็นคนตัดสินใจเอง|สิทธิ์เลือก/u);
  assert.doesNotMatch(response, /คุณโกรธ|ครอบครัว|ลึก.*โกรธ|เป้าหมาย.*ครอบครัว/u);
});

test('the latest user statement, not assistant speculation, supplies discussion evidence', () => {
  assert.equal(reflectiveDiscussionReply('แล้วไงต่อ', [
    { role: 'user', content: 'สวัสดี' },
    { role: 'assistant', content: statement },
  ]), null);
  assert.equal(reflectiveDiscussionReply('แล้วไงต่อ', [
    { role: 'user', content: statement }, { role: 'assistant', content: '...' },
    { role: 'user', content: 'วันนี้อยากกินข้าวผัด' }, { role: 'assistant', content: '...' },
  ]), null);
});

test('facts, arithmetic, requested drafting, personal incidents and appearance keep their specific routes', () => {
  for (const value of [
    '1+1 ได้เท่าไหร่', 'เป้าหมาย SDG มีทั้งหมดกี่ข้อ',
    'ช่วยเขียนข้อความบอกพ่อแม่ว่าเราอยากมีอิสระและเลือกเรียนเอง',
    'เราต้องทำงานหนักส่งเงินให้แม่และใช้หนี้จนไม่มีแรงแล้ว',
    'เราโดนเพื่อนที่ไว้ใจหลอกเอาเงินแล้ววันนี้เพิ่งรู้',
    'คนส่วนมากมองแค่รูปร่างภายนอกที่ยั่วยวน แต่ไม่มองตับไตไส้พุงภายใน',
    'อิสระแปลว่าอะไร', 'ขอวิธีตั้งเป้าหมายชีวิตสามขั้นตอน',
  ]) assert.equal(reflectiveDiscussionReply(value), null, value);
});

test('explicit topic changes can contain a fresh opinion and negated competition is respected', () => {
  assert.match(reflectiveDiscussionReply('เปลี่ยนเรื่อง เราคิดว่าคนเราควรเลือกชีวิตเอง ไม่ให้ใครมาบังคับ'), /สิทธิ์|เลือก/u);
  const response = reflectiveDiscussionReply('เราไม่อยากเอาชนะใครเลย แค่อยากมีอิสระเลือกชีวิตของตัวเองโดยไม่ถูกควบคุม');
  assert.match(response, /ไม่จำเป็นต้องมาจากการโกรธหรืออยากชนะ/u);
  assert.doesNotMatch(response, /ทุกก้าวมีไว้เอาชนะ/u);
  assert.equal(reflectiveDiscussionReply('บางครั้งเราแค่อยากปล่อยวาง แต่แม่ป่วยอยู่ เราหยุดทำงานไม่ได้จริงๆ'), null);
  assert.equal(reflectiveDiscussionReply('เพื่อนเราไม่ไว้ใจใครเลยและคิดว่าคนทุกคนเข้าหาเพราะผลประโยชน์ เราควรตอบเพื่อนยังไง'), null);
});

test('corrected decision boundary remains available to a later explanation', () => {
  const correction = 'ไม่ได้โกรธใคร แค่ไม่อยากให้คนอื่นตัดสินใจแทน';
  const response = reflectiveDiscussionReply('หมายความว่าไง', [{ role: 'user', content: correction }, { role: 'assistant', content: reflectiveDiscussionReply(correction) }]);
  assert.match(response, /คำเตือน|สิทธิ์(?:เลือก|ตัดสินใจ)/u);
  assert.doesNotMatch(response, /คุณโกรธ|ครอบครัว/u);
});

test('wording rotates only among answers grounded in the same theme', () => {
  const first = reflectiveDiscussionReply(statement);
  const next = reflectiveDiscussionReply(statement, [{ role: 'assistant', content: first }]);
  assert.notEqual(next, first);
  assert.match(next, /ตัดสินใจ|สิทธิ์|เลือก/u);
});
