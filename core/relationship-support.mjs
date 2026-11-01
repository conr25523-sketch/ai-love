import { analyzeThaiText } from './thai-language.mjs';
import { chooseReply } from './reply-variety.mjs';
import { prefersListeningOnly } from './gentle-guidance.mjs';
import { canAskFollowup } from './conversation-support.mjs';

const contentOf = message => typeof message?.content === 'string' ? message.content : message?.text || '';
const BREAKUP = /เลิก(?:กัน|กับแฟน|กับคนรัก|กับเขา|กับเธอ)|(?:แฟน|คนรัก|เขา|เธอ)(?:มา)?(?:บอก|ขอ)เลิก|(?:แฟน|คนรัก)(?:ทิ้ง|เท)(?:เรา|ฉัน|ผม|หนู|กู)|ถูก(?:แฟน)?(?:บอกเลิก|ทิ้ง|เท)|โดน(?:แฟน)?(?:ทิ้ง|เท)|อกหัก|เลิกรา|หย่ากัน|หย่ากับ/u;
const EXCLUDED = /สมมติ|นิยาย|ตัวละคร|ยกตัวอย่าง|แปล(?:ว่า|เป็น)|หมายความว่า|คืออะไร|แต่ง(?:เรื่อง|เพลง|กลอน)|เขียน(?:เรื่อง|นิยาย)|เพื่อน(?:เรา|ฉัน|ผม|หนู)?.{0,10}(?:เลิก|ถูกทิ้ง|โดนทิ้ง)|(?:เขา|เธอ)เลิกกับแฟน(?:ของเขา|ของเธอ)?/u;
const UNSAFE = /อยากตาย|ไม่อยากอยู่|ไม่อยากมีชีวิต|ฆ่า|ทำร้าย|กรีด|กินยา|เลือดออก|อยากหายไป/u;
const CONTINUATION = /^(?:(?:เรา|ฉัน|ผม|หนู|กู)?(?:ยัง|ก็|แต่|มัน|ตอนนี้|รู้สึก|คิดถึง|เสียใจ|ร้องไห้|โกรธ|เหงา|เจ็บ|เสียดาย|กลัว|นอนไม่หลับ|อยากกลับไป|ไม่อยากกลับไป|ไม่รู้จะ|ขอระบาย|ขอคำแนะนำ|ช่วยคิด|ช่วยขยาย|ขยาย|อธิบาย|ควรทำ)|ใช่|อืม|เออ)/u;
const NEW_TOPIC = /เปลี่ยนเรื่อง|เลิกคุยเรื่อง|งาน|หัวหน้า|เจ้านาย|บริษัท|เรียน|คณะ|เกม|เมนู|กินอะไร|1\s*\+/u;

/** Current explicit relationship evidence takes precedence over generic self-judgment. */
export function isBreakupDisclosure(text) {
  const current = analyzeThaiText(typeof text === 'string' ? text.slice(0, 4000) : '').normalized;
  return !!current && !EXCLUDED.test(current) && !UNSAFE.test(current)
    && !/ไม่(?:ได้|เคย|อยาก|คิดจะ)?(?:เลิก|อกหัก)|ยังไม่เลิก|ไม่ได้โดนทิ้ง/u.test(current)
    && BREAKUP.test(current);
}

/** Grounded breakup support; never infers the ex-partner's feelings or motives. */
export function relationshipSupportReply(text, messages = []) {
  const current = analyzeThaiText(typeof text === 'string' ? text.slice(0, 4000) : '').normalized;
  messages = Array.isArray(messages) ? messages : [];
  if (!current || EXCLUDED.test(current) || UNSAFE.test(current)
      || /^(?:ไม่ใช่|เข้าใจผิด|หยุด|พอแล้ว)|อย่าเดา|ไม่ต้องวิเคราะห์/u.test(current)) return null;
  const users = messages.filter(message => message?.role === 'user').slice(-10).map(contentOf);
  const anchor = users.findLastIndex(isBreakupDisclosure);
  const explicit = isBreakupDisclosure(current);
  const continuing = anchor >= 0 && CONTINUATION.test(current) && !NEW_TOPIC.test(current)
    && users.slice(anchor + 1).every(value => CONTINUATION.test(value) && !NEW_TOPIC.test(value));
  if (!explicit && !continuing) return null;
  if (/ไม่ได้เลิก|ยังไม่เลิก|โล่งใจ|ดีใจที่เลิก/u.test(current)) return null;

  const evidence = explicit ? current : `${users[anchor]} ${current}`;
  const duration = evidence.match(/(?:คบ(?:กัน|มา|กับแฟน)?|อยู่ด้วยกันมา)\s*(?:มา)?\s*(\d{1,2}|สาม|สอง|หนึ่ง|สี่|ห้า)\s*ปี/u)?.[1];
  const opening = !explicit
    ? /คิดถึง/u.test(current) ? 'คุณยังคิดถึงเขาอยู่ แม้ตอนนี้ความสัมพันธ์จบแล้ว'
      : /ขยาย|อธิบาย|ช่วยคิด|คำแนะนำ|ควรทำ/u.test(current) ? 'ถ้ามองต่อจากเรื่องที่เลิกกัน เราแยกความรู้สึกที่ยังอยู่กับการตัดสินใจขั้นต่อไปได้'
      : 'เรายังคุยจากเรื่องที่ความสัมพันธ์จบลง และสิ่งที่คุณกำลังเจอหลังจากนั้นนะ'
    : duration
    ? `การจบความสัมพันธ์ที่คบมา ${duration} ปี ไม่ได้เปลี่ยนแค่สถานะ แต่ยังเปลี่ยนความคุ้นเคยที่เคยมีคนนี้อยู่ในชีวิตด้วย`
    : 'พอความสัมพันธ์จบลง ชีวิตส่วนที่เคยมีอีกคนอยู่ด้วยก็ต้องเปลี่ยนไปด้วย';
  const listening = prefersListeningOnly(current, messages);
  const emotions = current.replace(/ไม่(?:ได้|เคย|ค่อย)?(?:รู้สึกผิด|โทษตัวเอง|โกรธ|โมโห|แค้น|เสียใจ|เศร้า|ร้องไห้|เจ็บ|คิดถึง)/gu, '');
  const guilt = /รู้สึกผิด|โทษตัวเอง|ผิดที่(?:เรา)?เลิก|เราผิดไหม/u.test(emotions);
  const anger = /โกรธ|โมโห|แค้น/u.test(emotions);
  const sadness = /เสียใจ|เศร้า|ร้องไห้|เจ็บ/u.test(emotions);
  const longing = /คิดถึง/u.test(emotions);
  const sarcasm = /ดีมาก|ดีจัง|เยี่ยม|สุดยอด/u.test(current) && /555|ฮ่า|😂/u.test(current);
  const validation = sarcasm
    ? 'คำชมกับเสียงหัวเราะท้ายข้อความอาจเป็นการพูดประชด เราไม่รีบถือว่าคุณขำกับการที่ความสัมพันธ์จบลง'
    : guilt
    ? `${/รู้สึกผิด|โทษตัวเอง/u.test(emotions) ? 'คุณบอกว่ารู้สึกผิดที่เลิก' : 'การที่ความสัมพันธ์จบยังไม่พอจะตัดสินว่าคุณผิด'} เรื่องนี้อาจมีทั้งเหตุผลที่เลือกจบกับความผูกพันที่ยังเหลืออยู่ เราไม่อยากรีบตัดสินว่าใครผิดจากการที่ความสัมพันธ์จบลงอย่างเดียว`
    : anger && sadness ? 'คุณมีทั้งความเสียใจและความโกรธอยู่ด้วยกัน ไม่จำเป็นต้องเลือกว่ารู้สึกได้แค่อย่างเดียว และเรายังไม่ต้องรีบตัดสินใจว่าจะกลับไปหรือให้อภัยตอนนี้'
    : anger ? 'ความโกรธที่คุณเล่าควรมีพื้นที่ให้พูดถึงด้วย เราไม่อยากข้ามสิ่งที่เกิดขึ้นแล้วรีบให้คุณยกโทษหรือมองด้านดี'
    : sadness ? 'คุณบอกว่ายังเสียใจอยู่ เราไม่อยากรีบผลักให้ลืมหรือบอกว่าต้องเข้มแข็ง การที่เรื่องจบแล้วไม่ได้ทำให้ความรู้สึกจบตามทันที'
    : longing ? 'ความคิดถึงไม่ใช่คำสั่งว่าคุณต้องกลับไป และไม่ต้องบังคับให้ตัวเองลืมทันที เราคุยถึงสิ่งที่คุณคิดถึงได้โดยยังไม่ต้องตัดสินใจเรื่องความสัมพันธ์ตอนนี้'
    : 'เราไม่อยากรีบสรุปแทนว่าคุณรู้สึกแบบไหน หรือให้คำแนะนำเหมือนความสัมพันธ์นี้เป็นเรื่องที่ปล่อยผ่านได้ง่าย ๆ';
  const ask = canAskFollowup(current, messages);
  const question = guilt ? 'ส่วนไหนของการตัดสินใจเลิกที่ทำให้คุณรู้สึกผิดมากที่สุด?'
    : 'ตอนนี้ส่วนไหนของการเลิกกันที่หนักกับคุณที่สุด?';
  const expanded = /ขยาย|อธิบาย|ช่วยคิด|คำแนะนำ|ควรทำ/u.test(current);
  const perspective = expanded && !listening
    ? 'ความคิดถึงบอกได้ว่าความผูกพันยังอยู่ แต่ยังไม่ได้บอกว่าการกลับไปจะเหมาะกับชีวิตตอนนี้ ลองแยกสิ่งที่คิดถึงออกจากเหตุผลที่ความสัมพันธ์จบ ก่อนใช้ความรู้สึกช่วงหนึ่งตัดสินใจเรื่องใหญ่'
    : chooseReply([
      'ความรู้สึกที่มีต่อคนหนึ่งคนอาจยังอยู่ แม้ความสัมพันธ์จะเดินต่อไม่ได้ สองอย่างนี้อยู่ด้วยกันได้โดยไม่ทำให้เวลาที่ผ่านมากลายเป็นเรื่องไร้ค่า',
      'เรื่องที่เคยสำคัญไม่จำเป็นต้องถูกทำให้ดูเล็กลงเพื่อให้เราเดินต่อได้ และการเดินต่อก็ไม่ได้บังคับให้ลบสิ่งที่เคยมีร่วมกันทั้งหมด',
    ], messages);
  return [opening, validation, listening ? '' : perspective, ask ? question : ''].filter(Boolean).join('\n');
}
