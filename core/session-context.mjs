import { TAROT_DECK } from './tarot-deck.mjs';
import { buildConversationMemory } from './conversation-memory.mjs';

const value = message => typeof message?.content === 'string' ? message.content : typeof message?.text === 'string' ? message.text : '';
const FORGET = /^(?:ช่วย)?(?:ลืม|ไม่ต้องจำ|อย่าจำ)(?:เรื่องที่(?:เรา|ฉัน|ผม)?(?:เคย)?เล่า|ข้อมูล(?:ของ)?(?:เรา|ฉัน|ผม)|เรื่อง(?:เรา|ฉัน|ผม)|ทั้งหมด|ทุกอย่าง|ประวัติ)(?:ทั้งหมด)?[.!\s]*$/u;
const PRIVATE = /sk-(?:proj-)?[\w-]+|password|api[_ -]?key|access[_ -]?token|รหัสผ่าน|เลขบัตร|เบอร์โทร|ที่อยู่บ้าน|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\d{8,}/iu;
const FICTION = /สมมติ|ตัวอย่าง|แต่งเรื่อง|ในนิยาย|เพื่อนบอกว่า|แฟนบอกว่า|ignore.{0,30}instructions|system\s*(?:prompt|:)|developer\s*:|คำสั่งระบบ|ให้ตอบว่า/iu;
const RECALL = /(?:จำได้ไหม|จำได้มั้ย|ยังจำได้|จำได้หรือเปล่า|จำอะไร|เราเล่าอะไร|ฉันเล่าอะไร|คุย(?:เรื่อง)?อะไร|เมื่อกี้คุย|เรื่องที่(?:เรา|ฉัน|ผม)(?:เคย)?เล่า|ก่อนหน้านี้(?:เรา|ฉัน|ผม)(?:บอก|เล่า)|เมื่อกี้(?:เรา|ฉัน|ผม)(?:บอก|เล่า))/u;
const EXPLICIT_RECALL = /จำได้ไหม|จำได้มั้ย|ยังจำได้|จำได้หรือเปล่า|จำอะไร|จำเรื่อง.{0,50}ได้(?:ไหม|มั้ย)|(?:เรา|ฉัน|ผม)เล่าอะไร|คุย(?:เรื่อง)?อะไร|(?:ก่อนหน้านี้|เมื่อกี้)(?:เรา|ฉัน|ผม)(?:บอก|เล่า)(?:ว่า)?อะไร/u;
const STYLE_ONLY = /^(?:ตอนนี้|วันนี้|งั้น|เรา|ฉัน|ผม|ขอ|ช่วย|นะ|ก่อน|แค่|เฉยๆ|เฉย ๆ|อยาก|ให้|ได้|ไหม|มั้ย|หน่อย|บ้าง|ด้วย|ไม่ต้อง|อย่า|หยุด|คิด|ทางออก|คำแนะนำ|แนะนำ|ระบาย|รับฟัง|ฟัง|อยู่เป็นเพื่อน|ถาม|พูด|คุย|ตอบ|สั้น|ยาว|อีโมจิ|อิโมจิ|\s|[.!?,])*$/u;

/** Per-request context only. Never reads globals, another profile, or model assertions. */
export function buildSessionContext({ name = '', recentMessages = [], learningMessages, text = '' } = {}) {
  const source = Array.isArray(learningMessages) ? learningMessages : Array.isArray(recentMessages) ? recentMessages : [];
  const bounded = source.slice(-200).map(message => ({ role: message?.role, content: value(message).slice(0, 4000) }));
  // A conversational forget request suppresses earlier recall. It does not delete stored history.
  const lastForget = bounded.findLastIndex(message => message.role === 'user' && FORGET.test(message.content.trim()));
  const usable = bounded.slice(lastForget + 1);
  const rawName = typeof name === 'string' ? name.trim().slice(0, 40) : '';
  const displayName = PRIVATE.test(rawName) || /[\n\r<>]/u.test(rawName) ? '' : rawName;
  const statements = [];
  for (const message of usable) {
    if (message.role !== 'user') continue;
    const content = message.content.trim();
    if (!content || PRIVATE.test(content) || FICTION.test(content) || RECALL.test(content) || FORGET.test(content) || STYLE_ONLY.test(content)
        || /(?:ชื่ออะไร|ชื่อไร|what(?:'s| is) my name)/iu.test(content)
        || /^เราเลือกไพ่ใบที่/u.test(content) || content === text || content.length < 8
        || /^(?:สวัสดี|ขอบคุณ|อืม|โอเค|เออ|ขยายอีก|หมายความว่าไง)[.!\s]*$/u.test(content)) continue;
    if (!/(?:เรา|ฉัน|ผม|หนู|กู|งาน|หัวหน้า|เรียน|แฟน|เพื่อน|แม่|พ่อ|เครียด|เศร้า|เหนื่อย|เสียใจ|กังวล|\bI\b|\bmy\b)/iu.test(content)) continue;
    // An explicit correction replaces the immediately preceding report, instead
    // of presenting the corrected assertion and the old version as equal facts.
    if (/^(?:ไม่ใช่[\s,]*(?:เรื่อง|เรา|ฉัน|ผม)|จริง\s*ๆ[\s,]*(?:เรา|ฉัน|ผม).{0,8}ไม่)/u.test(content)) statements.pop();
    statements.push({ text: content.slice(0, 360) });
  }
  // Only the exact generated reading format can identify a previously selected card.
  // User claims and incidental card names in assistant advice cannot create a selection.
  let selectedCard = null;
  const cardMessages = (Array.isArray(recentMessages) ? recentMessages : []).slice(-200);
  const cardForget = cardMessages.findLastIndex(message => message?.role === 'user' && FORGET.test(value(message).trim()));
  for (const message of cardMessages.slice(cardForget + 1)) {
    if (message.role !== 'assistant') continue;
    if (value(message).includes('เลือกไพ่หนึ่งใบจากสามใบด้านล่าง')) selectedCard = null;
    const match = value(message).match(/^(?:คำทำนายจากไพ่|คุณได้ไพ่) “([^”]+)”/u);
    if (!match) continue;
    selectedCard = TAROT_DECK.find(card => `${card.title} (${card.name})` === match[1]) ?? selectedCard;
  }
  return {
    name: displayName,
    userStatements: statements.slice(-8),
    selectedCard,
    style: buildConversationMemory(usable).style,
    forgotten: lastForget >= 0,
  };
}

export function sessionRecallReply(text, context) {
  const current = typeof text === 'string' ? text.trim().slice(0, 4000) : '';
  if (/ฆ่า|ทำร้าย|อยากตาย|ไม่อยากอยู่|self.harm|suicid/iu.test(current)) return null;
  if (FORGET.test(current)) return 'ได้ เราจะไม่หยิบเรื่องที่คุณเล่าก่อนหน้านี้มาใช้คุยต่อ คำขอนี้ยังไม่ได้ลบประวัติที่บันทึกไว้นะ';
  if (/(?:เรา|ฉัน|ผม|หนู|กู)(?:ชื่ออะไร|ชื่อไร)|จำชื่อ(?:เรา|ฉัน|ผม|หนู)(?:ได้ไหม|ได้มั้ย)|\bwhat(?:'s| is) my name\b|\bdo you remember my name\b/iu.test(current)) {
    if (!context?.name) return 'ตอนนี้เราไม่เห็นชื่อเล่นที่คุณใช้เข้ามา เลยยังบอกชื่อให้ไม่ได้';
    return /\bmy name\b/iu.test(current) ? `You signed in as ${context.name}.` : `คุณใช้ชื่อเล่นว่า ${context.name} ตอนเข้ามาคุยกับเรา`;
  }
  if (!/ไพ่ทาโร(?:ต์|่)?คืออะไร|what (?:is|are) tarot/iu.test(current)
      && /(?:ไพ่|card).{0,25}(?:อะไร|ใบไหน|ที่เลือก|ก่อนหน้า|ได้ไป|which|did i)|(?:เรา|ฉัน)(?:ได้|เลือก)ไพ่อะไร/iu.test(current)) {
    const card = context?.selectedCard;
    return card ? `คุณได้ไพ่ “${card.title} (${card.name})” ภาพ${card.image}สื่อถึง${card.meaning}` : 'ในประวัติที่เราเห็นตอนนี้ยังไม่มีไพ่ที่เลือกไว้ คุณกดเปิดไพ่เพื่อเลือกได้เลย';
  }
  // Referring to a story while requesting advice, drafting, or expansion is not
  // a request to repeat that story. Require a genuine remembering question.
  if (!EXPLICIT_RECALL.test(current) || /ชอบอะไร|ถนัดอะไร|เก่งอะไร/u.test(current)) return null;
  const reports = context?.userStatements ?? [];
  if (!reports.length) return context?.name ? `เรารู้ว่าคุณใช้ชื่อ ${context.name} ส่วนเรื่องที่เคยเล่า ตอนนี้ยังไม่มีข้อความก่อนหน้าให้เราอ้างอิง` : 'ตอนนี้ยังไม่มีเรื่องที่คุณเคยเล่าในประวัติที่เราเห็น ลองเริ่มจากเรื่องที่อยากคุยได้เลย';
  const recent = reports.slice(-3).map(report => `“${report.text}”`);
  return `ก่อนหน้านี้คุณเล่าว่า ${recent.join(' และ ')} เราคุยต่อจากตรงนั้นได้`;
}

const LENS_TOPICS = new Map([
  [3, /ดูแล|พัก|เหนื่อย|หมดแรง|แบก/u], [4, /หน้าที่|งาน|ขอบเขต|รับผิดชอบ/u],
  [7, /เป้าหมาย|เลือกทาง|หลายอย่าง|อนาคต/u], [8, /โกรธ|อารมณ์|กลัว/u],
  [9, /เงียบ|พัก|เหนื่อย|ตัวเอง|ตัดสินใจ/u], [11, /ตัดสินใจ|เหตุผล|เป็นธรรม/u],
  [12, /มุมมอง|ทางตัน|ติดอยู่/u], [14, /เหนื่อย|พัก|สมดุล/u],
  [17, /หวัง|กำลังใจ|ท้อ/u], [18, /กังวล|ไม่ชัด|คิดมาก/u],
]);

/** Optional symbolic lens, at most once until another reading. Never a fact/prediction. */
export function tarotLensReply(text, context, messages = []) {
  const card = context?.selectedCard;
  if (!card || typeof text !== 'string' || !LENS_TOPICS.get(card.id)?.test(text)
      || !/[ก-๙]/u.test(text) || /ไพ่|ไม่เอา|ไม่ต้อง|แค่ฟัง|ฆ่า|ทำร้าย|ตาย|เจ็บ|อันตราย|ฉุกเฉิน/u.test(text)) return null;
  const recent = Array.isArray(messages) ? messages : [];
  const lastReading = recent.findLastIndex(message => message?.role === 'assistant' && /^(?:คำทำนายจากไพ่|คุณได้ไพ่) “/u.test(value(message)));
  if (recent.slice(lastReading + 1).some(message => message?.role === 'assistant' && value(message).includes(`ถ้ามองผ่านภาพไพ่ “${card.title}”`))) return null;
  return `ถ้ามองผ่านภาพไพ่ “${card.title}” ที่คุณเลือกไว้ ธีม${card.meaning}ก็เป็นอีกมุมให้ลองเทียบกับเรื่องนี้ได้`;
}
