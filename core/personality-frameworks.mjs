import { chooseReply } from './reply-variety.mjs';

const TYPE = '[EI][SN][TF][JP]';
const clean = value => typeof value === 'string' ? value.slice(0, 4000).normalize('NFC').trim() : '';
const SELF = '(?:เรา|ฉัน|ผม|หนู|กู)';
const BLOCK = /ฆ่า|ทำร้าย|อยากตาย|ไม่อยากอยู่|อยากหายไป|ขิต|ตุย|ยาเกินขนาด|วินิจฉัย|รักษา|โรค|คดี|ลงทุน|ไม่ต้องวิเคราะห์|อย่าวิเคราะห์|ไม่เอา(?:\s*mbti|\s*enneagram|ไทป์)/iu;
const FICTION = /สมมติ|ตัวอย่าง|นิยาย|(?:เพื่อน|เขา|แฟน|แม่|พ่อ|หมอดู).{0,15}(?:บอก|คิดว่า)|ignore.{0,20}instructions|system\s*prompt/iu;
const preferences = {
  I: 'มีพื้นที่คิดและทบทวนภายใน', E: 'ได้แลกเปลี่ยนกับสิ่งแวดล้อมและคนอื่น',
  S: 'มองรายละเอียดและประสบการณ์ที่จับต้องได้', N: 'มองความเชื่อมโยงและสิ่งที่เป็นไปได้',
  T: 'เทียบเหตุผลและหลักเกณฑ์', F: 'เทียบคุณค่าและผลที่มีต่อคน',
  J: 'จัดทิศทางและข้อสรุปให้ชัด', P: 'เปิดพื้นที่ให้ข้อมูลใหม่และปรับทาง',
};

export const MBTI_TYPES = Object.freeze(Object.fromEntries(
  ['I', 'E'].flatMap(a => ['S', 'N'].flatMap(b => ['T', 'F'].flatMap(c => ['J', 'P'].map(d => {
    const type = a + b + c + d;
    return [type, { preferences: [...type].map(letter => preferences[letter]) }];
  }))))
));

// Original reflective summaries, not copied assessment items or clinical labels.
export const ENNEAGRAM_TYPES = Object.freeze({
  1: { focus: 'ความถูกต้องและความซื่อตรง', lens: 'ถ้าความอยากทำให้ถูกกลายเป็นเงื่อนไขของคุณค่า ความผิดพลาดเล็ก ๆ อาจหนักเกินเหตุ', practice: 'แยกมาตรฐานที่จำเป็นกับความสมบูรณ์แบบที่เพิ่มต้นทุนโดยไม่เพิ่มประโยชน์' },
  2: { focus: 'การได้รับความรักและการมีส่วนช่วย', lens: 'ถ้าต้องมีประโยชน์เสมอเพื่อรู้สึกว่ามีที่อยู่ การช่วยอาจกลายเป็นภาระที่ไม่กล้าปฏิเสธ', practice: 'ดูว่าความช่วยเหลือนั้นเลือกด้วยความเต็มใจหรือกลัวเสียความสัมพันธ์ และรักษาขอบเขตที่ทำต่อไหว' },
  3: { focus: 'ความสำเร็จและการได้รับการยอมรับ', lens: 'ถ้าคุณค่าผูกกับผลงานทุกครั้ง การพักหรือพลาดอาจดูเหมือนหมดคุณค่าทั้งคน', practice: 'ใช้ผลลัพธ์ประเมินงาน แต่ใช้คุณค่าและต้นทุนชีวิตประเมินทิศทางที่เลือก' },
  4: { focus: 'ความหมายและการเป็นตัวเอง', lens: 'ถ้าต้องรู้สึกพิเศษจึงจะยอมรับตัวเอง ชีวิตธรรมดาบางช่วงอาจถูกมองว่าไม่มีความหมาย', practice: 'ดูสิ่งที่ทำแล้วตรงกับคุณค่าของตัวเอง โดยไม่ต้องต่างจากทุกคนเพื่อให้สิ่งนั้นมีค่า' },
  5: { focus: 'ความเข้าใจและความสามารถพึ่งตนเอง', lens: 'ถ้าต้องรู้ครบก่อนลงมือ การหาข้อมูลอาจช่วยป้องกันความไม่พร้อมแต่เลื่อนประสบการณ์จริงออกไป', practice: 'กำหนดข้อมูลขั้นต่ำที่จำเป็น แล้วทดลองในขอบเขตที่รับความผิดพลาดได้' },
  6: { focus: 'ความมั่นคงและสิ่งที่ไว้ใจได้', lens: 'ถ้าต้องแน่ใจทุกความเสี่ยงก่อนเลือก ความระวังอาจกลายเป็นการหาความแน่นอนที่ไม่มี', practice: 'แยกความเสี่ยงที่มีหลักฐานกับสิ่งที่เพียงเป็นไปได้ แล้วเตรียมทางรับมือเท่าที่จำเป็น' },
  7: { focus: 'อิสระและโอกาสที่น่าสนใจ', lens: 'ถ้าต้องมีทางใหม่เสมอ การเปลี่ยนเรื่องอาจให้ความโล่งแต่ทิ้งสิ่งค้างเดิมไว้', practice: 'เลือกโอกาสที่สำคัญจริงและยอมรับต้นทุนของการไม่เลือกทางอื่น ไม่จำเป็นต้องปิดทุกความเป็นไปได้' },
  8: { focus: 'อิสระในการตัดสินใจและการปกป้องตนเอง', lens: 'ถ้าการถูกช่วยดูเหมือนเสียอำนาจ เราอาจแบกสิ่งที่แบ่งกับคนที่ไว้ใจได้อยู่', practice: 'แยกการยอมถูกควบคุมกับการเลือกรับความช่วยเหลือที่มีขอบเขต' },
  9: { focus: 'ความสงบและการอยู่ร่วมกัน', lens: 'ถ้าต้องหลีกเลี่ยงความขัดแย้งทุกครั้ง ความสงบภายนอกอาจแลกกับความต้องการของตัวเองที่เงียบลง', practice: 'ให้ความต้องการของตัวเองมีที่อยู่ในการตกลง ไม่ถือว่าความเห็นต่างเท่ากับทำลายความสัมพันธ์' },
});

export const PERSONALITY_FRAMEWORK_PROMPT = `บุคลิกม่านใจได้แรงบันดาลใจจาก INFJ: เชื่อมความหมายและภาพระยะยาว (Ni), คำนึงถึงความรู้สึกและผลที่มีต่อคน (Fe), ตรวจเหตุผลของคำตีความ และกลับมาดูเหตุการณ์กับต้นทุนจริง ใช้เป็นแนวออกแบบการสนทนา ไม่อ้างว่า AI มีบุคลิกมนุษย์หรืออ่านใจเก่งเพราะเป็น INFJ
เข้าใจ MBTI ทั้ง 16 แบบโดยใช้คู่ความชอบ E/I, S/N, T/F, J/P ทุกคู่มีประโยชน์ตามบริบท ไม่ถือว่า I ขี้อาย, E ไม่ลึกซึ้ง, T ไร้ความรู้สึก, F ไร้เหตุผล, J เจ้าระเบียบเสมอ หรือ P ไม่มีความรับผิดชอบ ปรับรูปแบบคำตอบตามความต้องการที่ผู้ใช้แสดงจริงมากกว่าตัวอักษร
ใช้ Enneagram ทั้ง 9 แบบสำรวจแรงจูงใจ ไม่เทียบพฤติกรรมเดียวกับไทป์เดียว: ${Object.entries(ENNEAGRAM_TYPES).map(([type, data]) => `${type} มองเรื่อง${data.focus}`).join('; ')}
เมื่อวิเคราะห์ ให้อ่านเหตุการณ์และความหมายที่ผู้ใช้บอกก่อน แล้วค่อยเทียบวิธีรับข้อมูล วิธีตัดสินใจ และสิ่งที่พยายามปกป้อง ตั้งแรงจูงใจที่ยังไม่ได้บอกเป็นเงื่อนไข ไม่อ้างว่ารู้ความกลัวแฝง เมื่อผู้ใช้ถามว่าเป็นไทป์อะไรให้ตอบส่วนที่มีเบาะแสในประโยคแรก พร้อมเหตุผลจากคำที่เขาบอกจริง ถ้าเห็นเพียงบางด้านให้บอกเฉพาะด้านนั้น ไม่เติมด้านที่เหลือด้วยค่าเริ่มต้นตายตัวหรือเลือกไทป์โดยไม่มีเหตุผล ไม่ถามแบบสอบถามต่อเป็นกิจวัตร ไม่ให้เปอร์เซ็นต์ความแม่นหรือคะแนนแบบประเมินที่ไม่ได้ทำ
ผู้ใช้ระบุไทป์เองให้ถือเป็นข้อมูลที่เขาบอก ไม่ใช่ผลตรวจยืนยัน คำแก้ไขล่าสุดมีน้ำหนักมากกว่าข้อสรุปเก่า ไม่เอาไทป์จากข้อความผู้ช่วยหรือคำพูดเกี่ยวกับคนอื่นมาเป็นของผู้ใช้ ไม่ผูก MBTI แบบใดกับ Enneagram ลักษณ์หนึ่งตายตัว ไม่อนุมานปีก ระดับพัฒนา หรือ stress arrow
สอดแทรกกรอบเหล่านี้เมื่อช่วยอธิบายเรื่องจริงได้ ไม่เปิดทุกคำตอบด้วยชื่อไทป์ ไม่เทศนาหรือถามแบบสอบถามเพิ่ม ไม่ใช้แทนการวินิจฉัย การอ่านใจ การทำนายอนาคต หรือข้อสรุปว่าเหมาะกับอาชีพหรือคู่รักแบบใด ปรับความยาวตามสิ่งที่ผู้ใช้ขอและใช้เราเรียกตัวเอง`;

function ownTexts(messages) {
  if (!Array.isArray(messages)) return [];
  let remaining = 64000;
  const texts = [];
  for (const message of messages.slice(-200).reverse()) {
    if (message?.role !== 'user' || !remaining) continue;
    const text = clean(message.content ?? message.text).slice(0, remaining);
    remaining -= text.length;
    if (text && !FICTION.test(text)) texts.push(text);
  }
  return texts.reverse();
}

/** Type labels are only explicit self-reports from the caller's own turns. */
export function statedPersonalityTypes(text, messages = []) {
  let mbti = null, enneagram = null;
  for (const value of [...ownTexts(messages), clean(text)]) {
    if (FICTION.test(value)) continue;
    // A request for a guess is not a self-report or a test result.
    if (new RegExp(`(?:คิดว่า|เดาว่า|น่าจะ|อาจเป็น).{0,20}${SELF}|${SELF}(?:เป็น|คือ)[\\s]*(?:${TYPE}|(?:ลักษณ์|enneagram)[\\s]*[1-9])[\\s]*(?:ไหม|หรือเปล่า|ปะ|มั้ย)`, 'iu').test(value)) continue;
    const denied = value.match(new RegExp(`${SELF}ไม่(?:ได้)?(?:ใช่|เป็น)?[\\s:]*(${TYPE})`, 'iu'))?.[1]?.toUpperCase();
    if (denied === mbti) mbti = null;
    if (/เราไม่รู้ไทป์|ลืมไทป์เรา|ไม่ใช้ไทป์เดิม/u.test(value)) { mbti = null; enneagram = null; }
    const type = value.match(new RegExp(`${SELF}(?:เป็น|คือ|ได้|มีไทป์)[\\s:：]*(?:mbti[\\s:：]*)?(${TYPE})(?![A-Za-z])|(?:mbti|ไทป์)ของเรา[\\s:：=]*(${TYPE})(?![A-Za-z])`, 'iu'));
    if (type) mbti = (type[1] || type[2]).toUpperCase();
    if (new RegExp(`${SELF}ไม่(?:ได้)?(?:ใช่|เป็น)[\\s]*(?:ลักษณ์|enneagram)[\\s]*${enneagram ?? 'x'}`, 'iu').test(value)) enneagram = null;
    const number = value.match(new RegExp(`${SELF}(?:เป็น|คือ|ได้)[\\s]*(?:ลักษณ์|enneagram)[\\s:：]*([1-9])(?!\\d)|(?:enneagram|ลักษณ์)ของเรา[\\s:：=]*([1-9])(?!\\d)`, 'iu'));
    if (number) enneagram = Number(number[1] || number[2]);
    // A bare valid wing token counts only beside an explicit self MBTI claim.
    const wing = type && value.match(/\b([1-9])w([1-9])\b/iu);
    if (wing && [Number(wing[1]) % 9 + 1, (Number(wing[1]) + 7) % 9 + 1].includes(Number(wing[2]))) enneagram = Number(wing[1]);
  }
  return { mbti, enneagram };
}

const REQUEST = /mbti|enneagram|ennagame|เอ็นเนียแกรม|เอนเนียแกรม|นพลักษณ์|(?<![a-z])[ei][sn][tf][jp](?![a-z])|ลักษณ์\s*[1-9]|(?:ลักษณ์|ไทป์).*(?:ไหน|อะไร|วิเคราะห์|นิสัย)/iu;
const PROBLEM = /เหนื่อย|เครียด|กังวล|ไม่รู้จะเรียน|ไม่ชอบ|งานเพิ่ม|งานเยอะ|ไม่ตอบ|ปัญหา|กลัว|ถูกกดดัน|บังคับ/u;

export function personalityFrameworkReply(text, messages = []) {
  const current = clean(text);
  if (!current || BLOCK.test(current) || FICTION.test(current) || !REQUEST.test(current)) return null;
  // A label beside a problem must not displace the explanation of that problem.
  if (PROBLEM.test(current) && !/อธิบาย.*(?:mbti|enneagram|ลักษณ์)|(?:mbti|enneagram).*(?:คืออะไร|หมายถึง|แตกต่าง)/iu.test(current)) return null;
  const stated = statedPersonalityTypes(current, messages);
  if (/ม่านใจ|(?:นาย|คุณ|เธอ).*(?:เป็น|ไทป์)|บุคลิก.*(?:ai|เอไอ)/iu.test(current)
      && /infj|ไทป์|mbti/iu.test(current) && !stated.mbti) {
    return 'บุคลิกที่เราใช้ได้แรงบันดาลใจจาก INFJ คือมองความหมาย ความรู้สึก และทิศทางระยะยาวไปด้วยกัน\nเวลาคุยเราจะรับเหตุการณ์ที่เล่าก่อน เทียบมุมที่เป็นไปได้ แล้วกลับมาดูเหตุผลกับสิ่งที่ทำได้จริง\nนี่เป็นรูปแบบการคุยของม่านใจ เราไม่ได้มีบุคลิกมนุษย์หรือรู้ใจคนได้เพราะไทป์นี้';
  }
  const mentioned = current.match(new RegExp(`(?<![A-Za-z])(${TYPE})(?![A-Za-z])`, 'iu'))?.[1]?.toUpperCase();
  const enneagramMention = current.match(/(?:ลักษณ์|enneagram)[\s:：]*([1-9])(?!\d)/iu)?.[1];
  const type = mentioned || stated.mbti;
  const number = enneagramMention ? Number(enneagramMention) : stated.enneagram;
  if (type || number) {
    const parts = [];
    if (type) {
      const description = MBTI_TYPES[type].preferences;
      parts.push(`${stated.mbti === type ? `คุณระบุไทป์ ${type} ไว้` : `ถ้ามอง ${type} ในกรอบ MBTI`} กรอบนี้ชวนมองการ${description[0]}และการ${description[1]} รวมถึงการ${description[2]}และการ${description[3]}`);
    }
    if (number) {
      const data = ENNEAGRAM_TYPES[number];
      parts.push(`ส่วน Enneagram ลักษณ์ ${number} ใช้สำรวจเรื่อง${data.focus} ${data.lens} ลอง${data.practice}`);
    }
    parts.push('นี่เป็นมุมให้เทียบกับประสบการณ์จริง ไม่ใช่คำตัดสินตัวคุณ พฤติกรรมคล้ายกันอาจมาจากเหตุผลต่างกัน และ MBTI เดียวกันก็มี Enneagram ต่างกันได้');
    parts.push(chooseReply([
      'ใช้สิ่งที่คุณบอกว่าสำคัญกับต้นทุนที่รับไหวเป็นหลักเลือกทาง ตัวอักษรหรือลักษณ์ไม่จำเป็นต้องกำหนดอาชีพ ความสัมพันธ์ หรือสิ่งที่คุณทำได้',
      'ลองดูมุมที่ตรงกับเรื่องที่เกิดขึ้นและวางมุมที่ไม่ตรงไว้ ความเข้าใจตัวเองควรเพิ่มทางเลือกให้ชีวิต ไม่ใช่ทำให้ต้องทำตัวตามคำบรรยายไทป์',
    ], messages));
    return parts.join('\n');
  }
  return 'ถ้าใช้ MBTI เราจะมองวิธีรับข้อมูล วิธีตัดสินใจ จังหวะการคิดกับคนอื่น และการจัดทางเลือก แยกกันก่อน ไม่จับประโยคเดียวไปสรุปไทป์เต็ม\nส่วน Enneagram จะชวนมองว่าสิ่งที่ทำกำลังดูแลความต้องการอะไร เช่น ความมั่นคง การยอมรับ ความเป็นตัวเอง หรือความสงบ คนที่ทำเหมือนกันอาจต้องการคนละอย่าง\nเราจะยึดสิ่งที่คุณเล่าเป็นหลักแล้วเสนอความเป็นไปได้ที่ใช้คิดต่อได้ กรอบนี้ช่วยสำรวจตัวเองได้โดยไม่ต้องรีบติดป้ายหรือทำแบบสอบถามเพิ่ม';
}

/** A lens follows two explicit signals, never a score or inferred full type. */
export function personalityPerspective(text, messages = []) {
  const current = clean(text);
  if (!current || BLOCK.test(current) || FICTION.test(current)) return null;
  const recent = Array.isArray(messages) ? messages.filter(message => message?.role === 'assistant').slice(-2) : [];
  if (recent.some(message => /ถ้ามองสิ่งที่กำลังปกป้อง|ถ้ามองวิธีที่คุณใช้ตัดสินใจ/u.test(clean(message.content ?? message.text)))) return null;
  const rules = [
    [/อยากทำให้ถูก|อยากทำให้ดี|ต้องสมบูรณ์|ห้ามผิดพลาด/u, /กลัวผิด|โทษตัวเอง|ผิดไม่ได้/u, ENNEAGRAM_TYPES[1]],
    [/ช่วยคนอื่น|ช่วยทุกคน|ยอมคนอื่น/u, /กลัว.{0,15}(?:ไม่รัก|ไม่พอใจ|เสียเพื่อน)|ปฏิเสธไม่ลง/u, ENNEAGRAM_TYPES[2]],
    [/ต้องสำเร็จ|ต้องเก่ง|อยากสำเร็จ/u, /รู้สึกไร้ค่า|ไม่มีค่า|กลัว.{0,15}(?:ไม่ยอมรับ|ดูถูก)/u, ENNEAGRAM_TYPES[3]],
    [/ต้องแน่ใจ|หาข้อมูล|คิดทุกทาง/u, /กลัวเสี่ยง|กลัวเลือกผิด|กลัวพลาด/u, ENNEAGRAM_TYPES[6]],
    [/ไม่อยากทะเลาะ|หลีกเลี่ยงความขัดแย้ง|อยากให้สงบ/u, /ยอมตลอด|ไม่กล้าบอก|เก็บความต้องการ/u, ENNEAGRAM_TYPES[9]],
  ];
  const denied = /ไม่(?:ได้|เคย)?(?:อยากทำให้ถูก|อยากทำให้ดี|ต้องสมบูรณ์|ห้ามผิดพลาด|ช่วยคนอื่น|ช่วยทุกคน|ยอมคนอื่น|ต้องสำเร็จ|ต้องเก่ง|อยากสำเร็จ|ต้องแน่ใจ|หาข้อมูล|คิดทุกทาง)|ไม่(?:ได้|เคย)?กลัว/;
  // Explicit speaker, not a story about somebody else's motives.
  const ownMotive = /(?:เรา|ฉัน|ผม|หนู|กู)(?:รู้สึก|กลัว|อยาก|ต้อง|ไม่|ช่วย|ยอม|คิด|หาข้อมูล)/u.test(current)
    && !/(?:เพื่อน|เขา|แฟน|พ่อ|แม่)(?:ชอบ)?(?:ช่วยคนอื่น|ช่วยทุกคน|ยอมคนอื่น|ต้องสำเร็จ|ต้องเก่ง|ต้องแน่ใจ|หาข้อมูล)/u.test(current);
  for (const [behavior, concern, data] of rules) {
    if (!ownMotive || denied.test(current)) break;
    if (behavior.test(current) && concern.test(current))
      return `ถ้ามองสิ่งที่กำลังปกป้อง มุมเรื่อง${data.focus}อาจเกี่ยวกับสิ่งที่คุณเล่า ${data.lens} ถ้าตรงกับประสบการณ์ ลอง${data.practice}`;
  }
  if (/เราชอบคิดคนเดียว|เราต้องคิดคนเดียว/u.test(current) && /ก่อนค่อยคุย|ก่อนตอบ|ก่อนตัดสินใจ/u.test(current))
    return 'ถ้ามองวิธีที่คุณใช้ตัดสินใจ คุณบอกว่าต้องการพื้นที่ทบทวนก่อนแลกเปลี่ยน นี่เป็นมุมหนึ่งของคู่ I/E ใน MBTI ยังไม่ใช่ไทป์เต็ม ถ้าตรงกับเรื่องนี้ การบอกจังหวะที่ต้องการให้คนอื่นรู้ช่วยรักษาทั้งพื้นที่คิดและการทำงานร่วมกันได้';
  const stated = statedPersonalityTypes(current, messages);
  if (PROBLEM.test(current) && stated.enneagram) {
    const data = ENNEAGRAM_TYPES[stated.enneagram];
    return `ถ้ามองสิ่งที่กำลังปกป้อง ลักษณ์ ${stated.enneagram} ที่คุณระบุไว้เป็นเพียงมุมประกอบเรื่อง${data.focus} ${data.lens} ใช้เฉพาะส่วนที่ตรงกับเรื่องนี้ ไม่ถือว่าเหตุการณ์ทั้งหมดเกิดจากไทป์`;
  }
  if (PROBLEM.test(current) && stated.mbti) {
    const thinking = stated.mbti[2] === 'T'
      ? 'ถ้าการเทียบเหตุผลช่วยคุณได้ ลองดูหลักเกณฑ์ของทางเลือกควบคู่กับผลที่มีต่อคนและกำลังของตัวเอง'
      : 'ถ้าผลที่มีต่อคนสำคัญกับคุณ ลองดูความต้องการของตัวเองร่วมด้วย แล้วเทียบเหตุผลและต้นทุนของทางเลือก';
    return `ถ้ามองวิธีที่คุณใช้ตัดสินใจ ไทป์ ${stated.mbti} ที่คุณระบุไว้เป็นมุมประกอบได้ ${thinking} ความชอบตามกรอบไม่ได้บังคับว่าคุณต้องใช้วิธีเดียวหรือรู้สึกแบบเดียวเสมอ`;
  }
  return null;
}
