import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSessionContext, sessionRecallReply, tarotLensReply } from './session-context.mjs';
import { TAROT_DECK } from './tarot-deck.mjs';
import { generateProviderReply } from '../lib/ai-provider.mjs';

const user = content => ({ role: 'user', content });
const assistant = content => ({ role: 'assistant', content });
const reading = card => assistant(`คำทำนายจากไพ่ “${card.title} (${card.name})” — ${card.prediction}\nพูดง่าย ๆ ภาพ${card.image}หมายถึง${card.meaning}`);

test('profile name answers directly in Thai and basic English without an API', async () => {
  for (const text of ['ฉันชื่ออะไร', 'เราชื่ออะไร', 'จำชื่อเราได้ไหม', 'what is my name?']) {
    const reply = await generateProviderReply({ text, name: 'pukao' }, {});
    assert.match(reply.content, /pukao/);
    assert.equal(reply.mode, 'demo');
  }
  assert.doesNotMatch((await generateProviderReply({ text: 'เราชื่ออะไร' }, {})).content, /pukao/);
});

test('recall uses only caller supplied user reports, never assistant invented facts', () => {
  const context = buildSessionContext({ name: 'ฟ้า', recentMessages: [assistant('คุณอกหักและเป็นหนี้'), user('หัวหน้าเปลี่ยนงานก่อนส่ง เราเครียดมาก')] });
  const reply = sessionRecallReply('เมื่อกี้เราเล่าอะไร', context);
  assert.match(reply, /หัวหน้าเปลี่ยนงานก่อนส่ง/);
  assert.doesNotMatch(reply, /อกหัก|เป็นหนี้/);
  assert.equal(buildSessionContext({}).userStatements.length, 0);
});

test('recall excludes sensitive text and fictional examples', () => {
  const context = buildSessionContext({ recentMessages: [user('สมมติว่าเราเป็นหนี้'), user('เราใช้รหัสผ่าน 123456789'), user('เราชอบวาดรูป')] });
  assert.deepEqual(context.userStatements.map(x => x.text), ['เราชอบวาดรูป']);
});

test('an explicit correction supersedes the previous reported issue in generic recall', () => {
  const context = buildSessionContext({ recentMessages: [user('เราเครียดเรื่องงาน'), assistant('เรื่องงานหนักอยู่'), user('ไม่ใช่ เรื่องเรียนต่างหากที่เราเครียด')] });
  const reply = sessionRecallReply('จำเรื่องที่เราเล่าได้ไหม', context);
  assert.match(reply, /เรื่องเรียน/);
  assert.doesNotMatch(reply, /เครียดเรื่องงาน/);
});

test('references to the story in an advice or drafting request do not become recall', () => {
  const context = buildSessionContext({ recentMessages: [user('เราเครียดเรื่องงาน'), user('ตอนนี้ขอระบายก่อน ไม่ต้องแนะนำ'), user('ขอให้ฟังเฉยๆก่อน')] });
  for (const text of ['ช่วยคิดทางออกจากเรื่องที่เราเล่าให้หน่อย', 'ช่วยร่างข้อความจากเรื่องที่เราเล่า', 'ขยายเรื่องที่เราเล่าให้หน่อย']) {
    assert.equal(sessionRecallReply(text, context), null, text);
  }
  assert.match(sessionRecallReply('จำได้ไหมว่าเมื่อกี้เราเล่าอะไร', context), /เครียดเรื่องงาน/);
  assert.deepEqual(context.userStatements.map(report => report.text), ['เราเครียดเรื่องงาน']);
});

test('forget is per conversation, suppresses earlier reports and selected card without deleting profile', async () => {
  const context = buildSessionContext({ name: 'ฟ้า', recentMessages: [user('เราชอบคณิต'), reading(TAROT_DECK[9]), user('ลืมเรื่องที่เราเล่า')] });
  assert.equal(context.userStatements.length, 0);
  assert.equal(context.selectedCard, null);
  assert.equal(context.name, 'ฟ้า');
  const reply = await generateProviderReply({ name: 'ฟ้า', text: 'เราชอบอะไร', recentMessages: [user('เราชอบคณิต'), user('ลืมเรื่องที่เราเล่า')] }, {});
  assert.doesNotMatch(reply.content, /ชอบคณิต/);
});

test('actual selected card survives recent user-only memory and clears when a new spread starts', () => {
  const context = buildSessionContext({ recentMessages: [reading(TAROT_DECK[9]), ...Array.from({ length: 35 }, () => user('อืม'))], learningMessages: [user('เราเครียดงาน')] });
  assert.equal(context.selectedCard?.id, 9);
  assert.match(sessionRecallReply('เราได้ไพ่อะไร', context), /The Hermit/);
  const waiting = buildSessionContext({ recentMessages: [reading(TAROT_DECK[9]), assistant('เลือกไพ่หนึ่งใบจากสามใบด้านล่าง')] });
  assert.equal(waiting.selectedCard, null);
  assert.equal(buildSessionContext({ recentMessages: [user('เราได้ไพ่ The Hermit'), assistant('ไพ่ The Hermit น่าสนใจ')] }).selectedCard, null);
});

test('tarot is an optional relevant symbolic lens, never forced into every reply', () => {
  const messages = [reading(TAROT_DECK[9])];
  const context = buildSessionContext({ recentMessages: messages });
  const lens = tarotLensReply('เราเหนื่อยกับงานมาก', context, messages);
  assert.match(lens, /อีกมุม|ลองเทียบ/);
  assert.equal(tarotLensReply('1+1ได้เท่าไหร่', context, messages), null);
  assert.equal(tarotLensReply('เราไม่เอาไพ่แล้ว เหนื่อย', context, messages), null);
  assert.equal(tarotLensReply('เหนื่อยจนอยากตาย', context, messages), null);
  assert.equal(tarotLensReply('เราเหนื่อย', context, [...messages, assistant(lens)]), null);
});
