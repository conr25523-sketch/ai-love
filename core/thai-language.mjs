/** Lexical help for Thai chat. No model, diagnosis, intent inference, or storage. */
const MAX_CHARS = 4000;
const PARTICLE = /^(?:อะ|อ่ะ|นะ|เลย|มาก|จัง|อยู่|จน|กับ|เพราะ|แล้ว|อีก|เว้ย|ว่ะ|ครับ|ค่ะ|คะ|แต่|ได้|ไม่|จริง|เกิน|สุด|หน่อย|ด้วย|ไป|ละ|ล่ะ|แหละ|ปะ|ป่ะ|งับ|ฮะ|หรอ|เหรอ)/u;
const LETTER = /[\p{L}\p{M}\p{N}_]/u;

function boundedText(value) {
  if (typeof value !== 'string') return '';
  let result = value.slice(0, MAX_CHARS);
  // Never leave a partial surrogate pair at the boundary.
  if (/[\uD800-\uDBFF]$/.test(result)) result = result.slice(0, -1);
  return result.normalize('NFC').replace(/[\u200B-\u200D\u2060\uFEFF]/g, '').trim();
}

function standalone(text, term) {
  const expression = new RegExp(`(?<![\\p{L}\\p{M}\\p{N}_])${term}(?![\\p{L}\\p{M}\\p{N}_])`, 'gu');
  return [...text.matchAll(expression)];
}

function lexicalMatches(text, expression) {
  return [...text.matchAll(expression)].filter(match => {
    const after = text.slice(match.index + match[0].length);
    // Support unspaced chat, without treating e.g. เฟลิกซ์ or นอยเออร์ as slang.
    return !after || !LETTER.test(after[0]) || PARTICLE.test(after);
  });
}

function negatedAt(text, index) {
  const before = text.slice(Math.max(0, index - 25), index);
  return /(?:ไม่(?:ได้|เคย|ค่อย)?|มิได้|ไม่ได้รู้สึก|ไม่ได้รู้สึกว่า|ไม่รู้สึก|ไม่ได้เป็น|ไม่ต้อง)\s*$/.test(before);
}

const TERMS = [
  { expression: /นอยด์|นอย/gu, meaning: 'คำแชตที่อาจหมายถึงน้อยใจ กังวล หรือไม่สบายใจ ต้องดูบริบท ไม่ใช่ชื่อการวินิจฉัย', ambiguous: true },
  { expression: /เฟล/gu, meaning: 'ผิดหวัง หรือไม่เป็นไปตามที่หวัง คำนี้อาจกล่าวถึงผู้พูด คนอื่น หรือผลของเหตุการณ์' },
  { expression: /บ้ง/gu, meaning: 'ผิดพลาด ไม่เข้าท่า หรือไม่ได้ผล อาจกล่าวถึงคนอื่นหรือสิ่งของ ไม่ได้ยืนยันความรู้สึกของผู้พูด' },
  { expression: /มูฟออน/gu, meaning: 'เดินต่อหรือก้าวต่อจากเรื่องเดิม ไม่ได้ระบุเองว่าเป็นเรื่องความรัก' },
  { expression: /คิดมาก/gu, meaning: 'คิดวนหรือคิดกังวลกับเรื่องหนึ่ง ต้องดูว่าข้อความพูดถึงใครและมีคำปฏิเสธหรือไม่' },
  { expression: /งง/gu, meaning: 'สับสนหรือยังไม่เข้าใจ ไม่ใช่ข้อสรุปเรื่องบุคลิกหรือสุขภาพจิต' },
  { expression: /หมดแพชชั่น|หมดแพชชัน/gu, meaning: 'ความสนใจหรือแรงจูงใจกับกิจกรรมบางอย่างลดลง ไม่เท่ากับการวินิจฉัยโรค' },
  { expression: /ขิต|ตุย/gu, meaning: 'อาจเป็นคำพูดเกินจริงว่าไม่ไหวหรืออาจกล่าวถึงการตาย ต้องดูบริบท ไม่ถือเป็นเจตนาทำร้ายตนเอง และไม่ยืนยันว่าปลอดภัย', ambiguous: true },
  { expression: /อยากหายไป/gu, meaning: 'อาจต้องการพักหรือหลบจากสถานการณ์ หรือกำลังทุกข์ใจ ความหมายและความปลอดภัยยังไม่ชัดจากคำนี้เพียงอย่างเดียว', ambiguous: true },
];

/**
 * normalized corrects known spelling/emphasis and clear standalone abbreviations.
 * Polysemous slang stays in the text; hints explain it without assigning feelings.
 * previousText is used only to disambiguate "ghost" when this message has no clue.
 */
export function analyzeThaiText(text, { previousText = '' } = {}) {
  const original = boundedText(text);
  const previous = boundedText(previousText);
  let normalized = original;
  const hints = [];
  const seen = new Set();
  let ambiguous = false;
  const addHint = (term, meaning, uncertain = false) => {
    const key = `${term}\u0000${meaning}`;
    if (!seen.has(key)) {
      hints.push({ term, meaning });
      seen.add(key);
    }
    ambiguous ||= uncertain;
  };

  const spelling = [
    [/รุ้สึก|รู้สืก|รุสึก/gu, 'รู้สึก'],
    [/ไม่รุ้/gu, 'ไม่รู้'],
    [/สัปสน/gu, 'สับสน'],
    [/มั่ยไหว/gu, 'ไม่ไหว'],
  ];
  for (const [expression, canonical] of spelling) {
    normalized = normalized.replace(expression, term => {
      addHint(term, `รูปสะกดที่ใช้แทน “${canonical}”`);
      return canonical;
    });
  }
  // Only these known chat terms can lose repeated final letters. Never deduplicate
  // arbitrary Thai text: แม่, กก, บรรยากาศ, names, and unknown slang stay intact.
  const emphasis = [
    [/เหนื่อยย+/gu, 'เหนื่อย'], [/เครียดด+/gu, 'เครียด'],
    [/เฟลล+/gu, 'เฟล'], [/นอยด์ด+/gu, 'นอยด์'], [/นอยย+/gu, 'นอย'],
    [/มูฟออนน+/gu, 'มูฟออน'], [/คิดมากก+/gu, 'คิดมาก'],
    [/ไม่ไหวว+/gu, 'ไม่ไหว'], [/ท้ออ+/gu, 'ท้อ'], [/รู้สึกก+/gu, 'รู้สึก'],
    [/ง{3,}/gu, 'งง'],
  ];
  for (const [expression, canonical] of emphasis) {
    normalized = normalized.replace(expression, (term, index, source) => {
      const after = source.slice(index + term.length);
      if (after && LETTER.test(after[0]) && !PARTICLE.test(after)) return term;
      if (canonical === 'งง') {
        const before = source.slice(0, index);
        if (before && LETTER.test(before.at(-1)) && !/(?:เรา|ผม|ฉัน|กู|หนู|มัน|โคตร|คือ|แม่ง|มึง)$/.test(before)) return term;
      }
      addHint(term, `การลากเสียงเน้นคำ “${canonical}” ไม่ได้บอกระดับความรุนแรงของความรู้สึก`);
      return canonical;
    });
  }
  for (const [term, canonical] of [['มปร', 'ไม่เป็นไร'], ['รส', 'รู้สึก']]) {
    if (standalone(normalized, term).length) {
      addHint(term, `คำย่อ “${canonical}” เฉพาะเมื่อเป็นคำแยก ไม่สรุปว่าผู้พูดรู้สึกเช่นนั้นจริง`);
      normalized = normalized.replace(new RegExp(`(?<![\\p{L}\\p{M}\\p{N}_])${term}(?![\\p{L}\\p{M}\\p{N}_])`, 'gu'), canonical);
    }
  }

  for (const entry of TERMS) {
    for (const match of lexicalMatches(normalized, entry.expression)) {
      if (match[0] === 'งง') {
        const before = normalized.slice(0, match.index);
        if (before && LETTER.test(before.at(-1)) && !/(?:เรา|ผม|ฉัน|กู|หนู|มัน|โคตร|คือ|แม่ง|มึง)$/.test(before)) continue;
      }
      const negation = negatedAt(normalized, match.index)
        ? ' ข้อความมีคำปฏิเสธอยู่หน้าคำนี้ ต้องคงความหมายปฏิเสธไว้'
        : '';
      addHint(match[0], `${entry.meaning}${negation}`, entry.ambiguous);
    }
  }
  // A laughing suffix is a writing convention, not evidence that someone is happy.
  if (/(?<!\d)5{3,}(?!\d)/.test(normalized)) {
    addHint('555', 'รูปแบบหัวเราะในการแชต อาจใช้ขำ กลบเกลื่อน หรือประชด ไม่ยืนยันว่ามีความสุขหรือไม่ทุกข์ใจ');
  }

  const ghost = [...normalized.matchAll(/(?<![A-Za-z0-9_])ghost(?![A-Za-z0-9_])/giu)];
  if (ghost.length) {
    const literal = value => /ghost\s+(?:stor(?:y|ies)|of\b)|เรื่องผี|หนังผี|ผีสิง|(?:หนัง|เกม|ตัวละคร|เรื่องเล่า).*ghost|ghost.*(?:ผี|ตัวละคร|หนัง|เกม)/iu.test(value);
    const explicitNoun = /ghost\s+(?:stor(?:y|ies)|of\b)|(?:เรื่องเล่า|เล่าเรื่อง|อ่านเรื่อง|ตัวละคร).{0,20}ghost|ghost.{0,20}(?:คือผี|เป็นผี|ตัวละคร)/iu;
    const social = value => /แฟน|คนคุย|ความสัมพันธ์|แชต|ข้อความ|ไม่ตอบ|หายไป|การติดต่อ|โดน\s*ghost|ghost\s*(?:เรา|ฉัน|ผม|เขา)/iu.test(value);
    // Explicit noun phrases in this message override old relationship context.
    let meaning;
    if (explicitNoun.test(normalized)) meaning = 'ghost ในบริบทนี้กล่าวถึงผี เรื่องเล่า หรือตัวละคร ไม่ใช่การตัดการติดต่อ';
    else if (social(normalized)) meaning = 'ghost ในบริบทการติดต่อ หมายถึงหยุดตอบหรือหายไปโดยไม่อธิบาย ไม่ได้ยืนยันเจตนาของอีกฝ่าย';
    else if (literal(normalized)) meaning = 'ghost ในบริบทนี้กล่าวถึงผี เรื่องเล่า หรือตัวละคร ไม่ใช่การตัดการติดต่อ';
    else if (literal(previous) && !social(previous)) meaning = 'ghost อาจหมายถึงผีตามบริบทข้อความก่อนหน้า หากหมายถึงเรื่องใหม่ต้องตรวจบริบทอีกครั้ง';
    else if (social(previous) && !literal(previous)) meaning = 'ghost อาจหมายถึงหยุดตอบหรือหายจากการติดต่อ ตามบริบทข้อความก่อนหน้า ไม่ยืนยันเจตนาของอีกฝ่าย';
    else {
      meaning = 'ghost อาจหมายถึงผี หรือการหายไปจากการติดต่อ ต้องดูบริบทก่อนเลือกความหมาย';
      ambiguous = true;
    }
    addHint(ghost[0][0], meaning);
  }
  // Expanding abbreviations may increase length; keep the output bounded too.
  if (normalized.length > MAX_CHARS) normalized = boundedText(normalized);
  return { normalized, hints, ambiguous };
}
