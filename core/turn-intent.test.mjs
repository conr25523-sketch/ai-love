import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeTurnIntent } from './turn-intent.mjs';

const screenshot = 'ชีวิตย่อมมีอุปสรรคแต่ตราบใดที่มีเป้าหมายคนเราจะเหยียบย่ำสิ่งที่มาขัดขวางเป้าหมายไม่ว่าจะคนสนิทหรือเชื่อใจคนเหล่านั้นก็แค่ตัวละครตัวนึงคนเหล่านั้นมาควบคุมความอิสระของเราได้เราจะเลือกเดินด้วยแข้งขาของตัวเอง';

test('the autonomy screenshot is an opinion, not an unanswered fact question', () => {
  const result = analyzeTurnIntent(screenshot);
  assert.equal(result.kind, 'opinion');
  assert.equal(result.isQuestion, false);
  assert.ok(result.themes.includes('autonomy'));
  assert.ok(result.themes.includes('goals'));
  assert.equal(result.isQuotedOrFictional, false, 'character imagery is a metaphor here, not a fictional scene');
});

for (const text of [
  'เราคิดว่าชีวิตเป็นของเรา ต่อให้คนอื่นไม่เห็นด้วยเราก็ต้องเลือกทางเอง',
  'คนเราไม่ควรให้ใครมาควบคุมอิสระของตัวเอง',
  'โลกมันไม่ได้ให้รางวัลคนที่พยายามที่สุดเสมอไป คนมีเส้นสายก็ได้เปรียบ',
  'เราว่าคนส่วนมากหลงรูปร่างภายนอกแต่ไม่เคยมองตัวตนภายในเลย',
  'อิสระมีราคาของมัน เราเลือกเองก็ต้องรับผิดชอบเอง',
]) test(`recognizes a viewpoint: ${text}`, () => assert.equal(analyzeTurnIntent(text).kind, 'opinion'));

for (const [text, theme] of [
  ['เป้าหมายชีวิตสำคัญเพราะทำให้เรารู้ว่าต้องเดินไปทางไหน', 'goals'],
  ['เราว่าคนอื่นจะคิดยังไงไม่ควรเป็นเงื่อนไขให้เราต้องพิสูจน์ตัวเอง', 'approval'],
  ['คนมีความสามารถเท่ากันแต่โอกาสที่ได้มันไม่เท่ากัน', 'effort-fairness'],
  ['เชื่อใจเพื่อนได้แต่ก็ต้องมีขอบเขต ไม่งั้นถูกเอาเปรียบ', 'trust-boundaries'],
  ['คนมักตัดสินคุณค่าจากหน้าตา ทั้งที่นิสัยข้างในต่างหากที่อยู่ด้วยกันจริง', 'appearance'],
]) test(`combines cue groups for ${theme}`, () => assert.ok(analyzeTurnIntent(text).themes.includes(theme)));

for (const text of [
  'เป้าหมาย', 'อิสระ', 'หน้าตา', 'งาน', 'ขยัน', 'ไว้ใจ',
  'ปุ่มเป้าหมายอยู่ตรงไหน', 'อยากกินข้าวผัดตับ',
  'รูปนี้สวยดี', 'เสรีภาพเป็นชื่อเพลง',
]) test(`does not route by an isolated noun: ${text}`, () => assert.deepEqual(analyzeTurnIntent(text).themes, []));

test('explicit requests and factual questions remain distinguishable', () => {
  assert.equal(analyzeTurnIntent('ช่วยเขียนข้อความบอกเพื่อนว่าอย่ามาควบคุมชีวิตเรา').kind, 'request');
  assert.equal(analyzeTurnIntent('อธิบายว่าอิสระกับความรับผิดชอบต่างกันยังไง').kind, 'request');
  assert.equal(analyzeTurnIntent('เสรีภาพแปลว่าอะไร').kind, 'question');
  assert.equal(analyzeTurnIntent('1+1 ได้เท่าไหร่').kind, 'question');
});

test('uncertainty expressed as a disclosure is not automatically a question', () => {
  for (const text of ['เราไม่รู้จะเรียนอะไร', 'เราไม่รุ้ว่าอนาคตจะเป็นยังไง', 'เราไม่แน่ใจว่าควรเรียนอะไร']) {
    const result = analyzeTurnIntent(text);
    assert.equal(result.kind, 'disclosure', text);
    assert.equal(result.isQuestion, false, text);
  }
  assert.equal(analyzeTurnIntent('เราไม่รู้จะเรียนอะไร ช่วยแนะนำหน่อย').kind, 'request');
  assert.equal(analyzeTurnIntent('เราไม่รู้จะเรียนอะไร ควรทำยังไง?').isQuestion, true);
});

test('correction takes precedence over a philosophical theme', () => {
  assert.equal(analyzeTurnIntent('ไม่ใช่ เราหมายถึงอิสระที่จะตัดสินใจเอง ไม่ใช่ทำร้ายคนอื่น').kind, 'correction');
  assert.equal(analyzeTurnIntent('เราหมายถึงคนมองแต่ภายนอกไม่มองตัวตน').kind, 'correction');
  assert.notEqual(analyzeTurnIntent('ไม่ใช่ว่าคนพยายามจะประสบความสำเร็จเสมอไป').kind, 'correction');
  assert.equal(analyzeTurnIntent('ไม่ได้โกรธใคร แค่ไม่อยากให้คนอื่นตัดสินใจแทน').kind, 'correction');
});

test('connected effort viewpoint without a general people prefix remains an opinion', () => {
  const result = analyzeTurnIntent('คือเราคิดว่าความพยายามไม่ได้รับประกันความสำเร็จ คนเริ่มต้นไม่เท่ากัน');
  assert.equal(result.kind, 'opinion');
  assert.ok(result.themes.includes('effort-fairness'));
});

test('natural requests for elaboration retain followup intent', () => {
  for (const text of ['หมายความว่าไง', 'ขยายอีกหน่อย', 'ขยายความอีกหน่อยนะ', 'อธิบายให้เข้าใจง่าย', 'อธิบายให้เข้าใจง่ายหน่อยครับ']) {
    assert.equal(analyzeTurnIntent(text).kind, 'followup', text);
  }
});

test('autonomy recognizes choice ownership and imposed life direction', () => {
  for (const text of [
    'เราว่าคนที่บ้านไม่จำเป็นต้องเห็นด้วยกับทางที่เราเลือก ขอแค่ไม่บังคับให้เราใช้ชีวิตตามความฝันของเขาก็พอ',
    'ไม่ได้โกรธใคร แค่ไม่อยากให้คนอื่นตัดสินใจแทน',
    'ทางที่ฉันเลือกอาจไม่ตรงกับพ่อแม่ แต่ไม่ควรมีใครมาบังคับ',
    'เขาบังคับให้ใช้ชีวิตตามความต้องการของเขา',
  ]) assert.ok(analyzeTurnIntent(text).themes.includes('autonomy'), text);
  assert.deepEqual(analyzeTurnIntent('ทางที่เราเลือกเป็นชื่อเพลง').themes, []);
});

test('followups inherit recent user themes, never the assistant guesses', () => {
  const messages = [
    { role: 'user', content: 'เราคิดว่าชีวิตเป็นของเรา ไม่อยากให้ใครควบคุมอิสระ' },
    { role: 'assistant', content: 'คุณกำลังห่วงสายตาคนอื่นและต้องการคำยอมรับจากเขา' },
    { role: 'user', content: 'แล้วไงต่อ' },
  ];
  const result = analyzeTurnIntent('แล้วไงต่อ', messages);
  assert.equal(result.kind, 'followup');
  assert.equal(result.source, 'history');
  assert.ok(result.themes.includes('autonomy'));
  assert.ok(!result.themes.includes('approval'));
  assert.equal(result.isPersonal, false);
});

test('a substantive intervening topic ends inherited philosophical discussion', () => {
  const messages = [
    { role: 'user', content: screenshot },
    { role: 'user', content: 'แมวที่บ้านกำลังนอนอยู่' },
  ];
  assert.deepEqual(analyzeTurnIntent('แล้วไงต่อ', messages).themes, []);
  assert.deepEqual(analyzeTurnIntent('อีกเรื่อง อธิบายเพิ่มหน่อย', [{ role: 'user', content: screenshot }]).themes, []);
  assert.deepEqual(analyzeTurnIntent('เพราะอะไร', [{ role: 'assistant', content: screenshot }]).themes, []);
});

test('quoted or fictional viewpoints are not claims about the visitor', () => {
  for (const text of [
    '“เราจะเลือกเดินทางของตัวเอง ไม่ยอมให้ใครควบคุมอิสระของเรา”',
    'ในนิยาย ตัวละครพูดว่าเราจะเลือกทางของเราไม่ให้ใครควบคุมอิสระ',
    'เพื่อนเราพูดว่าเราไม่อยากให้ใครควบคุมชีวิตเรา',
  ]) {
    const result = analyzeTurnIntent(text);
    assert.equal(result.isQuotedOrFictional, true);
    assert.equal(result.isPersonal, false);
  }
});

test('malformed history and inputs are safe and deterministic', () => {
  assert.equal(analyzeTurnIntent(null, null).kind, 'unknown');
  assert.equal(analyzeTurnIntent({}, []).kind, 'unknown');
  assert.deepEqual(analyzeTurnIntent('ต่อเลย', [null, {}, { role: 'user', content: {} }]).themes, []);
  assert.deepEqual(analyzeTurnIntent(screenshot), analyzeTurnIntent(screenshot));
});
