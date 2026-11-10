// Text the reading round and the page agree on. Kept dependency-free so the browser
// bundle does not pull the rule engine in just to recognise a button.
export const MODE_REQUEST = Object.freeze({ cups: 'ขอฟังแบบไพ่ถ้วย', swords: 'ขอฟังแบบไพ่ดาบ' });
export const MODE_INVITATION = 'เลือกวิธีฟังคำทำนายต่อได้ด้านล่าง';
export const MODE_INVITATION_CUPS_ONLY = 'ตอนนี้เหมาะกับไพ่ถ้วย กดฟังต่อได้ด้านล่าง';

/** What the page should offer after this assistant message, or null. */
export function modeChoiceFor(content) {
  if (typeof content !== 'string') return null;
  const cupsOnly = content.includes(MODE_INVITATION_CUPS_ONLY);
  if (!cupsOnly && !content.includes(MODE_INVITATION)) return null;
  return { swords: !cupsOnly, recommended: !cupsOnly && /เราแนะนำไพ่ดาบ/u.test(content) ? 'swords' : 'cups' };
}
