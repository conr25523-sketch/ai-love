// A bounded recursive-descent calculator. Only a complete arithmetic request is
// accepted; numbers mentioned in stories, quotations or code are not executed.
export function arithmeticReply(text) {
  if (typeof text !== 'string' || text.length > 240) return null;
  let expression = text.normalize('NFC').trim()
    .replace(/[๐-๙]/gu, digit => String(digit.charCodeAt(0) - 0x0e50))
    .replace(/\s*(?:หน่อย|ครับ|ค่ะ|คะ|อะ|อ่ะ|นะ)[?？\s]*$/u, '')
    .replace(/^(?:(?:ช่วย)?(?:คิด|คำนวณ|ตอบ)(?:ให้(?:หน่อย)?|หน่อย)?\s*|ขอถาม\s*)/u, '')
    .replace(/\s*(?:ได้เท่าไหร่|ได้เท่าไร|เท่ากับเท่าไหร่|เท่ากับเท่าไร|เป็นเท่าไหร่|เท่าไหร่|เท่าไร|ได้กี่|เท่ากับอะไร|เท่ากับ|=?\s*[?？]|=)(?:\s*(?:ครับ|ค่ะ|คะ|อะ|อ่ะ|นะ|หน่อย))?[?？\s]*$/u, '')
    .replace(/บวก/gu, '+').replace(/ลบ/gu, '-').replace(/คูณ|[×x]/gu, '*').replace(/หาร|÷/gu, '/')
    .replace(/ยกกำลัง/gu, '^').replace(/−/gu, '-').replace(/\s+/gu, '');
  if (!/^[\d.()+*/%^-]+$/u.test(expression) || !/[+*/%^-]/u.test(expression)) return null;
  const tokens = expression.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+*/%^-]/gu);
  if (!tokens || tokens.join('') !== expression || tokens.length > 100) return null;
  let position = 0, operations = 0;
  function checked(value) {
    if (!Number.isFinite(value) || Math.abs(value) > 1e100 || ++operations > 100) throw new Error('range');
    return value;
  }
  function primary() {
    const token = tokens[position++];
    if (token === '(') {
      const result = sum();
      if (tokens[position++] !== ')') throw new Error('syntax');
      return result;
    }
    if (!token || !/^(?:\d+(?:\.\d*)?|\.\d+)$/u.test(token)) throw new Error('syntax');
    return checked(Number(token));
  }
  function unary() {
    if (tokens[position] === '+') { position++; return unary(); }
    if (tokens[position] === '-') { position++; return -unary(); }
    const base = primary();
    if (tokens[position] !== '^') return base;
    position++;
    return checked(base ** unary());
  }
  function product() {
    let value = unary();
    while (['*', '/', '%'].includes(tokens[position])) {
      const operator = tokens[position++], right = unary();
      if (right === 0 && operator !== '*') throw new Error('zero');
      value = checked(operator === '*' ? value * right : operator === '/' ? value / right : value % right);
    }
    return value;
  }
  function sum() {
    let value = product();
    while (['+', '-'].includes(tokens[position])) {
      const operator = tokens[position++], right = product();
      value = checked(operator === '+' ? value + right : value - right);
    }
    return value;
  }
  try {
    const value = sum();
    if (position !== tokens.length) return null;
    return `${expression} = ${Number(value.toPrecision(14))}`;
  } catch (error) {
    if (error.message === 'zero') return 'หารด้วยศูนย์ไม่ได้ จึงไม่มีคำตอบเป็นจำนวนสำหรับโจทย์นี้';
    if (error.message === 'range') return 'ผลคำนวณเกินช่วงตัวเลขที่เครื่องคิดเลขนี้รองรับ';
    return null;
  }
}
