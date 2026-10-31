import { chooseReply } from './reply-variety.mjs';
import { drawTarotCards } from './tarot-deck.mjs';

export const CARD_INVITATION = 'เลือกไพ่หนึ่งใบจากสามใบด้านล่าง';
export const FIRST_TAROT_INVITATION = `ยินดีต้อนรับ เริ่มด้วยไพ่ทาโรต์สักใบกันนะ\n${CARD_INVITATION}\nเราจะอ่านความหมายของภาพเป็นมุมสะท้อนใจ แล้วค่อยคุยกันต่อจากสิ่งที่คุณอยากเล่า`;
const BLOCK = /ฆ่า|ทำร้าย|อยากตาย|ไม่อยากอยู่|อยากหายไป|ไม่มีค่า|ขิต|ตุย|วินิจฉัย|โรค|ขนาดยา|คดี|ลงทุน|ไม่ต้องดูดวง|ไม่เอาไพ่|ไม่อยากดูดวง/iu;

/** One symbolic choice per invitation; only caller-supplied own chat is used. */
export function symbolicCardReply(text, messages = []) {
  const current = typeof text === 'string' ? text.slice(0, 4000).trim() : '';
  if (!current || BLOCK.test(current)) return null;
  const recent = Array.isArray(messages) ? messages.slice(-20) : [];
  const choice = current.match(/^เราเลือกไพ่ใบที่\s*([1-3])[.!\s]*$/u);
  if (/^เราเลือกไพ่ใบที่/u.test(current) && !choice) return null;
  if (choice) {
    const invitation = recent.findLastIndex(message => message?.role === 'assistant' && typeof message.content === 'string' && message.content.includes(CARD_INVITATION));
    if (invitation < 0 || recent.slice(invitation + 1).some(message => message?.role === 'user' && /^เราเลือกไพ่ใบที่\s*[1-3]/u.test(message.content ?? ''))) return null;
    const card = drawTarotCards(recent[invitation].id)[Number(choice[1]) - 1];
    return chooseReply([
      `คำทำนายจากไพ่ “${card.title} (${card.name})” — ${card.prediction}\nพูดง่าย ๆ ภาพ${card.image}หมายถึง${card.meaning}\n${card.reality}\n${card.action}`,
      `คุณได้ไพ่ “${card.title} (${card.name})” คำทำนายของใบนี้คือ ${card.prediction}\nภาพ${card.image}พูดถึง${card.meaning}\n${card.reality}\n${card.action}`,
    ], recent);
  }
  if (/ดูดวง|เปิดไพ่|อ่านดวง|เลือกไพ่|สุ่มไพ่/u.test(current) && !/คืออะไร|ทำงาน|ทำยังไง|หมายถึง|ไม่(?:ต้อง|เอา|อยาก)(?:เปิดไพ่|ดูดวง|อ่านดวง|เลือกไพ่)/u.test(current))
    return `ลองเปิดไพ่ทาโรต์เป็นภาพชวนมองเรื่องที่กำลังคุยกันนะ\n${CARD_INVITATION}\nแต่ละภาพมีความหมายเชิงสัญลักษณ์ให้เทียบกับชีวิตจริง ไม่ใช่ผลทำนายอนาคต`;
  return null;
}
