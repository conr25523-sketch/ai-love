import { arithmeticReply } from './arithmetic.mjs';

// Navigation is optional and never sends a message or infers why a user is quiet.
/** @param {Array<{role: string, content: string}>} messages */
export function conversationSuggestions(messages = []) {
  const recent = messages.filter(message => message && typeof message.content === 'string').slice(-8);
  const last = recent.at(-1);
  if (!last || last.role !== 'assistant') return [];
  const user = recent.findLast(message => message.role === 'user');
  const text = user?.content.trim() ?? '';
  if (arithmeticReply(text)) return [];
  // Leave recent urgent conversations to their safety response, including brief
  // follow-ups; an ordinary advice chip must not distract from getting help.
  const urgent = /(?:ฆ่าตัวตาย|ทำร้ายตัวเอง|อยากตาย|ไม่อยาก(?:มีชีวิต|อยู่)|กรีดแขน|ยาเกินขนาด|suicid|self[ -]?harm|(?:kill|hurt|harm)\s+myself|want\s+to\s+die|(?:don['’]?t|do not|no longer)\s+want\s+to\s+(?:live|be alive|exist)|end\s+my\s+life|overdos|in\s+immediate\s+danger)/iu;
  if (recent.filter(message => message.role === 'user').slice(-3).some(message => urgent.test(message.content))) return [];
  if (/เลือกไพ่หนึ่งใบจากสามใบด้านล่าง/u.test(last.content)) return [];
  const emotional = /(?:เครียด|เหนื่อย|เศร้า|เสียใจ|น้อยใจ|กังวล|กลัว|ทุกข์|เบื่อ|กดดัน|ร้องไห้|เหงา|ท้อ|หนักใจ|ไม่ไหว|sad|stress|lonely|overwhelm|anxious)/iu.test(text);
  const reflection = /(?:เป้าหมาย|ชีวิต|อิสระ|ความสัมพันธ์|ความรู้สึก|อนาคต|ค้นหาตัวเอง|เลือกไพ่ใบที่)/u.test(text);
  const suggestions = [];
  if (emotional) {
    if (!/(?:ขอระบาย|แค่(?:ฟัง|อยู่เป็นเพื่อน)|ยังไม่ต้องแนะนำ)/u.test(text)) suggestions.push({ id: 'listen', label: 'ขอระบายก่อน', content: 'ตอนนี้ขอระบายก่อน ยังไม่ต้องแนะนำ' });
    suggestions.push({ id: 'options', label: 'ช่วยคิดทางออก', content: 'ช่วยคิดทางออกจากเรื่องที่เราเล่าให้หน่อย' });
  }
  if ((emotional || reflection) && last.content.length >= 100) suggestions.push({ id: 'expand', label: 'ขยายตรงนี้', content: 'ช่วยขยายความคำตอบเมื่อกี้ให้เข้าใจง่ายขึ้นหน่อย' });
  return suggestions;
}
