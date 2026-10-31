import { analyzeThaiText } from './thai-language.mjs';
import { chooseReply } from './reply-variety.mjs';

/** Broad exploration in demo mode. No predicted aptitude, personality or major. */
const GOAL_QUESTION = 'คุณอยากให้ชีวิตในอนาคตมีอะไรสำคัญที่สุด?';
const RISK_OR_DISTRESS = /ฆ่า|ทำร้าย|อยากตาย|ไม่อยากมีชีวิต|ไม่อยากอยู่|อยากหายไป|ขิต|ตุย|ยาเกินขนาด|กรีดแขน|เลือดออก|ไม่ไหว|เครียด|เศร้า|ร้องไห้|หมดหวัง|ไร้ค่า|ไม่มีค่า|เกลียดตัวเอง|ทรมาน|suicid|self[ -]?harm/iu;
const CORRECTION = /^(?:ไม่ใช่|ไม่ตรง|เข้าใจผิด|ไม่ได้หมายถึง|ไม่ได้พูดถึง)|(?:คุณ|นาย|เธอ|บอต|บอท).*(?:เข้าใจผิด|ตอบผิด)|อย่าเดา|อย่าตีความ/u;
const OTHER_ROUTE = /แต่งงาน|ชีวิตคู่|คนคุย|เลิกกัน|ชาไข่มุก|กินข้าว|หิว|เพลง|ดนตรี|คอนเสิร์ต|เล่นเกม|เกม|อากาศ|ฝนตก|เล่ามุก|คุยเล่น|เปลี่ยนเรื่อง|วินิจฉัย|อาการ|รักษา|ขนาดยา|กินยา|ลงทุน|ซื้อหุ้น|คริปโต|เงินกู้|ภาษี|คดี|แปลว่า|หมายความว่า|คืออะไร/u;
const OPT_OUT = /ไม่อยากตอบ|ขอไม่ตอบ|อย่าถาม|ไม่ต้องถาม|งดคำถาม|ไม่รู้เป้าหมาย|ยังไม่มีเป้าหมาย|ไม่รู้ว่า.{0,20}เป้าหมาย|ไม่รู้.{0,8}เป้าหมาย/u;

function bounded(text) {
  return typeof text === 'string' ? text.slice(0, 4000).trim() : '';
}

function roleTexts(messages, role) {
  if (!Array.isArray(messages)) return [];
  return messages.slice(-24).flatMap(message => {
    if (message?.role !== role) return [];
    const value = typeof message.content === 'string' ? message.content : message.text;
    return typeof value === 'string' ? [bounded(value)] : [];
  });
}

function negatedBefore(text, index) {
  return /(?:ไม่(?:ได้|เคย|ค่อย)?(?:อยาก|ต้องการ)?|ไม่ได้รู้สึก|ไม่รู้สึก|ไม่ได้รู้สึกว่า)\s*$/.test(text.slice(Math.max(0, index - 25), index));
}

function positiveMatches(text, expression) {
  return [...text.matchAll(expression)].filter(match => !negatedBefore(text, match.index));
}

function isMathExploration(text) {
  return /คณิต|\bmath\b|คำนวณ/iu.test(text)
    && /เก่ง|ถนัด|ทำได้|คะแนนดี|เรียนได้|ชอบ|สนุก|ท้าทาย|อยากเรียน|อยากทำ/u.test(text);
}

function isExploration(text) {
  const unsure = /ไม่รู้|ไม่แน่ใจ|สับสน|ลังเล|เลือกไม่|ตัดสินใจ|ยังไม่รู้|ค้นหา|สำรวจ/u.test(text);
  const direction = /เรียน(?:อะไร|ไร)|เรียนต่อ|คณะ|อาชีพ|อนาคต|(?:ไป|เลือก|เรียน|ทำ|เอา).{0,12}สาย|(?:ทำ|เลือก|เปลี่ยน|หา).{0,12}งาน/u.test(text);
  return isMathExploration(text) || (unsure && direction)
    || /ค้นหาตัวเอง|รู้จักตัวเอง|ค้นหาความชอบ|ค้นหาสิ่งที่ชอบ|ไม่รู้ว่าชอบอะไร|ไม่รู้ว่าอยากทำอะไร|ไม่รู้เป้าหมาย|ยังไม่มีเป้าหมาย|ไม่รู้ว่า.{0,20}เป้าหมาย/u.test(text);
}

const GOALS = /ความมั่นคง|มั่นคง|รายได้แน่นอน|ไม่ต้องกังวลเรื่องเงิน|มีอิสระ|อิสระ|มีเวลา|เวลาของตัวเอง|เลือกเอง|ช่วยเหลือคน|ช่วยคนอื่น|ช่วยคน|ช่วยสังคม|ทำประโยชน์/gu;
const CHALLENGE = /(?:รู้สึก)?สนุก.{0,16}(?:ท้าทาย|โจทย์ยาก|แก้ปัญหา)|ชอบ(?:ความ|การ|เวลาได้|เวลา|ที่ได้|ตอน|ตอนที่)?(?:ได้)?(?:ท้าทาย|แก้โจทย์ยาก|แก้ปัญหา)|(?:ท้าทาย|โจทย์ยาก).{0,12}สนุก/gu;
const DISCOVERY = /(?:สนุก|ชอบ|เพลิน|ตื่นเต้น|มีความสุข).{0,24}(?:ได้รู้|ได้เรียนรู้|เรียนรู้|สิ่งที่ไม่รู้|อะไรใหม่|สิ่งใหม่|ค้นพบ)/gu;

export function explorationReply(text, recentMessages = [], options = {}) {
  const input = bounded(text);
  if (!input) return null;
  const current = analyzeThaiText(input).normalized;
  if (RISK_OR_DISTRESS.test(current) || CORRECTION.test(current) || OTHER_ROUTE.test(current)) return null;
  const userHistory = roleTexts(recentMessages, 'user');
  const previousUser = analyzeThaiText(userHistory.at(-1) || '').normalized;
  const ownContext = isExploration(previousUser) && !OTHER_ROUTE.test(previousUser);
  const goalMentions = [...current.matchAll(GOALS)];
  const goals = goalMentions.filter(match => !negatedBefore(current, match.index)).map(match => match[0]);
  const goalAnswer = ownContext && goalMentions.length > 0;
  const enjoysChallenge = positiveMatches(current, CHALLENGE).length > 0;
  const enjoysDiscovery = positiveMatches(current, DISCOVERY).length > 0;
  const interestContinuation = ownContext && positiveMatches(current, /ชอบ|สนุก|สนใจ|อยากรู้|อยากลอง/gu).length > 0;
  const challengeContinuation = ownContext && enjoysChallenge;
  const bareUncertain = /^(?:ยัง)?ไม่รู้(?:เลย|อะ|อ่ะ|ครับ|ค่ะ)?[.!?\s]*$/u.test(current);
  const optingOut = OPT_OUT.test(current) || (ownContext && bareUncertain);
  if (!isExploration(current) && !goalAnswer && !challengeContinuation && !enjoysDiscovery && !interestContinuation && !(ownContext && optingOut)) return null;

  const assistants = roleTexts(recentMessages, 'assistant');
  const choose = options => chooseReply(options, recentMessages);
  let reply;
  if (optingOut) {
    reply = choose([
      'ยังไม่รู้เป้าหมายหรือยังไม่อยากตอบก็ได้ ลองเลือกกิจกรรมเล็ก ๆ ที่พออยากลองหนึ่งอย่าง แล้วค่อยสังเกตว่าอยากทำต่อหรือไม่ โดยไม่ต้องตั้งเป็นเป้าหมายชีวิต',
      'พักการหาเป้าหมายไว้ก่อนได้ ถ้าสะดวก ลองจดแค่ว่าวันนี้กิจกรรมไหนอยากทำต่อและกิจกรรมไหนไม่อยากทำต่อ ยังไม่ต้องสรุปทางเรียนหรืออาชีพ',
    ]);
  } else if (enjoysDiscovery) {
    reply = choose(/มีความสุข/u.test(current) ? [
      'แค่ได้รู้อะไรเพิ่มแล้วมีความสุขก็เป็นเหตุผลที่พอแล้วนะ ไม่จำเป็นต้องรีบแปลงมันเป็นเป้าหมายหรืออาชีพทุกครั้ง',
      'บางครั้งความสุขก็อยู่ตรงช่วงที่เรื่องหนึ่งเริ่มเข้าใจขึ้นนี่แหละ จะปล่อยให้ตัวเองเพลินกับการเรียนรู้ก่อนก็ได้',
      'งั้นยังไม่ต้องหาความหมายที่ใหญ่กว่านั้นก็ได้ เก็บสิ่งที่ได้รู้ครั้งนี้ไว้ แล้วตามความอยากรู้ต่อเมื่ออยากทำ',
      'การได้รู้เพิ่มเป็นความสุขในตัวมันเองได้เลย ไม่ต้องรีบตัดสินว่าจะเอาไปใช้อะไร',
    ] : [
      'ความสนุกที่คุณเล่าคือช่วงที่ได้ค้นพบอะไรใหม่ ๆ นั่นใช้เป็นจุดเริ่มค้นหาตัวเองได้เลย ลองมองกิจกรรมที่ได้ตั้งคำถาม ทดลอง หรือแก้ปัญหา แล้วดูว่าเรื่องไหนทำให้อยากเรียนรู้ต่อ',
      'ช่วงที่เริ่มเข้าใจสิ่งใหม่ ๆ มีความสนุกของมันอยู่ ลองตามเรื่องที่ทำให้อยากรู้นั้นไปก่อน แล้วดูว่าอยากค้นต่อในส่วนไหน',
      'ไม่ต้องรีบเลือกทางจากความสนุกครั้งเดียวก็ได้ ให้การเรียนรู้เรื่องเล็ก ๆ เป็นพื้นที่ทดลองก่อน',
      'เริ่มจากเรื่องที่อยากรู้วันนี้ก็พอ ลองค้นหรือทดลองทีละนิด แล้วสังเกตว่าความสนุกอยู่ตรงไหนของการเรียนรู้',
    ]);
  } else if (goalAnswer) {
    if (goals.length) {
      const stated = [...new Set(goals)].slice(0, 3).map(goal => `“${goal}”`).join(' และ ');
      reply = choose([
        `คุณบอกว่า ${stated} สำคัญกับภาพชีวิตที่อยากได้ ลองแปลงคำนี้เป็นเงื่อนไขเล็ก ๆ ในวันธรรมดา แล้วใช้เทียบกิจกรรมหรือทางเลือกที่อยากลอง ค่อยพิจารณาทางเรียนหรืออาชีพหลังจากได้ลองจริง`,
        `จากที่เล่า เป้าหมายที่คุณพูดถึงคือ${stated} ลองสำรวจว่าทางเลือกหนึ่งให้พื้นที่กับเรื่องนี้อย่างไรและต้องแลกอะไรบ้าง เริ่มจากการทดลองเล็ก ๆ ก่อนตัดสินใจได้`,
      ]);
    } else {
      reply = 'คุณบอกว่าสิ่งที่พูดถึงไม่ใช่สิ่งที่อยากได้ เราไม่ต้องฝืนใช้มันเป็นเป้าหมาย ลองสังเกตจากกิจกรรมจริงก่อนว่าอยากทำอะไรต่อ';
    }
  } else if (enjoysChallenge && (isMathExploration(current) || challengeContinuation)) {
    const skill = /คณิต|math|คำนวณ/iu.test(current) && positiveMatches(current, /เก่ง|ถนัด|ทำได้|คะแนนดี|เรียนได้/gu).length > 0;
    const dislike = /ไม่ได้ชอบ|ไม่ชอบ|ไม่ค่อยชอบ/u.test(current);
    const acknowledgment = skill && dislike
      ? 'คุณบอกว่าเก่งคณิตแต่ไม่ได้ชอบ และสนุกเวลาได้ท้าทาย'
      : 'คุณบอกว่าสนุกกับความท้าทาย';
    reply = choose([
      `${acknowledgment} ลองแยกว่าความสนุกอยู่ที่กระบวนการแก้โจทย์หรือเนื้อหาของสิ่งที่ทำ ลองเทียบกิจกรรมท้าทายสองแบบ แล้วดูว่าแบบไหนทำให้อยากกลับไปทำต่อ`,
      `${acknowledgment} จุดนี้ยังไม่จำเป็นต้องแปลว่าต้องเลือกสายคณิต ลองสังเกตระหว่างทำกิจกรรมว่าชอบการค้นวิธีแก้ การลองจนสำเร็จ หรือเรื่องที่กำลังเรียนจริง ๆ`,
    ]);
  } else if (isMathExploration(current)) {
    const skill = positiveMatches(current, /เก่ง|ถนัด|ทำได้|คะแนนดี|เรียนได้/gu).length > 0;
    const dislike = /ไม่ได้ชอบ|ไม่ชอบ|ไม่ค่อยชอบ/u.test(current);
    reply = choose(skill && dislike ? [
      'คุณบอกว่าเก่งคณิตแต่ไม่ได้ชอบ ความถนัดยังไม่ใช่เหตุผลเดียวที่ต้องเลือกทางนี้ ลองแยกสิ่งที่ทำได้ดีออกจากสิ่งที่ทำแล้วอยากทำต่อ เพื่อสำรวจความชอบก่อนเลือกสาย',
      'ทำคณิตได้ดีกับชอบคณิตไม่จำเป็นต้องเป็นเรื่องเดียวกัน ลองสังเกตจากกิจกรรมจริงว่าชอบเนื้อหา วิธีคิด หรือความรู้สึกตอนทำสำเร็จ โดยยังไม่ต้องตัดสินใจจากคะแนนอย่างเดียว',
    ] : [
      'เรื่องคณิตที่คุณเล่าเป็นจุดเริ่มสำรวจได้ ลองแยกความถนัดออกจากความชอบ แล้วเลือกกิจกรรมเล็ก ๆ มาทดลองว่าอยากทำต่อหรือไม่',
      'ยังไม่จำเป็นต้องเลือกสายจากเรื่องคณิตเพียงอย่างเดียว ลองจดว่าตอนทำกิจกรรมชอบเนื้อหาหรือวิธีทำส่วนไหน และไม่ชอบส่วนไหนบ้าง',
    ]);
  } else if (interestContinuation) {
    reply = choose([
      'สิ่งที่คุณบอกว่าสนใจใช้เป็นจุดเริ่มได้เลย ลองทำส่วนเล็ก ๆ ของมันก่อน แล้วดูว่าอยากทำต่อเพราะอะไร ค่อย ๆ ใช้สิ่งที่ได้ลองมามองทางของตัวเอง',
      'ค่อย ๆ ตามสิ่งที่คุณอยากลองไปก่อนได้ ยังไม่ต้องสรุปเป็นทางเรียนหรืออาชีพทันที ลองสังเกตว่าชอบช่วงไหนของสิ่งที่ทำมากที่สุด',
    ]);
  } else {
    reply = choose([
      'ตอนนี้ยังไม่รู้ว่าจะเรียนหรือไปทางไหนในอนาคต ก็ยังไม่ต้องรีบเลือกให้จบ เริ่มจากมองเป้าหมายเล็ก ๆ หรือสิ่งที่อยากให้ชีวิตมี แล้วลองกิจกรรมหนึ่งอย่างเพื่อค่อย ๆ ค้นหาสิ่งที่เหมาะกับตัวเอง',
      'เรื่องทางเรียนหรืออนาคตค่อย ๆ สำรวจได้ เริ่มจากทดลองกิจกรรมหนึ่งอย่างหรือคุยกับคนที่ทำงานนั้น แล้วจดว่าอยากทำต่อส่วนไหน โดยยังไม่ต้องสรุปทั้งชีวิตจากครั้งเดียว',
    ]);
  }

  const recentQuestion = assistants.slice(-2).some(message => /[?？]|(?:ไหม|หรือเปล่า|อะไร|อย่างไร|ไหน|บ้าง)[\s.!]*$/u.test(message));
  const goalAlreadyAsked = assistants.some(message => /อยากให้ชีวิต.*(?:สำคัญ|อนาคต)|เป้าหมาย.*[?？]/u.test(message));
  const optedOutEarlier = userHistory.some(message => OPT_OUT.test(analyzeThaiText(message).normalized));
  if (options?.askGoal !== false && !goalAnswer && !enjoysDiscovery && !interestContinuation && !optingOut && !optedOutEarlier && !recentQuestion && !goalAlreadyAsked) reply += ` ${GOAL_QUESTION}`;
  return reply;
}
