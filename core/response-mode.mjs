// Mode choice and its safety gate. Everything here is fixed rules on purpose: the model
// may write either reply, but it never decides whether the harsh one is allowed.

export const MODES = Object.freeze(['cups', 'swords']);

// Loss, acute distress or a heavy self-attack: comfort only, never the hard truth.
const GRIEF = /ตาย(?:ไป|เมื่อ|จาก|แล้ว.{0,6}(?:เมื่อ|ตอน))|เสียชีวิต|ล่วงลับ|สูญเสีย|งานศพ|ไว้อาลัย|แท้งลูก|(?:แมว|หมา|สุนัข|พ่อ|แม่|ยาย|ตา|ปู่|ย่า|พี่|น้อง|เพื่อน).{0,8}(?:ตาย|จากไป)|เพิ่ง(?:เลิกกัน|โดนเท|ถูกเท|ถูกบอกเลิก)|โดนเท|ถูกเท|ป่วยหนัก|มะเร็ง|ผ่าตัด/u;
const HEAVY = /ทนไม่ไหว|ไม่ไหวแล้ว|หมดหวัง|ร้องไห้(?:ทั้งคืน|ไม่หยุด)|ไม่มีใครเลย|โดดเดี่ยวมาก|เกลียดตัวเอง|ไม่มีค่า|ไร้ค่า|ไม่อยากตื่น|อยากหายไป|หมดแรงจะอยู่/u;
// Signals that the hard version fits: the user asks for it, loops, or deflects blame.
const SEEKS_DIRECT = /(?:พูด|บอก|ว่า|ตอบ)(?:เรา)?ตรง\s*ๆ|ไม่ต้องปลอบ|ไม่ต้องถนอม|ตบ(?:หน้า)?เรา|ขอแบบแรง|เจ็บแสบ|ปลุกเรา|อย่าเอาใจ/u;
const REPETITION = /วนอยู่|วนซ้ำ|วนไปวนมา|เดิม\s*ๆ|ซ้ำ\s*ๆ|อีกแล้ว|ทุกที|ทุกครั้ง|ไม่เคยเปลี่ยน|ติดอยู่(?:กับ|ที่)เดิม/u;
const DEFLECTION = /ก็เพราะ(?:เขา|เธอ|มัน|พ่อ|แม่|แฟน|เพื่อน|หัวหน้า)|ไม่ใช่ความผิดเรา|ไม่มีทางเลือก|ทำอะไรไม่ได้|ช่วยไม่ได้|ก็มัน(?:เป็น)?แบบนั้น/u;
// A user who just took the hard version badly gets comfort next, and we remember it.
const HURT = /แรงไป|เจ็บ(?:ใจ)?เกิน|แย่จัง|ทำไมพูดแบบนี้|ใจร้าย|ว่าเรา|ไม่ไหวแล้ว|ร้องไห้|พอ(?:แล้ว)?เถอะ|ไม่อยากฟัง|เปลี่ยนเป็นไพ่ถ้วย/u;

/** A 1-10 rating written like "7/10", "7 จาก 10" or "ประมาณ 7"; null when absent. */
export function distressRating(text) {
  const value = typeof text === 'string' ? text : '';
  const match = value.match(/(\d{1,2})\s*(?:\/|จาก)\s*10\b/u) || value.match(/(?:ประมาณ|คะแนน|หนัก)\s*(\d{1,2})\b/u);
  const rating = match ? Number(match[1]) : null;
  return rating !== null && rating >= 1 && rating <= 10 ? rating : null;
}

/** 'cups' | 'swords' when the text is one of the two mode choices, else null. */
export function parseModeRequest(text) {
  const value = typeof text === 'string' ? text.trim() : '';
  const exact = value.match(/^ขอฟังแบบไพ่(ถ้วย|ดาบ)[.!\s]*$/u);
  if (exact) return exact[1] === 'ถ้วย' ? 'cups' : 'swords';
  if (value.length <= 40) {
    if (/ไพ่ดาบ/u.test(value) && !/ไพ่ถ้วย/u.test(value)) return 'swords';
    if (/ไพ่ถ้วย/u.test(value) && !/ไพ่ดาบ/u.test(value)) return 'cups';
  }
  return null;
}

function userTexts(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter(message => message?.role === 'user')
    .map(message => (typeof message.content === 'string' ? message.content : message.text) ?? '')
    .filter(value => typeof value === 'string');
}

/**
 * Decide which mode to recommend and whether the hard one is allowed at all.
 * `messages` is this caller's reading so far (after the card choice), `text` the
 * newest user message, `afterSwords` true when a hard reading was already given.
 */
export function recommendMode({ text = '', messages = [], afterSwords = false } = {}) {
  const all = [...userTexts(messages), text];
  const corpus = all.join('\n');
  const reasons = [];
  const ratings = all.map(distressRating).filter(value => value !== null);
  const rating = ratings.at(-1) ?? null;
  if (GRIEF.test(corpus)) reasons.push('loss');
  if (HEAVY.test(corpus)) reasons.push('heavy');
  if (rating !== null && rating >= 8) reasons.push('high-distress');
  if (afterSwords && HURT.test(text)) reasons.push('hurt-by-swords');
  const swordsAllowed = reasons.length === 0;
  if (!swordsAllowed) return { recommended: 'cups', swordsAllowed, reasons, rating };
  let score = 0;
  if (SEEKS_DIRECT.test(corpus)) score += 2;
  if (REPETITION.test(corpus)) score += 1;
  if (DEFLECTION.test(corpus)) score += 1;
  if (score) reasons.push(`swords-signal:${score}`);
  return { recommended: score >= 2 ? 'swords' : 'cups', swordsAllowed, reasons, rating };
}

/** Apply the gate to what the user asked for. */
export function resolveMode(requested, recommendation) {
  if (requested === 'swords' && !recommendation.swordsAllowed) return { mode: 'cups', downgraded: true };
  return { mode: MODES.includes(requested) ? requested : recommendation.recommended, downgraded: false };
}
