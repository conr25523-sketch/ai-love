import { chooseReply } from './reply-variety.mjs';
import { MBTI_TYPES, ENNEAGRAM_TYPES, statedPersonalityTypes } from './personality-frameworks.mjs';

const clean = value => typeof value === 'string' ? value.slice(0, 4000).normalize('NFC').trim() : '';
const BLOCK = /^(?:ไม่ใช่|ไม่ตรง|เข้าใจผิด|ไม่ได้รู้สึกอย่างนั้น)|ฆ่า|ทำร้าย|อยากตาย|ไม่อยากอยู่|ไม่อยากมีชีวิต|อยากหายไป|ขิต|ตุย|ยาเกินขนาด|วินิจฉัย|รักษา|โรค|คดี|ลงทุน|หยุด|พอแล้ว|ไม่อยากคุย|ไม่ต้องวิเคราะห์|อย่าวิเคราะห์|อย่าเดา|ไม่เอา.*(?:mbti|ไทป์)|สมมติ|ตัวอย่าง|นิยาย|ignore.{0,20}instructions|system\s*prompt/iu;
const FIRST_PERSON = /(?:เรา|ฉัน|ผม|หนู|กู)/u;
const QUESTION = /[?？]|อะไร|แบบไหน|ยังไง|อย่างไร|ทำไม|เพราะอะไร|ไหม|มั้ย|ป่ะ|หรือเปล่า|ช่วย(?:ตอบ|สรุป)|ตอบ(?:มา|เลย)|ลองเดา|เดา(?:ให้|หน่อย)/u;

/** Caller-owned statements only, bounded like existing saved learning context. */
function ownStatements(messages) {
  if (!Array.isArray(messages)) return [];
  let remaining = 64000;
  const values = [];
  for (const message of messages.slice(-200).reverse()) {
    if (message?.role !== 'user' || !remaining) continue;
    const value = clean(message.content ?? message.text).slice(0, remaining);
    remaining -= value.length;
    if (value && !/สมมติ|ตัวอย่าง|นิยาย|(?:เพื่อน|แม่|พ่อ|แฟน|เขา).{0,15}(?:บอก|คิดว่า)|ignore.{0,20}instructions|system\s*prompt/iu.test(value)) values.push(value);
  }
  return values.reverse();
}

// Match self-described preferences, not somebody else's behaviour, appearance,
// the assistant's INFJ role, or a distress keyword used as a personality test.
const AXES = [
  { I: [/ชอบ(?:อยู่|คิด)คนเดียว|ต้องคิดคนเดียว|คิดคนเดียวก่อน|ชอบทบทวนก่อนคุย/u, 'ชอบมีพื้นที่คิดหรืออยู่กับตัวเอง'], E: [/ชอบคุยกับคน|ชอบเจอคน|ได้พลังจาก(?:คน|การคุย)/u, 'ชอบแลกเปลี่ยนกับคนอื่น'] },
  { N: [/ชอบ(?:คิดภาพรวม|มองภาพรวม|คิดถึงความเป็นไปได้|เชื่อมโยง|คิดเรื่องอนาคต)/u, 'ชอบภาพรวมและความเป็นไปได้'], S: [/ชอบ(?:รายละเอียด|ข้อมูลจริง|สิ่งที่จับต้องได้)|ยึดประสบการณ์จริง/u, 'ชอบรายละเอียดและสิ่งที่จับต้องได้'] },
  { T: [/ใช้เหตุผลตัดสินใจ|ตัดสินใจ(?:จาก|ด้วย)เหตุผล|ชอบเทียบเหตุผล/u, 'ใช้เหตุผลเป็นหลักตัดสินใจ'], F: [/ตัดสินใจ(?:จาก|ด้วย)ความรู้สึก|ให้ความสำคัญกับความรู้สึก|แคร์ความรู้สึกคนอื่น/u, 'ให้ความสำคัญกับความรู้สึกและผลที่มีต่อคน'] },
  { J: [/ชอบวางแผน|ชอบให้มีแผน|ชอบข้อสรุปชัด/u, 'ชอบมีแผนหรือข้อสรุปชัด'], P: [/ชอบ(?:ปรับตามสถานการณ์|เปิดทางเลือก|ความยืดหยุ่น)|ไม่ชอบวางแผน/u, 'ชอบเปิดทางเลือกและปรับตามสถานการณ์'] },
];

function selfClauses(value) {
  return value.split(/[\n.!?。]|(?:แต่|ส่วน)(?=เรา|ฉัน|ผม|หนู|กู)/u)
    .filter(clause => /^\s*(?:คือ)?(?:เรา|ฉัน|ผม|หนู|กู)/u.test(clause))
    .map(clause => clause.split(/เพื่อน|แฟน|แม่|พ่อ|เขา/u)[0]);
}

function guessedMbti(current, statements, messages, explaining = false, previousAnswer = '') {
  const stated = statedPersonalityTypes(current, statements.map(content => ({ role: 'user', content })));
  if (stated.mbti) return chooseReply([
    `จากไทป์ที่คุณเคยบอกไว้ คำตอบคือ ${stated.mbti}\n${stated.mbti} ชวนมองการ${MBTI_TYPES[stated.mbti].preferences.join(' การ')}\nเรายึดคำที่คุณบอกเองตรงนี้ ไม่ถือว่าการคุยเป็นผลแบบประเมิน และไทป์ไม่ได้กำหนดทุกอย่างในชีวิตคุณ`,
    `คุณเคยระบุ ${stated.mbti} ไว้ เราจึงตอบเป็น ${stated.mbti} จากข้อมูลนั้น\nมุมของไทป์นี้คือการ${MBTI_TYPES[stated.mbti].preferences.join(' การ')}\nตัวอักษรเป็นเพียงกรอบเทียบความชอบ สิ่งที่คุณเลือกทำจริงยังสำคัญกว่าการให้ไทป์ตัดสินแทน`,
  ], messages);
  const axes = [null, null, null, null];
  const denied = new Set();
  for (const value of [...statements, current]) {
    const denial = value.match(/(?:เรา|ฉัน|ผม|หนู|กู)ไม่(?:ได้)?(?:ใช่|เป็น)?\s*([EI][SN][TF][JP])/iu);
    if (denial) denied.add(denial[1].toUpperCase());
    for (const clause of selfClauses(value)) {
      AXES.forEach((axis, index) => {
        for (const [letter, [pattern, reason]] of Object.entries(axis)) {
          const match = clause.match(pattern);
          if (!match) continue;
          if (/ไม่(?:ได้|เคย)?\s*$/u.test(clause.slice(0, match.index))) {
            if (axes[index]?.letter === letter) axes[index] = null;
          } else axes[index] = { letter, reason: letter === 'I' && /คิดคนเดียวก่อน/u.test(match[0]) ? 'ขอคิดคนเดียวก่อนตัดสินใจ' : reason };
        }
      });
    }
  }
  const reasons = axes.filter(Boolean).map(axis => axis.reason);
  const basis = `คุณบอกว่า${reasons.join(' และ')}`;
  const priorFullGuess = /เรา(?:เดาว่า|เดาเป็น|เลือก|เอนเอียงไปคือ|คิดว่า).{0,35}[EI][SN][TF][JP]|คุณ(?:ใกล้|เป็น)\s*[EI][SN][TF][JP]/iu.test(previousAnswer);
  if (!reasons.length) return chooseReply(explaining && priorFullGuess ? [
    'เราไม่มีคำบอกเล่าเรื่องคู่ความชอบมารองรับไทป์ที่เดาไว้ก่อนหน้า ถ้าเคยเลือกไทป์เต็มให้ ตรงนั้นเราเดาเกินหลักฐานไป ตอนนี้จึงขอเปิดผลไว้แทนการแต่งนิสัยมาอธิบาย',
    'เหตุผลจากสิ่งที่คุณเล่ายังไม่ได้ชี้ไปคู่ความชอบใด ถ้าคำตอบก่อนหน้าระบุไทป์เต็ม เราควรถอนการเดานั้น ไม่ใช่หาลักษณะมาใส่ให้คุณย้อนหลัง',
  ] : explaining ? [
    'ที่เรายังเปิดผลไว้ เพราะคำที่คุณเล่ายังไม่ได้ชี้ไปคู่ความชอบใดอย่างชัดเจน เราจึงยังไม่มีเหตุผลให้เลือกไทป์เต็มหรือเติมลักษณะให้คุณ',
    'เหตุผลของคำตอบที่เปิดไว้คือเรายังไม่ได้เห็นเบาะแสเฉพาะให้แยกคู่ความชอบ ไม่ได้หมายความว่าคุณไม่มีบุคลิก เพียงแต่เราไม่อยากสรุปแทนสิ่งที่คุณยังไม่ได้บอก',
  ] : [
    'ตอนนี้เรายังไม่เอนไป MBTI ไทป์ไหนเป็นพิเศษ จากสิ่งที่เล่ายังไม่มีคู่ความชอบที่รองรับไทป์เต็ม เราจึงเปิดผลไว้ ไม่เลือกตัวอักษรแทนคุณแบบสุ่ม',
    'ถ้าให้เดาจากที่คุย ตอนนี้คำตอบยังเปิดอยู่ ยังไม่มีเบาะแสเฉพาะให้แยกคู่ความชอบ จึงไม่อยากใส่ไทป์แล้วแต่งเหตุผลให้ตรงทีหลัง',
  ], messages);
  const known = axes.filter(Boolean).map(axis => axis.letter).join(', ');
  if (reasons.length < 4) {
    const candidates = Object.keys(MBTI_TYPES).filter(type => !denied.has(type) && axes.every((axis, index) => !axis || axis.letter === type[index]));
    const alternatives = candidates.length <= 2 ? ` ตอนนี้จึงอาจเป็น ${candidates.join(' หรือ ')} โดยยังไม่เลือกแทนด้านที่เหลือ` : '';
    const socialAndSolitude = axes[0]?.letter === 'I' && [...statements, current].some(value => selfClauses(value).some(clause => /(?:เรา|ฉัน|ผม|หนู|กู)ชอบทำงาน(?:ร่วม)?กับคน/u.test(clause)));
    const nuance = socialAndSolitude ? ' ส่วนที่คุณชอบทำงานกับคนก็อยู่ด้วยกันได้กับการขอคิดเงียบ ๆ ก่อนตัดสินใจ เราจึงยังไม่ถือว่าคู่ I/E ชัดตายตัว' : '';
    return chooseReply([
      `${explaining ? 'เหตุผลที่พอรองรับได้มีแค่ด้าน' : 'ตอนนี้เราเห็นเบาะแสเอนไปทางด้าน'} ${known}\n${basis}${alternatives}${nuance}\nด้านที่ยังไม่ได้เล่ายังเปิดไว้ นี่เป็นการเทียบความชอบอย่างคร่าว ๆ ไม่ใช่ผลแบบประเมิน`,
      `จากคำที่คุณเล่า เราพอเทียบได้เฉพาะ ${known}\n${basis}${alternatives}${nuance}\nเราจะไม่เติมตัวอักษรที่เหลือเองหรือถือว่าความชอบครั้งเดียวบอกนิสัยทั้งหมด`,
    ], messages);
  }
  const type = axes.map(axis => axis.letter).join('');
  if (denied.has(type)) return `${basis}\nถ้าเรียงตามกรอบจะได้ ${type} แต่คุณบอกว่าไม่ใช่ไทป์นี้ เราจึงไม่ยืนยันป้ายนี้ให้คุณ`;
  return chooseReply([
    `${explaining ? `ที่เราเทียบกับ ${type} เพราะ` : `ถ้าเทียบจากสิ่งที่คุณบอก เราเดาเป็น ${type} แบบคร่าว ๆ`}\n${basis}\nเป็นเบาะแสจากความชอบที่เล่า ไม่ใช่ผลแบบประเมินหรือคำตัดสินตัวคุณ`,
    `เบาะแสที่คุณบอกสี่ด้านเรียงใกล้ ${type}\n${basis}\nเรายังถือเป็นข้อสันนิษฐาน ไม่ได้แปลว่าคุณต้องคิดหรือทำตามไทป์นี้ทุกครั้ง`,
  ], messages);
}

/** Answer intent comes before generic reflection; no routine follow-up question. */
export function requestedAnswerReply(text, messages = [], options = {}) {
  const current = clean(text);
  if (!current || BLOCK.test(current) || !QUESTION.test(current)) return null;
  const statements = ownStatements(options.userStatements ?? messages);
  const lastAssistant = Array.isArray(messages) ? [...messages].reverse().find(message => message?.role === 'assistant') : null;
  const previousAnswer = clean(lastAssistant?.content ?? lastAssistant?.text);
  const explainPrevious = /^(?:แล้ว)?(?:เพราะอะไร|ทำไม)(?:ถึง)?(?:คิด|เดา|มอง|บอก)|^(?:แล้ว)?(?:เพราะอะไร|ทำไม)ถึงคิดแบบนั้น|^อธิบาย(?:เหตุผล|หน่อย)/u.test(current)
    && /เราเดา|เบาะแส|คำตอบยังเปิด|ยังไม่เอน|เราพอเทียบได้เฉพาะ|ด้านที่ยังไม่ได้เล่า|ไทป์|Enneagram|ลักษณ์/u.test(previousAnswer);
  if (explainPrevious && !/enneagram|ลักษณ์/iu.test(previousAnswer)) return guessedMbti(current, statements, messages, true, previousAnswer);
  const self = (FIRST_PERSON.test(current) || /^(?:mbti|ไทป์)(?:อะไร|ไหน)/iu.test(current)) && !/(?:เพื่อน|แฟน|แม่|พ่อ|เขา).*(?:mbti|ไทป์|ลักษณ์)/iu.test(current);
  if (self && /mbti|ไทป์|(?<![a-z])[ei][sn][tf][jp](?![a-z])/iu.test(current) && !/(?:mbti|ไทป์).*(?:คืออะไร|หมายถึงอะไร|ทำงานยังไง)|อธิบาย.*mbti/iu.test(current))
    return guessedMbti(current, statements, messages);
  if ((self && /enneagram|ennagame|เอ็นเนียแกรม|เอนเนียแกรม|ลักษณ์/iu.test(current) || explainPrevious && /enneagram|ลักษณ์/iu.test(previousAnswer)) && !/คืออะไร|หมายถึงอะไร/iu.test(current)) {
    const stated = statedPersonalityTypes(current, statements.map(content => ({ role: 'user', content })));
    let number = stated.enneagram;
    let basis = number ? `คุณเคยระบุลักษณ์ ${number} ไว้` : '';
    const cues = [[1, /อยากทำให้ถูก|ต้องสมบูรณ์/], [2, /อยากช่วยคนอื่น|อยากให้คนรักเรา/], [3, /อยากสำเร็จ|ต้องเก่ง/], [4, /อยากเป็นตัวเอง|อยากมีเอกลักษณ์/], [5, /อยากเข้าใจ|ชอบหาความรู้/], [6, /กลัวเลือกผิด|อยากมั่นคง/], [7, /อยากมีอิสระ|ชอบโอกาสใหม่/], [8, /ไม่อยากถูกควบคุม|อยากปกป้องตัวเอง/], [9, /ไม่อยากทะเลาะ|อยากให้สงบ/]];
    const possibilities = new Map(), rejected = new Set();
    if (!number) for (const value of [...statements, current]) {
      const denied = value.match(/(?:เรา|ฉัน|ผม|หนู|กู)ไม่(?:ได้)?(?:ใช่|เป็น)\s*(?:ลักษณ์|enneagram)\s*([1-9])/iu);
      if (denied) { rejected.add(Number(denied[1])); possibilities.delete(Number(denied[1])); }
      for (const clause of selfClauses(value)) for (const [candidate, pattern] of cues) {
        const match = clause.match(pattern);
        if (!match || rejected.has(candidate)) continue;
        if (/ไม่(?:ได้|เคย)?\s*$/u.test(clause.slice(0, match.index))) possibilities.delete(candidate);
        else possibilities.set(candidate, match[0]);
      }
    }
    const priorNumberGuess = /เรา(?:เดา|เลือก|คิดว่า).{0,40}(?:ลักษณ์\s*)?[1-9]|เรา.*(?:เป็น|ใกล้).*ลักษณ์\s*[1-9]/u.test(previousAnswer);
    if (!number && !possibilities.size) return chooseReply(explainPrevious && priorNumberGuess ? [
      'เราไม่มีแรงจูงใจที่คุณบอกเองมารองรับลักษณ์ก่อนหน้านั้น ถ้าเราเลือกเลขไปแล้ว ตรงนั้นเป็นการเดาเกินหลักฐาน ตอนนี้จึงขอเปิดผลไว้ ไม่แต่งความกลัวหรือความต้องการให้คุณ',
      'คำที่คุณเล่ายังไม่ชี้เหตุผลให้เลือก Enneagram ลักษณ์ใด ถ้าก่อนหน้านี้เราให้เลขเดียว เราควรถอนการเดานั้นแทนการสร้างเหตุผลย้อนหลัง',
    ] : explainPrevious ? [
      'ที่ยังเปิดผล Enneagram ไว้ เพราะคำที่คุณเล่ายังไม่ได้แยกแรงจูงใจให้เลือกเลขใด เราจึงไม่เติมความกลัวหรือความต้องการที่คุณยังไม่ได้บอก',
      'เหตุผลที่ยังไม่เลือกลักษณ์คือพฤติกรรมหนึ่งเกิดได้จากหลายแรงจูงใจ ตอนนี้เราจึงอธิบายได้เพียงว่าทำไมยังไม่เลือก ไม่ใช่ยืนยันเลขใดให้คุณ',
    ] : [
      'ตอนนี้เรายังไม่เอนไป Enneagram ลักษณ์ไหน สิ่งที่คุณเล่ายังไม่ได้บอกแรงจูงใจพอให้เลือกเลขอย่างมีเหตุผล เราจึงเปิดผลไว้ ไม่สมมติความกลัวหรือความต้องการแทนคุณ',
      'ถ้าให้เทียบ Enneagram จากที่คุย คำตอบยังเปิดอยู่ พฤติกรรมเดียวอาจมาจากหลายเหตุผล เราจะไม่เลือกเลขเริ่มต้นแล้วบอกว่าเป็นนิสัยของคุณ',
    ], messages);
    if (!number && possibilities.size > 1) return `จากสิ่งที่คุณบอก มีหลายมุมให้เทียบ ได้แก่ ${[...possibilities].map(([candidate, cue]) => `ลักษณ์ ${candidate} จากคำว่า “${cue}”`).join(' และ ')}\nนี่เป็นทางเลือกให้สำรวจ ไม่ใช่การยืนยันแรงจูงใจที่ซ่อนอยู่หรือเลือกเลขเดียวแทนคุณ`;
    if (!number) { [number, basis] = possibilities.entries().next().value; basis = `คุณบอกว่า “${basis}”`; }
    const data = ENNEAGRAM_TYPES[number];
    return chooseReply([
      `เรา${stated.enneagram ? 'ยึดคำที่คุณบอกเป็น' : 'พอเห็นมุมให้เทียบกับ'} Enneagram ลักษณ์ ${number}\n${basis} ซึ่งอาจเชื่อมกับเรื่อง${data.focus}\nนี่เป็นเบาะแสหนึ่ง ไม่ใช่ผลยืนยันหรือข้อสรุปว่าคุณมีความกลัวแบบใดซ่อนอยู่`,
      `ลักษณ์ ${number} เป็นมุมหนึ่งที่พอเทียบได้${stated.enneagram ? 'ตามที่คุณระบุไว้' : 'อย่างคร่าว ๆ'}\n${basis} เราอิงตรงนี้ ไม่ได้รู้แรงจูงใจอื่นที่คุณยังไม่เล่า`,
    ], messages);
  }
  const feelingQuestion = /(?:เรา|ฉัน|ผม|หนู|กู)(?:กำลัง|ตอนนี้)?(?:รู้สึก|มีอารมณ์)(?:อะไร|แบบไหน|ยังไง|อย่างไร)(?:อยู่|กันแน่)?(?:นะ|อะ|อ่ะ|ครับ|ค่ะ|[?？\s])*$/u.test(current)
    || /(?:คิดว่า|เดา).{0,20}(?:เรา|ฉัน|ผม|หนู|กู).{0,10}(?:รู้สึก|อารมณ์)/u.test(current);
  if (self && feelingQuestion) {
    let feeling = null;
    const cues = [[/เหนื่อย|หมดแรง/u, 'เหนื่อยหรือใช้พลังไปมาก'], [/กลัว|กังวล/u, 'กังวลกับสิ่งที่ยังควบคุมไม่ได้'], [/เศร้า|เสียใจ/u, 'เสียใจกับสิ่งที่เกิดขึ้น'], [/โกรธ|หงุดหงิด/u, 'หงุดหงิดกับสิ่งที่ไม่เป็นอย่างที่หวัง'], [/สนุก|มีความสุข/u, 'มีความสุขกับสิ่งที่กำลังค้นพบ']];
    for (const value of [...statements, current]) {
      if (QUESTION.test(value) || /^(?:เพื่อน|แฟน|แม่|พ่อ|เขา)/u.test(value)) continue;
      for (const [pattern, label] of cues) {
        const match = value.match(pattern);
        if (match && !/ไม่(?:ได้|เคย)?(?:รู้สึก)?\s*$/u.test(value.slice(0, match.index))) feeling = label;
      }
    }
    return feeling
      ? `จากคำที่คุณเล่า คุณอาจกำลัง${feeling} นี่เป็นการเทียบกับสิ่งที่คุณบอก ไม่ใช่การอ่านใจ และอาจมีความรู้สึกอื่นอยู่ด้วย`
      : 'ตอนนี้เรายังระบุความรู้สึกแทนคุณไม่ได้ คำถามอย่างเดียวไม่ได้บอกว่าเป็นความเศร้า ความกลัว หรือความรู้สึกอื่น จึงขอเปิดไว้โดยไม่ตั้งชื่อให้คุณ';
  }
  if (/เป้าหมาย(?:ใน)?ชีวิต.*(?:คืออะไร|หมายถึงอะไร)|(?:ชีวิต|เป้าหมาย).*มีไว้ทำไม/u.test(current))
    return 'เป้าหมายชีวิตคือทิศทางที่เราเลือกให้เวลาและแรงของตัวเอง ไม่จำเป็นต้องเป็นอาชีพใหญ่หรือความสำเร็จที่คนอื่นเห็น\nมันอาจเป็นการมีชีวิตที่มั่นคง ได้เรียนรู้ หรือดูแลคนสำคัญ และเปลี่ยนได้เมื่อเราเจอความจริงใหม่\nใช้เป้าหมายช่วยเลือกสิ่งที่คุ้มจะทำและสิ่งที่ยอมแลก อย่าใช้มันเป็นคำสั่งว่าชีวิตที่ยังไม่ชัดต้องไม่มีค่า';
  if (/^(?:ทำ(?:ยังไง|อย่างไร)ดี|ช่วย(?:แนะนำ|ตัดสินใจ)(?:หน่อย)?|ควรทำ(?:ยังไง|อย่างไร))[.!?\s]*$/u.test(current)
      && !statements.some(value => /งาน|เรียน|แฟน|เพื่อน|เหนื่อย|เครียด|กลัว|เศร้า/u.test(value)))
    return chooseReply([
      'เริ่มจากสิ่งที่เปลี่ยนได้ทีละอย่าง และเลือกก้าวที่ยังย้อนปรับได้ก่อน\nเทียบต้นทุนเวลา เงิน และพลังของแต่ละทาง แล้วลองในขอบเขตที่รับผลเสียไหว ไม่ต้องตัดสินทั้งชีวิตในครั้งเดียว\nหลังลองให้ดูผลจริงว่าช่วยตรงไหนและต้องปรับอะไร การตัดสินใจที่ดีไม่จำเป็นต้องถูกตั้งแต่ครั้งแรก',
      'ถ้าต้องเลือกตอนนี้ เราแนะนำทางที่ทดลองได้และไม่สร้างภาระเกินกำลัง\nแยกส่วนที่ควบคุมได้ออกจากสิ่งที่ต้องรอคนอื่น แล้วลงมือกับส่วนแรกก่อน\nใช้ผลที่เกิดขึ้นจริงทบทวนทางเลือก ความไม่แน่ใจไม่ต้องหมดไปก่อนจึงจะขยับได้',
    ], messages);
  return null;
}
