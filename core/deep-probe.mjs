import { chooseReply } from './reply-variety.mjs';

// Five-layer downward probe (Socratic questioning / CBT "downward arrow"), spoken in
// the card-reading voice. Layer 1 is asked right after the card reading; later layers
// follow one per turn. Questions are open, one at a time, and never carry advice.
export const PROBE_LAYERS = Object.freeze([
  { layer: 1, key: 'event', goal: 'เหตุการณ์จริงที่กำลังวนอยู่ในหัว' },
  { layer: 2, key: 'thought', goal: 'ความคิดแรกหรือคำตีความที่ดังขึ้นตอนนั้น' },
  { layer: 3, key: 'feeling', goal: 'ความรู้สึกที่เกิดขึ้นและความหนักจาก 1 ถึง 10' },
  { layer: 4, key: 'fear', goal: 'สิ่งที่กลัวจะเสีย หรือสิ่งที่ลึก ๆ อยากได้' },
  { layer: 5, key: 'belief', goal: 'ความเชื่อเกี่ยวกับตัวเองหรือโลกที่อยู่ใต้ความกลัวนั้น' },
]);

const QUESTIONS = Object.freeze({
  1: [
    'ไพ่ใบนี้เห็นเงาของเรื่องหนึ่งอยู่ข้างหลังคุณ เล่าเท่าที่อยากเล่าได้เลย ช่วงนี้มีเรื่องไหนที่วนอยู่ในหัวบ้าง?',
    'ไพ่ใบนี้ชี้มาทางเรื่องที่ค้างอยู่ในใจ ตอนนี้มีเรื่องอะไรที่ค้างอยู่มากที่สุด?',
    'ภาพในไพ่ทำให้นึกถึงเรื่องที่ยังไม่จบสักเรื่อง ช่วงนี้มีเรื่องแบบนั้นไหม ถ้ามีเล่าให้ฟังได้เลย?',
  ],
  2: [
    'ไพ่ใบถัดไปถามถึงเสียงในหัว ตอนเรื่องนั้นเกิดขึ้น ประโยคแรกที่ดังขึ้นมาในใจคืออะไร?',
    'ถ้าเสียงในหัวตอนนั้นพูดออกมาเป็นประโยค มันพูดกับคุณว่าอะไร?',
    'ลองบอกเป็นประโยคสั้น ๆ ตามที่ผุดขึ้นมาครั้งแรก พอเรื่องนี้เกิดขึ้น ใจคุณแปลมันว่ายังไง?',
    'ไพ่ชวนฟังความคิดที่เร็วกว่าเหตุผล ตอนนั้นในหัวคุณคิดกับตัวเองว่าอะไร?',
  ],
  3: [
    'ถ้าความรู้สึกตอนนั้นเป็นสีหนึ่งสี คุณว่าเป็นสีอะไร แล้วหนักแค่ไหนจาก 1 ถึง 10?',
    'ตอนนี้ในอกรู้สึกอะไรมากที่สุด และถ้าให้คะแนนความหนักตั้งแต่ 1 ถึง 10 ได้เท่าไหร่?',
    'ไพ่ใบนี้ถามถึงน้ำหนักในใจ ความรู้สึกที่แรงที่สุดคืออะไร หนักประมาณกี่คะแนนจาก 10?',
  ],
  4: [
    'ถ้าเรื่องนี้เป็นอย่างที่คุณกลัวจริง ๆ สิ่งที่แย่ที่สุดที่จะเกิดขึ้นคืออะไร?',
    'ลึกลงไปใต้ความรู้สึกนั้น คุณกลัวจะเสียอะไร หรือกำลังอยากได้อะไรที่ยังไม่ได้รับ?',
    'ไพ่ใบนี้ชี้ลงไปที่ก้นใจ ถ้าต้องบอกว่ากลัวที่สุดคืออะไร คุณจะตอบว่าอะไร?',
  ],
  5: [
    'แล้วถ้าสิ่งนั้นเกิดขึ้นจริง มันจะบอกอะไรเกี่ยวกับตัวคุณ?',
    'ถ้าสิ่งที่กลัวเป็นจริง คุณจะสรุปกับตัวเองว่าเป็นคนแบบไหน?',
  ],
});

// A short bridge keeps the probe from feeling like an interrogation. The AI mode
// writes its own reflection of the user's words; this is the rule-mode fallback.
const BRIDGES = Object.freeze([
  'เรารับฟังอยู่นะ',
  'ภาพเริ่มชัดขึ้นอีกนิด',
  'ขอบคุณที่เล่าให้ฟัง',
  'เข้าใจว่าเรื่องนี้มีน้ำหนักกับคุณ',
]);

/** One question for a layer (1-5), avoiding wording this caller saw recently. */
export function probeQuestion(layer, messages = []) {
  const options = QUESTIONS[Math.min(5, Math.max(1, Math.trunc(layer) || 1))];
  return chooseReply(options, messages);
}

/** Rule-mode probe turn: short bridge, then exactly one question. */
export function probeReply(layer, messages = []) {
  return `${chooseReply(BRIDGES, messages)}\n${probeQuestion(layer, messages)}`;
}
