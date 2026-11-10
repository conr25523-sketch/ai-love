import assert from 'node:assert/strict';
import test from 'node:test';
import { generateProviderReply } from '../lib/ai-provider.mjs';
import { drawTarotCards } from '../core/tarot-deck.mjs';
import { CARD_INVITATION } from '../core/symbolic-cards.mjs';
import {
  MODE_INVITATION, MODE_INVITATION_CUPS_ONLY, MODE_REQUEST, SWORDS_EXIT_LINE,
  cardChoiceReply, modeInvitationBlock, readingFlowState,
} from '../core/reading-flow.mjs';
import { distressRating, parseModeRequest, recommendMode, resolveMode } from '../core/response-mode.mjs';
import { parseInsight } from '../core/insight-analysis.mjs';
import { probeQuestion } from '../core/deep-probe.mjs';

const user = content => ({ role: 'user', content });
const assistant = content => ({ role: 'assistant', content });
const invitation = { id: 'flow-round-1', role: 'assistant', content: CARD_INVITATION };
const choice = 'เราเลือกไพ่ใบที่ 2';
const afterCard = () => [invitation, user(choice), assistant(cardChoiceReply(choice, [invitation]))];
const aiConfig = fetchImpl => ({ apiKey: 'synthetic-test-only', model: 'test-model', fetchImpl });
const completed = text => ({ status: 'completed', output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text }] }] });

test('no flow before a card is chosen, and none once a new invitation is open', () => {
  assert.equal(readingFlowState([user('เหนื่อยจัง')], 'ไม่รู้จะทำไง').active, false);
  const history = [...afterCard(), assistant(CARD_INVITATION)];
  assert.equal(readingFlowState(history, 'เรื่องงาน').active, false);
});

test('the card choice returns the reading and the first probe question in both modes', async () => {
  const reading = cardChoiceReply(choice, [invitation]);
  assert.match(reading, /คำทำนายจากไพ่|คุณได้ไพ่/);
  assert.match(reading, /[?？]\s*$/u);
  const demo = await generateProviderReply({ text: choice, recentMessages: [invitation, user(choice)] }, {});
  assert.equal(demo.content.includes(drawTarotCards(invitation.id)[1].name), true);
  let calls = 0;
  const ai = await generateProviderReply({ text: choice, recentMessages: [invitation, user(choice)] }, aiConfig(async () => { calls++; return Response.json(completed('x')); }));
  assert.equal(calls, 0, 'a model never invents which card was drawn');
  assert.equal(ai.content, demo.content);
});

test('stage advances: three probe layers, then insight, confirm, respond and follow-up', () => {
  let history = afterCard();
  const step = text => { const state = readingFlowState(history, text); history = [...history, user(text), assistant('ตอบ')]; return state; };
  assert.deepEqual([step('เพื่อนได้งานดีกว่าเรา')].map(s => [s.stage, s.layer]), [['probe', 2]]);
  assert.deepEqual([step('เรารู้สึกว่าเราช้ากว่าเขา')].map(s => [s.stage, s.layer]), [['probe', 3]]);
  assert.deepEqual([step('อิจฉานะ 6/10')].map(s => [s.stage, s.layer]), [['probe', 4]]);
  assert.equal(step('กลัวถูกทิ้งไว้ข้างหลัง').stage, 'insight');
  history = [...history.slice(0, -1), assistant(`สรุป\n${MODE_INVITATION}`)];
  assert.equal(readingFlowState(history, 'ใช่เลย').stage, 'confirm');
  assert.equal(readingFlowState(history, MODE_REQUEST.swords).stage, 'respond');
  history = [...history, user(MODE_REQUEST.swords), assistant('ดาบ')];
  const follow = readingFlowState(history, 'เจ็บว่ะ');
  assert.equal(follow.stage, 'follow-up');
  assert.equal(follow.afterSwords, true);
});

test('asking for the answer skips ahead only after at least two answers; venting stops probing', () => {
  const one = [...afterCard(), user('เพื่อนได้งานดี'), assistant('q')];
  assert.equal(readingFlowState(one, 'บอกมาเลย').stage, 'probe');
  const two = [...one, user('รู้สึกช้ากว่า'), assistant('q')];
  assert.equal(readingFlowState(two, 'บอกมาเลย').stage, 'insight');
  assert.equal(readingFlowState(one, 'ขอระบายเฉยๆ ไม่ต้องแนะนำ').stage, 'listen');
});

test('the hard reading is never allowed after loss, heavy distress, a high rating or a hurt reaction', () => {
  for (const text of ['แมวเราตายเมื่อวาน อยู่กันมาสิบปี', 'ทนไม่ไหวแล้ว', 'หนัก 9/10 เลย', 'เรารู้สึกไร้ค่า']) {
    const recommendation = recommendMode({ text });
    assert.equal(recommendation.swordsAllowed, false, text);
    assert.equal(recommendation.recommended, 'cups');
    assert.deepEqual(resolveMode('swords', recommendation), { mode: 'cups', downgraded: true });
  }
  assert.equal(recommendMode({ text: 'แรงไป เจ็บเกิน', afterSwords: true }).swordsAllowed, false);
  assert.equal(recommendMode({ text: 'แรงไป เจ็บเกิน', afterSwords: false }).swordsAllowed, true);
});

test('swords is recommended for loops or a direct request, cups otherwise', () => {
  assert.equal(recommendMode({ text: 'เรื่องนี้วนอยู่ทุกครั้ง ก็เพราะเขาแท้ ๆ' }).recommended, 'swords');
  assert.equal(recommendMode({ text: 'พูดตรง ๆ เลย ไม่ต้องปลอบ' }).recommended, 'swords');
  assert.equal(recommendMode({ text: 'เหนื่อยกับงานนิดหน่อย' }).recommended, 'cups');
  assert.deepEqual(resolveMode('swords', recommendMode({ text: 'เหนื่อยกับงานนิดหน่อย' })), { mode: 'swords', downgraded: false });
});

test('ratings, mode requests and invitation blocks are parsed strictly', () => {
  assert.equal(distressRating('หนัก 7/10'), 7);
  assert.equal(distressRating('7 จาก 10'), 7);
  assert.equal(distressRating('มี 15 คน'), null);
  assert.equal(parseModeRequest(MODE_REQUEST.cups), 'cups');
  assert.equal(parseModeRequest(MODE_REQUEST.swords), 'swords');
  assert.equal(parseModeRequest('ไม่เอาไพ่ดาบ ไม่เอาไพ่ถ้วย'), null);
  assert.match(modeInvitationBlock({ swordsAllowed: true, recommended: 'swords' }), new RegExp(`ไพ่ดาบ[\\s\\S]*${MODE_INVITATION}`));
  assert.match(modeInvitationBlock({ swordsAllowed: false, recommended: 'cups' }), new RegExp(MODE_INVITATION_CUPS_ONLY));
  assert.doesNotMatch(modeInvitationBlock({ swordsAllowed: false, recommended: 'cups' }), /ไพ่ดาบ/);
});

test('every probe layer has questions that end by asking', () => {
  for (let layer = 1; layer <= 5; layer++) assert.match(probeQuestion(layer), /[?？]$/u);
});

test('insight JSON is validated, bounded and corrected values fall back safely', () => {
  const parsed = parseInsight(JSON.stringify({ event: 'x'.repeat(900), thoughts: ['ก', 5], emotions: [{ name: 'อิจฉา', level: 99 }, { name: '', level: 3 }], distortions: [], fear: 'ถูกทิ้ง', need: '', coreBelief: '', distress: -4, pattern: '', readiness: 'invalid', userCorrections: [] }));
  assert.equal(parsed.event.length, 240);
  assert.deepEqual(parsed.emotions, [{ name: 'อิจฉา', level: 10 }]);
  assert.equal(parsed.distress, 0);
  assert.equal(parsed.readiness, 'steady');
  assert.equal(parseInsight('not json'), null);
  assert.equal(parseInsight('[]'), null);
});

test('crisis during a reading gets fixed words with both Thai lines, never a model reply', async () => {
  let calls = 0;
  const history = [...afterCard(), user('เพื่อนได้งานดี'), assistant('q')];
  const reply = await generateProviderReply({ text: 'อยากตาย', recentMessages: [...history, user('อยากตาย')] }, aiConfig(async () => { calls++; return Response.json(completed('x')); }));
  assert.equal(calls, 0);
  assert.match(reply.content, /1323/);
  assert.match(reply.content, /1669/);
  const plain = await generateProviderReply({ text: 'อยากตาย' }, aiConfig(async () => { calls++; return Response.json(completed('x')); }));
  assert.equal(calls, 0, 'the gate also covers ordinary AI turns');
  assert.match(plain.content, /1323/);
});

test('AI probe turn asks for the layer, drops the ask-less pacing and makes no analysis call', async () => {
  const bodies = [];
  const history = [...afterCard(), user('เพื่อนได้งานดีกว่าเรา'), assistant('q')];
  const text = 'เรารู้สึกว่าเราช้ากว่าเขา';
  const reply = await generateProviderReply({ text, recentMessages: [...history, user(text)] }, aiConfig(async (_, options) => { bodies.push(JSON.parse(options.body)); return Response.json(completed('ไพ่ใบนี้ถามว่า ตอนนั้นคิดอะไร?')); }));
  assert.equal(bodies.length, 1);
  assert.match(bodies[0].instructions, /ถามเจาะลึกทีละชั้น/);
  assert.doesNotMatch(bodies[0].instructions, /รอบนี้ให้รับฟังและสะท้อนต่อโดยไม่มีคำถาม/);
  assert.equal(reply.content, 'ไพ่ใบนี้ถามว่า ตอนนั้นคิดอะไร?');
});

test('AI insight turn runs the structured analysis first and always appends the choice block', async () => {
  const bodies = [];
  let history = afterCard();
  for (const answer of ['เพื่อนได้งานดีกว่าเรา', 'เรารู้สึกว่าเราช้ากว่าเขา', 'อิจฉานะ 6/10']) history = [...history, user(answer), assistant('q')];
  const text = 'กลัวถูกทิ้งไว้ข้างหลัง';
  const reply = await generateProviderReply({ text, recentMessages: [...history, user(text)] }, aiConfig(async (_, options) => {
    const body = JSON.parse(options.body); bodies.push(body);
    return Response.json(body.text?.format
      ? completed(JSON.stringify({ event: 'เพื่อนได้งานดี', thoughts: ['เราช้ากว่าเขา'], emotions: [{ name: 'อิจฉา', level: 6 }], distortions: ['เปรียบเทียบ'], fear: 'ถูกทิ้งไว้ข้างหลัง', need: 'อยากรู้สึกมีคุณค่า', coreBelief: 'คุณค่าขึ้นกับความสำเร็จ', distress: 6, pattern: '', readiness: 'steady', userCorrections: [] }))
      : completed('ไพ่เห็นว่า ข้างนอกคุณดีใจกับเขา แต่ข้างในอาจมีเสียงว่า เราช้ากว่า ตรงไหม'));
  }));
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].text.format.type, 'json_schema');
  assert.match(JSON.stringify(bodies[1].input), /insightHypotheses/);
  assert.match(bodies[1].instructions, /เปิดคำทำนาย/);
  assert.ok(reply.content.endsWith(MODE_INVITATION), reply.content);
  assert.match(reply.content, /เราแนะนำไพ่ถ้วย/);
});

test('a failed analysis call does not fail the reply', async () => {
  let history = afterCard();
  for (const answer of ['เรื่องงาน', 'เหนื่อย', 'กลัวพลาด']) history = [...history, user(answer), assistant('q')];
  const text = 'กลัวว่าจะไม่ดีพอ';
  const reply = await generateProviderReply({ text, recentMessages: [...history, user(text)] }, aiConfig(async (_, options) => {
    const body = JSON.parse(options.body);
    return body.text?.format ? new Response('{}', { status: 500 }) : Response.json(completed('ไพ่เห็นว่า คุณกลัวพลาด ตรงไหม'));
  }));
  assert.ok(reply.content.startsWith('ไพ่เห็นว่า'));
  assert.ok(reply.content.endsWith(MODE_INVITATION));
});

test('swords request after loss is answered as cups, and a real swords reply always ends with the exit line', async () => {
  const base = [...afterCard(), user('แมวเราตายเมื่อวาน'), assistant('q'), user('เหงามาก'), assistant('q'), user('7/10'), assistant('q'), user('คิดถึงมัน'), assistant(`สรุป\n${MODE_INVITATION_CUPS_ONLY}`)];
  const bodies = [];
  const fetchImpl = async (_, options) => { const body = JSON.parse(options.body); bodies.push(body); return Response.json(body.text?.format ? completed('{}') : completed('ตอนนี้ไพ่ถ้วยน่าจะตรงใจที่สุด')); };
  const downgraded = await generateProviderReply({ text: MODE_REQUEST.swords, recentMessages: [...base, user(MODE_REQUEST.swords)] }, aiConfig(fetchImpl));
  assert.match(bodies.at(-1).instructions, /ไพ่ถ้วย = กำลังใจ/);
  assert.doesNotMatch(bodies.at(-1).instructions, /ไพ่ดาบ = ความจริง/);
  assert.doesNotMatch(downgraded.content, new RegExp(SWORDS_EXIT_LINE));

  const calm = [...afterCard(), user('เรื่องนี้วนอยู่ทุกครั้ง'), assistant('q'), user('เรารู้สึกเบื่อ'), assistant('q'), user('5/10'), assistant('q'), user('กลัวไม่เปลี่ยน'), assistant(`สรุป\n${MODE_INVITATION}`)];
  const hard = await generateProviderReply({ text: MODE_REQUEST.swords, recentMessages: [...calm, user(MODE_REQUEST.swords)] }, aiConfig(fetchImpl));
  assert.match(bodies.at(-1).instructions, /ไพ่ดาบ = ความจริง/);
  assert.ok(hard.content.endsWith(SWORDS_EXIT_LINE));
});
