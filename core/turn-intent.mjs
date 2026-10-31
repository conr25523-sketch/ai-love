// A descriptive routing aid, not a personality assessment or a store of facts.
// `themes` requires at least two independent cue groups within a theme.
// Only short, explicit continuations inherit a recent USER turn's themes.
// Quoted/fictional viewpoints may be discussed but are never personal evidence.
const clean = value => typeof value === 'string' ? value.normalize('NFC').trim().slice(0, 6000) : '';
const TOPIC_CHANGE = /เปลี่ยนเรื่อง|อีกเรื่อง(?:หนึ่ง)?|ไม่คุยเรื่องนี้|เลิกพูดเรื่องนี้/u;
const CORRECTION = /^(?:ไม่ใช่(?:นะ|อะ|อ่ะ|ครับ|ค่ะ|คือ|\s|[,，]|$)|เข้าใจผิด|ตอบไม่ตรง|ไม่ได้หมายถึง)|(?:เราหมายถึง|ฉันหมายถึง|ผมหมายถึง|ที่หมายถึงคือ|นายเข้าใจผิด|เธอเข้าใจผิด)|ไม่ได้(?:โกรธ|กลัว|เสียใจ|ติด).{0,45}(?:แค่|แต่)/u;
const FOLLOWUP = /^(?:(?:อืม|เออ|อ๋อ)[\s,]*)?(?:แล้ว(?:ไงต่อ|ยังไงต่อ|ทำไงต่อ|หมายความว่าไง|มันเกี่ยวกันยังไง)|ขยาย(?:ความ)?(?:อีก)?(?:หน่อย|ต่อ)?|ต่อ(?:เลย|หน่อย)?|พูดต่อ|อธิบาย(?:ต่อ|เพิ่ม|อีก|หน่อย|ให้เข้าใจง่าย)(?:หน่อย)?|ยกตัวอย่าง(?:หน่อย)?|หมายถึง(?:อะไร|ยังไง)|หมายความว่า(?:ไง|ยังไง)|เพราะอะไร|ทำไม(?:ล่ะ|อะ|อ่ะ|เหรอ)?)(?:\s*(?:นะ|ครับ|ค่ะ|คะ|ดิ|สิ))?[.!?？\s]*$/u;
const ACK = /^(?:อืม|อือ|เออ|อ๋อ|โอเค|เค|ได้|เข้าใจแล้ว|จริง|ใช่|อ่าฮะ|ขอบคุณ|ขอบใจ)[.!?\s]*$/u;
const QUESTION = /[?？]|(?:อะไร|เท่าไหร่|เท่าไร|อย่างไร|ยังไง|ทำไม|แบบไหน|ที่ไหน|กี่(?:โมง|วัน|ปี|คน|บาท))|(?:มั้ย|ไหม|เหรอ|หรอ|หรือเปล่า|ใช่ปะ)[.!\s]*$/u;
const REQUEST = /^(?:ช่วย|ขอให้|ลอง|บอก|ตอบ|เขียน|สรุป|อธิบาย|วิเคราะห์|แนะนำ|คำนวณ|ร่าง|แปล|เปรียบเทียบ)|(?:ช่วย(?:เรา|ฉัน|ผม)?(?:คิด|เขียน|ตอบ|สรุป|อธิบาย|วิเคราะห์|แนะนำ|ร่าง)|ตอบ(?:มา|ให้|ตรง)|อยากให้(?:นาย|เธอ|คุณ|แก|ช่วย)|ขอ(?:คำแนะนำ|ตัวอย่าง|สั้น|ยาว|เป็นข้อ|วิธี))/u;
const OPINION = /(?:เราว่า|ฉันว่า|ผมว่า|กูว่า|เราคิดว่า|ฉันคิดว่า|ผมคิดว่า|ในมุม(?:เรา|ฉัน|ผม)|สำหรับ(?:เรา|ฉัน|ผม)|มองว่า|ชีวิต(?:คนเรา|มัน|ย่อม)|คน(?:เรา|ส่วนใหญ่|ส่วนมาก)|มนุษย์|สังคม|ความจริง(?:ของโลก|คือ)|โลก(?:มัน|นี้)|สิ่งสำคัญคือ|ไม่ได้แปลว่า|ไม่จำเป็นต้อง|เสรีภาพ|อิสระ)/u;
const PERSONAL = /(?:เรา|ฉัน|ผม|หนู|กู)(?:เอง|ตอนนี้|เคย|กำลัง|รู้สึก|คิดว่า|อยาก|ไม่อยาก|โดน|ถูก|เจอ|ต้อง|ทำ|เหนื่อย|กลัว|เสียใจ|ไม่รู้|ไม่รุ้|ไม่แน่ใจ|เก่ง|ชอบ|ไม่ชอบ)|(?:แม่|พ่อ|แฟน|เพื่อน|ชีวิต|งาน|ความรู้สึก)ของ(?:เรา|ฉัน|ผม|หนู|กู)/u;
const FICTION = /(?:ใน(?:นิยาย|หนัง|ละคร|เรื่องแต่ง|บทละคร)|ตัวละคร(?:ชื่อ|ใน|พูด|บอก)|สมมุติว่า|สมมติว่า|แต่งเรื่อง|ยกตัวอย่างว่า|นี่(?:คือ|เป็น)(?:คำพูด|ประโยค|ข้อความ)ของ|เพื่อน(?:เรา)?(?:พูด|บอก|เขียน)ว่า)/u;
const WHOLE_QUOTE = /^(?:[“「『][\s\S]+[”」』]|"[\s\S]+")$/u;

// Each array is one independent semantic cue group. A match in one group
// alone (e.g. a menu mentioning "เป้าหมาย") cannot activate a theme.
const THEME_CUES = {
  autonomy: [
    /อิสระ|เสรีภาพ|เลือก(?:เอง|ทาง|เดิน|ชีวิต)|ตัดสินใจ(?:เอง|ด้วยตัวเอง|แทน)|ทาง(?:ของ|ที่(?:เรา|ฉัน|ผม|ตัวเอง)?เลือก)|ชีวิต(?:ของเรา|ตัวเอง)|ใช้ชีวิตตาม(?:ความฝัน|ความต้องการ|คำสั่ง)/u,
    /ควบคุม|บังคับ|กำหนด|ชี้นำ|ตัดสินใจแทน|ขัดขวาง|เหยียบย่ำ|ไม่ยอม|ไม่ตาม|สั่ง|เลือก(?:เอง|ทางเอง|ด้วยตัวเอง)|รับผิดชอบ|ยืน(?:หยัด|ด้วย)|เดินด้วย|เดินเอง/u,
  ],
  goals: [
    /เป้าหมาย|ความฝัน|อนาคต|สิ่งที่(?:อยาก|ต้องการ)|จุดหมาย/u,
    /เดิน|ไปให้ถึง|ไปต่อ|ทำ(?:ตาม|ให้|ได้|จริง)|พยายาม|อุปสรรค|สู้|แลก|ยอม|เลือก|ต้องการ|มุ่ง|ชีวิต|ลงมือ|สำเร็จ/u,
  ],
  approval: [
    /ยอมรับ|สายตา|มอง(?:เรา|คน|ว่า)|พิสูจน์|ความคาดหวัง|เห็นด้วย|คำชม|คนอื่นคิด|คนอื่นจะคิด/u,
    /คนอื่น|ใคร|สังคม|ทุกคน|คนรอบตัว|พ่อแม่|ครอบครัว|เพื่อน|เขา/u,
  ],
  'effort-fairness': [
    /พยายาม|ขยัน|ทำงานหนัก|ทุ่มเท|ความสามารถ|เก่ง|ต้นทุน|โอกาส|อภิสิทธิ์/u,
    /ยุติธรรม|เท่ากัน|ไม่เท่ากัน|แพ้|ชนะ|สำเร็จ|ไม่ได้ดี|ไม่พอ|ผลลัพธ์|ไม่มีทาง|เส้นสาย|รวย|จน|ได้เปรียบ|เสียเปรียบ/u,
  ],
  'trust-boundaries': [
    /ไว้ใจ|เชื่อใจ|ความสัมพันธ์|เพื่อน|แฟน|คนใกล้ตัว|คนอื่น|เขา|คน/u,
    /ขอบเขต|เอาเปรียบ|หลอก|หักหลัง|เคารพ|ล้ำเส้น|ปฏิเสธ|บงการ|ควบคุม|บังคับ|กดดัน|เหยียบย่ำ|ทำร้าย|ทรยศ/u,
  ],
  appearance: [
    /รูปร่าง|หน้าตา|ภายนอก|สวย|หล่อ|เซ็กซี่|ยั่วยวน/u,
    /ภายใน|ข้างใน|นิสัย|ตัวตน|คุณค่า|มอง|ตัดสิน|หลง|ยึดติด|เนื้อหนัง|อวัยวะ|ตับ|ไต|ไส้|ไขมัน/u,
  ],
};

function inspect(value) {
  const text = clean(value);
  const isQuotedOrFictional = WHOLE_QUOTE.test(text) || FICTION.test(text);
  const themes = Object.entries(THEME_CUES)
    .filter(([, groups]) => groups.every(pattern => pattern.test(text)))
    .map(([theme]) => theme);
  // Indirect constructions such as "ไม่รู้จะเรียนอะไร" report uncertainty.
  // They do not become a question unless the visitor actually asks for an answer.
  const uncertaintyDisclosure = /(?:เรา|ฉัน|ผม|หนู|กู)?(?:ยัง)?ไม่(?:รู้|รุ้|แน่ใจ)(?:ว่า|จะ|ว่าควร).{0,100}(?:อะไร|ยังไง|แบบไหน|ที่ไหน)/u.test(text);
  const isQuestion = QUESTION.test(text) && !(uncertaintyDisclosure && !/[?？]|ช่วย|ตอบ|แนะนำ|บอกหน่อย|ควรทำ(?:ยังไง|อย่างไร)/u.test(text));
  const isTopicChange = TOPIC_CHANGE.test(text);
  let kind = 'unknown';
  if (CORRECTION.test(text)) kind = 'correction';
  else if (!isTopicChange && FOLLOWUP.test(text)) kind = 'followup';
  else if (ACK.test(text)) kind = 'acknowledgement';
  else if (REQUEST.test(text)) kind = 'request';
  else if (isQuestion) kind = 'question';
  else if (OPINION.test(text) && (themes.length || text.length >= 28)) kind = 'opinion';
  else if (PERSONAL.test(text)) kind = 'disclosure';
  return {
    kind,
    themes,
    isQuestion,
    isPersonal: !isQuotedOrFictional && PERSONAL.test(text),
    isQuotedOrFictional,
    isTopicChange,
    source: 'current',
    evidence: [...themes],
  };
}

/**
 * Pure bounded analysis of the current turn. No inferred personality, feelings,
 * biography, or assistant claims are returned. `source: history` means ONLY
 * the themes came from a recent user turn; all other flags describe this turn.
 */
export function analyzeTurnIntent(text, messages = []) {
  const result = inspect(text);
  if (result.kind !== 'followup' || result.themes.length) return result;
  const current = clean(text);
  const recent = (Array.isArray(messages) ? messages : []).slice(-16);
  // Callers may include the current user message in history. Skip that one,
  // while never using an assistant's speculative text as thematic evidence.
  let skippedCurrent = false;
  for (let i = recent.length - 1, count = 0; i >= 0 && count < 4; i--) {
    const message = recent[i];
    if (message?.role !== 'user') continue;
    const value = clean(message.content);
    if (!skippedCurrent && value === current) { skippedCurrent = true; continue; }
    count++;
    const previous = inspect(value);
    if (previous.isTopicChange) break;
    if (previous.themes.length) return { ...result, themes: previous.themes, evidence: previous.evidence, source: 'history' };
    // A substantive new subject closes the old one. Only short continuations
    // and acknowledgements allow looking past another user turn.
    if (!['followup', 'acknowledgement'].includes(previous.kind)) break;
  }
  return result;
}
