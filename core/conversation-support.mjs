import { chooseReply } from './reply-variety.mjs';
import { prefersListeningOnly } from './gentle-guidance.mjs';
import { buildConversationMemory } from './conversation-memory.mjs';

const contentOf = message => typeof message?.content === 'string' ? message.content : message?.text || '';

/** Ask for one useful missing detail, with a pause after any recent question. */
export function canAskFollowup(text, messages = []) {
  messages = Array.isArray(messages) ? messages : [];
  if (buildConversationMemory([...messages, {role:'user',content:text}]).style.questions === 'less') return false;
  if (prefersListeningOnly(text, messages) || /ไม่(?:ต้อง|อยาก)ถาม|อย่าถาม|ตอบ(?:มา)?เลย|ขอคำตอบ|just listen|no questions/iu.test(text)) return false;
  return !messages.filter(message => message?.role === 'assistant').slice(-2)
    .some(message => /[?？]|(?:ไหม|หรือเปล่า|อะไร|อย่างไร|ไหน|บ้าง)[.!\s]*$/u.test(contentOf(message)));
}

/** Deliberately bounded support: only use details actually present in this turn. */
export function conversationSupportReply(text, messages = []) {
  messages = Array.isArray(messages) ? messages : [];
  const current = typeof text === 'string' ? text.trim() : '';
  const ask = canAskFollowup(current, messages);
  const listening = prefersListeningOnly(current, messages);
  const userTurns = messages.filter(message => message?.role === 'user').map(contentOf).slice(-10);
  const workAnchor = userTurns.findLastIndex(value => /หัวหน้า|เจ้านาย/u.test(value) && /เปลี่ยน|แก้/u.test(value) && /ก่อนส่ง|ใกล้ส่ง|เดดไลน์|เส้นตาย|ส่งพรุ่งนี้|ส่งวันนี้/u.test(value) && !/สมมติ|นิยาย/u.test(value));
  const continuesWork = value => /^(?:เรา|ผม|หนู|ฉัน)?(?:ทำใหม่|แก้(?:งาน|ใหม่)?|รื้อ(?:งาน|ใหม่)?|เขาก็เปลี่ยน|หัวหน้า|เจ้านาย)/u.test(value)
    || /^(?:ตอนนี้)?(?:ขอระบายก่อน|ขอระบาย|ยังไม่ต้องแนะนำ|ไม่ต้องแนะนำ|ช่วยคิดทางออกจากเรื่องที่เราเล่า|ช่วยหาทางออก|ช่วยขยายความคำตอบเมื่อกี้|อธิบายคำตอบเมื่อกี้)/u.test(value)
    || /^(?:โอเค|อืม|อือ|เออ|ใช่|แล้วไงต่อ|ขยายอีก|ขอสั้นกว่านี้)[.!?\s]*$/u.test(value);
  const relatedWork = workAnchor >= 0 && userTurns.slice(workAnchor + 1).every(continuesWork);
  if (relatedWork && /ทำใหม่|แก้.{0,12}(?:รอบ|อีก)|เปลี่ยนอีก|ขอระบาย|ไม่ต้องแนะนำ|ช่วยคิดทางออก|ช่วยหาทางออก|ขยายความคำตอบเมื่อกี้|อธิบาย(?:คำตอบ)?(?:เมื่อกี้|อีก)/u.test(current)) {
    const rework = [...userTurns.slice(workAnchor + 1), current].findLast(value => /ทำใหม่|แก้.{0,12}รอบ/u.test(value));
    const count = rework?.match(/(?:มาแล้ว|ไปแล้ว|แล้ว|มา)?\s*(สอง|สาม|[2-9])\s*รอบ/u)?.[1];
    const repeated = rework ? `คุณทำใหม่${count ? `มาแล้ว${count}รอบ` : 'ไปแล้ว'} แต่ยังต้องเจอการเปลี่ยนอีก` : 'หัวหน้าเปลี่ยนงานตอนใกล้ส่ง';
    if (listening) return `${repeated}\n${chooseReply([
      'สิ่งที่ลงแรงไปเลยยังไม่กลายเป็นงานที่ปิดได้สักที มันมีทั้งงานเดิมที่ต้องรื้อกับเวลาส่งที่ยังรออยู่ เรารับเรื่องนี้ก่อนนะ ยังไม่รีบโยนวิธีแก้ให้คุณเพิ่มอีกอย่าง',
      'พอทิศทางเปลี่ยนอีก สิ่งที่ทำเสร็จไปแล้วก็ต้องกลับมาเริ่มใหม่ ขณะที่เวลาที่เหลือไม่ได้เพิ่มตาม นี่เป็นเงื่อนไขงานที่หนักขึ้นจริง ๆ ไม่ใช่แค่คำว่าเหนื่อยลอย ๆ',
    ], messages)}`;
    if (/ขยาย|อธิบาย/u.test(current)) return `${repeated} ประเด็นที่ชวนคุยกับหัวหน้าคือ ถ้าจะเพิ่มหรือเปลี่ยนส่วนนี้ ต้องมีอีกส่วนที่เลื่อน ลด หรือมีคนช่วย ไม่ใช่ให้คุณรับงานที่เปลี่ยนโดยใช้เวลาเท่าเดิมเสมอ\nพูดง่าย ๆ ลองระบุว่า “ถ้าจะให้แก้ส่วนนี้ก่อนส่งพรุ่งนี้ ส่วนเดิมอาจทำไม่ครบ อยากให้เราเลือกส่งส่วนไหนก่อน” นี่เป็นการบอกเงื่อนไขงานให้ชัด ไม่ใช่การปฏิเสธงานทั้งหมด`;
    return `${repeated} ก่อนเริ่มรื้อรอบถัดไป ลองขอให้หัวหน้ารวมสิ่งที่ต้องแก้และยืนยันลำดับก่อน จะได้ไม่ทำคนละทิศกัน\nคุณอาจพูดว่า “รอบนี้มีส่วนไหนที่ต้องแก้อีกบ้าง ถ้าจะให้ทันเวลาส่ง อยากให้เราเก็บส่วนไหนก่อน และส่วนไหนเลื่อนได้” แล้วสรุปสิ่งที่ตกลงไว้เป็นข้อความสั้น ๆ เพื่อใช้เทียบหากมีการเปลี่ยนอีก`;
  }
  if (/^(?:เรา|ผม|หนู|ฉัน)?(?:ช่วงนี้|ตอนนี้)?เครียด(?:เรื่อง)?งาน(?:มาก|อะ|อ่ะ|เลย|จัง|สุดๆ|สุด ๆ)?[.!\s]*$/u.test(current)) {
    return `เรื่องงานกำลังทำให้เครียดนะ เราจะยังไม่สรุปว่าเป็นเพราะคุณรับมือไม่เก่ง เพราะทั้งปริมาณงาน คนที่ต้องทำงานด้วย และเงื่อนไขงานมีผลได้${ask ? '\nอะไรในงานทำให้เครียดที่สุดตอนนี้?' : '\nถ้าอยากเล่าเหตุการณ์ที่เจอ เราค่อยดูจากเรื่องนั้นด้วยกันได้'}`;
  }
  if (/หัวหน้า|เจ้านาย/u.test(current) && /เปลี่ยน|แก้ใหม่|สั่งแก้/u.test(current)
      && /ก่อนส่ง|ใกล้ส่ง|เดดไลน์|เส้นตาย|ส่งพรุ่งนี้|ส่งวันนี้/u.test(current)
      && !/สมมติ|แต่งเรื่อง|นิยาย|ถ้าเกิด/u.test(current)) {
    const validation = /เครียด/u.test(current) ? 'ที่คุณเครียดมีเรื่องชัดเจนอยู่เลย' : 'การต้องเปลี่ยนงานตอนใกล้ส่งทำให้จัดการยากขึ้นจริง ๆ';
    const reflection = `${validation} ทั้งงานที่ต้องแก้ตามหัวหน้าและเวลาที่เหลือก่อนส่งมาชนกัน ไม่ใช่แค่เรื่องว่าคุณพยายามพอหรือยัง`;
    if (listening) return `${reflection}\nเราพักการหาวิธีแก้ไว้ก่อน คุณระบายเรื่องที่เจอได้โดยไม่ต้องรีบทำให้มันเป็นแผน`;
    return `${reflection}\nการตกลงให้ชัดว่าจะให้แก้ส่วนไหนก่อน และอะไรเลื่อนได้ ช่วยให้ความคาดหวังตรงกับเวลาที่มี${ask ? '\nตอนนี้หนักสุดตรงงานที่ต้องรื้อใหม่ หรือเวลาที่เหลือก่อนส่ง?' : ' โดยไม่ต้องรับปากทำทุกส่วนให้เสร็จพร้อมกัน'}`;
  }
  // Basic English support is explicit and finite, rather than a claim of general translation.
  if (/^[\x00-\x7F\s’“”]+$/u.test(current) && /[a-z]/iu.test(current)) {
    if (/^(?:please\s+)?just listen[.!\s]*$/iu.test(current)) return 'Okay. I’ll listen without jumping into advice. You can say as much or as little as you want.';
    if (/\b(?:not|never|don['’]t|do not)\s+(?:feel(?:ing)?\s+)?(?:sad|lonely|anxious|depressed|stressed|overwhelmed|heartbroken|crying)\b/iu.test(current)) return 'Got it. I won’t assume you feel that way. We can stay with what you actually mean.';
    const selfFeeling = current.match(/\bi(?:['’]m|\s+(?:am|feel))\s+(?:(?:feeling|really|very|so|a bit)\s+){0,2}(sad|lonely|depressed|heartbroken|crying|stressed|overwhelmed|anxious)\b/iu);
    if (selfFeeling && !/\b(?:what does|what is|meaning|translate|example|quote|character)\b/iu.test(current)) {
      const feeling = selfFeeling[1].toLowerCase();
      const context = /\b(?:work|boss|job|deadline)\b/iu.test(current) ? 'Work is weighing on you' : `You’re feeling ${feeling}`;
      return `${context}. You don’t have to pretend it’s fine here.${ask ? '\nWhat part of this is hardest for you right now?' : '\nWe can stay with that feeling without rushing into advice.'}`;
    }
    if (/^(?:hi|hello|hey)[!.,\s]*$/iu.test(current)) return 'Hi 🙂 We can start with whatever is on your mind. I understand some simple English, and Thai is supported more fully.';
    if (listening) return conversationFallbackReply(current, messages);
  }
  if (listening && (!/[ก-๙a-z]/iu.test(current) || /^[ก-ฮ]{7,}$/u.test(current))) return conversationFallbackReply(current, messages);
  return null;
}

/** Recovery depends on why a message was not understood. No inferred distress. */
export function conversationFallbackReply(text, messages = []) {
  messages = Array.isArray(messages) ? messages : [];
  const current = typeof text === 'string' ? text.trim() : '';
  const choose = choices => chooseReply(choices, messages);
  if (/^[a-z\s.,!?']+$/iu.test(current) && /[aeiou]/iu.test(current) && /\b(?:what|how|why|can|please|the|is|are|my|i|you)\b/iu.test(current)) {
    return choose(['เราเข้าใจภาษาอังกฤษได้บางประโยค แต่ประโยคนี้ยังจับความหมายไม่ได้ ลองเขียนสั้นลงหรือเล่าเป็นภาษาไทยได้ไหม?', 'ประโยคอังกฤษนี้เราอาจรับความหมายได้ไม่ครบ ช่วยแยกเป็นประโยคสั้น ๆ หรือใช้ภาษาไทยอีกทีได้ไหม?']);
  }
  if (!/[ก-๙a-z]/iu.test(current) || /^[a-z]{5,}$/iu.test(current) || /^(?:[ก-ฮ]{7,}|[a-z]{1,4}(?:\s+[a-z]{1,4}){0,2})$/iu.test(current)) {
    return choose(['ข้อความนี้เราอ่านความหมายไม่ออก ลองพิมพ์เป็นประโยคสั้น ๆ อีกทีได้ไหม?', 'เหมือนข้อความจะพิมพ์ตกหรือเป็นคำที่เรายังไม่เข้าใจ ลองส่งใหม่อีกทีนะ']);
  }
  if (/[?？]|คืออะไร|เท่าไหร่|เมื่อไหร่|อย่างไร|ทำไม|ใครเป็น|อยู่ที่ไหน/u.test(current)) {
    return choose(['คำถามนี้เราไม่มีข้อมูลพอจะยืนยันคำตอบ ถ้าเป็นชื่อเฉพาะหรือเหตุการณ์ ช่วยระบุว่าหมายถึงอะไรได้ไหม?', 'เรื่องที่ถามอยู่นอกข้อมูลที่ระบบนี้รองรับ เราเลยยังให้คำตอบที่เชื่อถือไม่ได้']);
  }
  if (/^(?:โอเค|โอเคครับ|เค|อืม|อือ|เออ|ok|okay)[.!\s]*$/iu.test(current)) return choose(['โอเคนะ', 'ได้เลย เราอยู่ตรงนี้']);
  return choose(['ตรงนี้เราอาจรับความหมายคลาดเคลื่อน ลองเล่าอีกแบบหรือยกเหตุการณ์สั้น ๆ ก็ได้', 'ถ้าอยากคุยเรื่องนี้ต่อ ลองบอกสิ่งที่ต้องการให้เราช่วย เช่น อธิบายความหมายหรือแลกเปลี่ยนมุมมองได้เลย']);
}
