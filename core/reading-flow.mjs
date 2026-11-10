import { CARD_INVITATION, symbolicCardReply } from './symbolic-cards.mjs';
import { prefersListeningOnly } from './gentle-guidance.mjs';
import { parseModeRequest } from './response-mode.mjs';
import { probeQuestion } from './deep-probe.mjs';
import { MODE_INVITATION, MODE_INVITATION_CUPS_ONLY, MODE_REQUEST } from './reading-markers.mjs';

// One reading round, derived only from this caller's saved dialogue (no extra state):
//   card choice -> probe (3 questions) -> insight -> confirm -> mode reply -> follow-up
// Marker lines the page uses to show the two choices live in reading-markers.mjs.
export { MODE_REQUEST, MODE_INVITATION, MODE_INVITATION_CUPS_ONLY };

const CARD_CHOICE = /^เราเลือกไพ่ใบที่\s*[1-3]/u;
const SKIP_PROBING = /^(?:บอกมา(?:เลย)?|สรุป(?:ให้)?(?:เลย|หน่อย)?|ว่ายังไงบ้าง|ไพ่ว่ายังไง|ทำนาย(?:เลย|ให้ฟัง)?)[.!?\s]*$/u;
const CONFIRM_ENOUGH_ANSWERS = 4; // free answers after the card before the insight
const SKIP_MIN_ANSWERS = 2;
const LAST_PROBE_LAYER = 4; // layer 5 (core belief) is offered as a hypothesis in the insight

function textOf(message) {
  const value = typeof message?.content === 'string' ? message.content : message?.text;
  return typeof value === 'string' ? value : '';
}

function dialogue(messages, text) {
  const list = (Array.isArray(messages) ? messages : [])
    .filter(message => message && (message.role === 'user' || message.role === 'assistant') && textOf(message).trim())
    .map(message => ({ role: message.role, content: textOf(message).trim() }));
  const current = typeof text === 'string' ? text.trim() : '';
  const last = list.at(-1);
  if (current && !(last?.role === 'user' && last.content === current)) list.push({ role: 'user', content: current });
  return list;
}

/**
 * Where this caller is in the reading round.
 * stage: 'reading' | 'probe' | 'listen' | 'insight' | 'confirm' | 'respond' | 'follow-up'
 */
export function readingFlowState(messages = [], text = '') {
  const all = dialogue(messages, text);
  const pick = all.findLastIndex(message => message.role === 'user' && CARD_CHOICE.test(message.content));
  if (pick < 0) return { active: false };
  const after = all.slice(pick + 1);
  // A newer invitation means a new, still-unchosen round: this one is over.
  if (after.some(message => message.role === 'assistant' && message.content.includes(CARD_INVITATION))) return { active: false };
  if (pick === all.length - 1) return { active: true, stage: 'reading', answers: 0 };

  const current = all.at(-1).content;
  // Messages of this round before the current one; mode choice reads these.
  const round = after.slice(0, -1);
  const userAfter = after.filter(message => message.role === 'user');
  const answers = userAfter.filter(message => !parseModeRequest(message.content)).length;
  const requested = parseModeRequest(current);
  if (requested) return { active: true, stage: 'respond', answers, requested, round };

  const lastModeIndex = after.findLastIndex(message => message.role === 'user' && parseModeRequest(message.content));
  if (lastModeIndex >= 0) {
    const lastRequested = parseModeRequest(after[lastModeIndex].content);
    const gaveReply = after.slice(lastModeIndex + 1).some(message => message.role === 'assistant');
    return { active: true, stage: 'follow-up', answers, round, lastRequested, afterSwords: lastRequested === 'swords' && gaveReply };
  }
  if (after.some(message => message.role === 'assistant' && (message.content.includes(MODE_INVITATION) || message.content.includes(MODE_INVITATION_CUPS_ONLY)))) {
    return { active: true, stage: 'confirm', answers, round };
  }
  if (prefersListeningOnly(current, all.slice(0, -1))) return { active: true, stage: 'listen', answers, round };
  // "Tell me now" is a request, not an answer, so it does not count toward the minimum.
  const skip = SKIP_PROBING.test(current) && answers - 1 >= SKIP_MIN_ANSWERS;
  if (answers >= CONFIRM_ENOUGH_ANSWERS || skip) return { active: true, stage: 'insight', answers, round, skipped: skip };
  return { active: true, stage: 'probe', answers, round, layer: Math.min(answers + 1, LAST_PROBE_LAYER) };
}

/** The two-choice block appended after an insight; cups only when the hard reading is not allowed. */
export function modeInvitationBlock(recommendation) {
  if (!recommendation.swordsAllowed) return `ตอนนี้เราแนะนำไพ่ถ้วย คือกำลังใจและการปลอบ\n${MODE_INVITATION_CUPS_ONLY}`;
  const pick = recommendation.recommended === 'swords' ? 'ไพ่ดาบ' : 'ไพ่ถ้วย';
  return `ฟังต่อได้สองแบบ ไพ่ถ้วยคือกำลังใจและการปลอบ ไพ่ดาบคือความจริงตรง ๆ ที่อาจแสบ ตอนนี้เราแนะนำ${pick}\n${MODE_INVITATION}`;
}

export const SWORDS_EXIT_LINE = 'ถ้าแรงไป บอกได้นะ เราเปลี่ยนเป็นไพ่ถ้วยได้';

/** The card reading plus the first probe question, so the round keeps moving. */
export function cardChoiceReply(text, priorMessages = []) {
  const reading = symbolicCardReply(text, priorMessages);
  if (!reading) return null;
  return `${reading}\n\n${probeQuestion(1, priorMessages)}`;
}
