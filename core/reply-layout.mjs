// Formatting never adds interpretation, advice, or a minimum number of lines.
const CLAUSE = /[ \t]+(?=(?:เรา|คุณ|ลอง|ถ้า|แต่|ความ|การ|สิ่ง|เรื่อง|ตอนนี้|บาง|ยัง|ไม่|ให้|มัน|คน|จาก|เอาจริง|ทางเลือก|เป้าหมาย|นั่น|และ|โดย|จึง))/u;

/** Preserve short turns and existing paragraphs; wrap only long existing prose. */
export function formatReplyLines(content, _options = {}) {
  if (typeof content !== 'string' || !content.trim()) return '';
  const original = content.trim().replace(/\r\n?/g, '\n');
  if (original.length < 320 || original.includes('\n')) return original;
  const clauses = original.split(CLAUSE);
  if (clauses.length < 2) return original;
  const paragraphs = [];
  let paragraph = '';
  for (const clause of clauses) {
    if (paragraph.length >= 200) { paragraphs.push(paragraph); paragraph = clause; }
    else paragraph += `${paragraph ? ' ' : ''}${clause}`;
  }
  if (paragraph) paragraphs.push(paragraph);
  return paragraphs.join('\n');
}
