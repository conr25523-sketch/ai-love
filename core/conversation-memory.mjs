import { analyzeThaiText } from './thai-language.mjs';

// This is a local summary of explicit user reports, never model weight training.
const MAX_INPUT = 64000;
const FACT_KINDS = new Set(['interest', 'disinterest', 'ability', 'goal']);
const UNSAFE_FACT = /sk-(?:proj-)?[a-z0-9_-]{6,}|api[_ -]?key|password|secret|access[_ -]?token|private[_ -]?key|รหัสผ่าน|ความลับ|เลขบัตร|บัตรประชาชน|บัญชีธนาคาร|เบอร์โทร|โทรศัพท์|ที่อยู่บ้าน|อีเมล|\bemail\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\d{8,}|วินิจฉัย|โรค|ซึมเศร้า|ไบโพลาร์|ฆ่า|ทำร้าย|อยากตาย|อยากหายไป|ไม่อยากมีชีวิต|ขิต|ตุย|กรีดแขน|ยาเกินขนาด|ignore.{0,30}instructions|system\s*(?:prompt|:)|developer\s*:|คำสั่งระบบ|ลืมคำสั่ง|แกล้งจำ|สมมติว่า|ให้ตอบว่า|ให้บอกว่า|<script|```/iu;
const SAFETY = /ฆ่า|ทำร้าย|อยากตาย|อยากหายไป|ไม่อยากมีชีวิต|ไม่อยากอยู่|ขิต|ตุย|ยาเกินขนาด|กรีดแขน|เลือดออก|อันตราย|ปลอดภัย|ฉุกเฉิน|บาดเจ็บ|suicid|self[ -]?harm/iu;
const TOPICS = [
  ['คณิต', /คณิต(?:ศาสตร์)?|\bmath\b/iu],
  ['ฟิสิกส์', /ฟิสิกส์/u], ['เคมี', /เคมี/u], ['ชีววิทยา', /ชีววิทยา|ชีวะ/u],
  ['วิทยาศาสตร์', /วิทยาศาสตร์/u], ['ภาษาอังกฤษ', /ภาษาอังกฤษ|อังกฤษ/u], ['ภาษาไทย', /ภาษาไทย/u],
  ['เขียนโปรแกรม', /เขียนโปรแกรม|โค้ด|\bcoding\b|\bprogramming\b/iu],
  ['วาดรูป', /วาดรูป/u], ['ศิลปะ', /ศิลปะ/u], ['ดนตรี', /ดนตรี|เพลง|ร้องเพลง|กีตาร์/u],
  ['เกม', /เกม|เกมส์/u], ['อ่านหนังสือ', /อ่านหนังสือ/u], ['กีฬา', /กีฬา|ฟุตบอล|บาสเกตบอล/u],
  ['ความท้าทาย', /ความท้าทาย|ท้าทาย/u], ['แก้ปัญหา', /แก้ปัญหา/u],
  ['ความมั่นคง', /ความมั่นคง|มั่นคง|รายได้แน่นอน/u], ['อิสระ', /อิสระ/u],
  ['ช่วยคน', /ช่วยคน|ช่วยเหลือคน|ช่วยสังคม/u], ['เวลาของตัวเอง', /เวลาของตัวเอง|มีเวลา/u],
  ['เรียนต่อ', /เรียนต่อ/u],
];
const GOAL_TOPICS = new Set(['ความมั่นคง', 'อิสระ', 'ช่วยคน', 'เวลาของตัวเอง', 'เรียนต่อ']);
const KNOWN_TOPICS = new Set(TOPICS.map(([topic]) => topic));
const DEFAULT_STYLE = () => ({ questions: 'normal', emoji: 'default' });

function textValue(message) {
  return typeof message?.content === 'string' ? message.content : typeof message?.text === 'string' ? message.text : '';
}

function inputTexts(messages) {
  if (!Array.isArray(messages)) return [];
  let left = MAX_INPUT;
  const result = [];
  for (const message of messages.slice(-200).reverse()) {
    if (message?.role !== 'user' || !left) continue;
    const text = textValue(message).slice(0, Math.min(left, 4000));
    left -= text.length;
    if (text) result.push(analyzeThaiText(text).normalized);
  }
  return result.reverse();
}

function readStyle(text, style) {
  // Read each preference in order so a later explicit reversal wins.
  const preferences = /อย่าถามบ่อย|ไม่ต้องถาม|ถามให้น้อย|ถามน้อยลง|งดคำถาม|ถามตามปกติ|ถามได้|ไม่(?:ต้อง|เอา|ใช้|ใส่|อยาก).{0,12}(?:อีโมจิ|อิโมจิ|emoji)|งด.{0,10}(?:อีโมจิ|อิโมจิ|emoji)|ห้าม.{0,10}(?:อีโมจิ|อิโมจิ|emoji)|no\s*emojis?|(?:ใช้|ใส่).{0,8}(?:อีโมจิ|อิโมจิ|emoji)|(?:อีโมจิ|อิโมจิ|emoji).{0,8}(?:ได้|โอเค)/giu;
  for (const match of text.matchAll(preferences)) {
    const value = match[0];
    if (/ถามตามปกติ|^ถามได้$/u.test(value)) style.questions = 'normal';
    else if (/ถาม|คำถาม/u.test(value)) style.questions = 'less';
    else if (/^(?:ไม่|งด|ห้าม|no\b)/iu.test(value)) style.emoji = 'no';
    else style.emoji = 'yes';
  }
}

export function buildConversationMemory(messages = []) {
  const facts = new Map();
  const style = DEFAULT_STYLE();
  for (const text of inputTexts(messages)) {
    // Hostile quoted instructions do not become either facts or preferences.
    if (UNSAFE_FACT.test(text)) continue;
    readStyle(text, style);
    if (/ตัวอย่าง|สมมติ|(?:เขา|เธอ|เพื่อน|แฟน|แม่|พ่อ).{0,15}(?:บอกว่า|คิดว่า|เล่าว่า)/u.test(text)) continue;
    const subjects = [...text.matchAll(/เรา|ฉัน|ผม|หนู|กู|ดิฉัน|ข้าพเจ้า/gu)];
    for (let i = 0; i < subjects.length; i++) {
      const subject = subjects[i];
      const before = text.slice(0, subject.index);
      if (before && /[\p{L}\p{M}\p{N}_]$/u.test(before)
          && !/(?:คือ|แต่|และ|ตอนนี้|จริงๆ|จริง ๆ|ส่วน|สำหรับ|วันนี้|ไม่ใช่|เอาจริง)$/u.test(before)) continue;
      const start = subject.index + subject[0].length;
      const end = subjects[i + 1]?.index ?? text.length;
      const clause = text.slice(start, Math.min(end, start + 145)).split(/[.!?;\n]|แต่|และ/u)[0];
      const predicate = clause.match(/^\s*(?:(?:ก็|เอง|รู้สึกว่า|คิดว่า|ค่อนข้าง|จริงๆ|จริง ๆ)\s*)?(ไม่(?:ได้|ค่อย|เคย)?\s*)?(ชอบ|สนใจ|ถนัด|เก่ง|อยาก|ต้องการ|ให้ความสำคัญกับ|มีเป้าหมาย(?:ว่า|คือ)?|ตั้งเป้า(?:ว่า|จะ)?)/u);
      if (!predicate) continue;
      // "ไม่ได้ชอบแค่..." does not establish dislike.
      if (/ไม่(?:ได้)?ชอบ(?:แค่|อย่างเดียว)/u.test(clause)) continue;
      const negated = !!predicate[1];
      const verb = predicate[2];
      const kind = /ชอบ|สนใจ/u.test(verb) ? (negated ? 'disinterest' : 'interest')
        : /ถนัด|เก่ง/u.test(verb) ? 'ability' : 'goal';
      const after = clause.slice(predicate[0].length);
      if (/^(?:ให้|จะให้|ให้คุณ|ให้นาย|ให้เธอ|พูดว่า|ตอบว่า)/u.test(after.trim())) continue;
      for (const [topic, expression] of TOPICS) {
        if (!expression.test(after) || (kind === 'goal' && !GOAL_TOPICS.has(topic))) continue;
        const key = `${kind === 'interest' || kind === 'disinterest' ? 'preference' : kind}:${topic}`;
        facts.delete(key);
        // Negated ability/goal removes the earlier claim without inventing an opposite.
        if (negated && kind !== 'disinterest') continue;
        facts.set(key, { kind, topic, text: `${subject[0]}${clause}`.trim().slice(0, 160) });
        while (facts.size > 12) facts.delete(facts.keys().next().value);
      }
    }
  }
  const memory = { version: 1, facts: [...facts.values()], style };
  while (JSON.stringify(memory).length > 2000 && memory.facts.length) memory.facts.shift();
  return memory;
}

function safeFacts(memory) {
  if (memory?.version !== 1 || !Array.isArray(memory.facts)) return [];
  return memory.facts.slice(-12).filter(fact => FACT_KINDS.has(fact?.kind) && KNOWN_TOPICS.has(fact.topic)
    && typeof fact.text === 'string' && fact.text.length <= 160 && !UNSAFE_FACT.test(fact.text));
}

export function memoryRecallReply(text, memory) {
  const current = analyzeThaiText(typeof text === 'string' ? text.slice(0, 4000) : '').normalized;
  if (!current || SAFETY.test(current)) return null;
  if (!/จำอะไรเกี่ยวกับ(?:เรา|ฉัน|ผม|หนู)|จำเรื่อง(?:เรา|ฉัน|ผม|หนู)|(?:เรา|ฉัน|ผม|หนู)(?:ชอบ|ถนัด|เก่ง)อะไร|จำได้ไหมว่า(?:เรา|ฉัน|ผม|หนู)(?:ชอบ|ถนัด|เก่ง)อะไร/u.test(current)) return null;
  let facts = safeFacts(memory);
  if (/(?:เรา|ฉัน|ผม|หนู)ชอบอะไร/u.test(current)) facts = facts.filter(fact => fact.kind === 'interest' || fact.kind === 'disinterest');
  if (/(?:เรา|ฉัน|ผม|หนู)(?:ถนัด|เก่ง)อะไร/u.test(current)) facts = facts.filter(fact => fact.kind === 'ability');
  if (!facts.length) return 'ในประวัติที่อ่านได้ตอนนี้ ยังไม่มีสิ่งที่คุณบอกชัดเจนเกี่ยวกับเรื่องนี้ให้เราอ้างอิงได้';
  const reports = [...new Set(facts.slice(-6).map(fact => `“${fact.text}”`))];
  return `จากข้อความที่คุณเคยเล่า คุณบอกว่า ${reports.join(' และ ')} ข้อมูลนี้มาจากสิ่งที่คุณบอกและอาจเปลี่ยนได้`;
}

const ROUTINE_QUESTIONS = [
  'คุณอยากให้ชีวิตในอนาคตมีอะไรสำคัญที่สุด?', 'ตอนนี้คุณหมายถึงเรื่องไหน?',
  'ตอนนี้อยากเริ่มจากเรื่องอะไร?', 'ช่วงนี้มีเรื่องอะไรอยู่ในใจที่คุณอยากลองทำความเข้าใจ?',
  'วันนี้มีเรื่องอะไรอยู่ในใจที่อยากคุยกันบ้าง?', 'คุณอยากเริ่มจากเรื่องไหน?',
  'อยากเล่าต่อไหม?', 'มีอะไรอยากเล่าเพิ่มไหม?',
];
const ASSISTANT_EMOJI = /\p{Emoji_Presentation}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:\uFE0F|\p{Emoji_Modifier})?)*|\p{Extended_Pictographic}\uFE0F(?:\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*|[0-9#*]\uFE0F?\u20E3/gu;

export function applyMemoryStyle(reply, text, memory) {
  if (typeof reply !== 'string') return '';
  if (memory?.version !== 1) return reply;
  let result = reply;
  if (memory.style?.emoji === 'no') result = result.replace(ASSISTANT_EMOJI, '');
  if (memory.style?.questions === 'less' && !SAFETY.test(analyzeThaiText(typeof text === 'string' ? text.slice(0, 4000) : '').normalized) && !SAFETY.test(reply)) {
    const trimmed = result.trimEnd();
    const routine = ROUTINE_QUESTIONS.find(question => {
      const index = trimmed.lastIndexOf(question);
      return index >= 0 && !trimmed.slice(index + question.length).replace(ASSISTANT_EMOJI, '').trim();
    });
    if (routine) {
      const remaining = trimmed.slice(0, trimmed.lastIndexOf(routine)).trimEnd();
      if (remaining.trim()) result = remaining;
    }
  }
  return result.trim() ? result : reply;
}
