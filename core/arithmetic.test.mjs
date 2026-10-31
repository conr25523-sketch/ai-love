import test from 'node:test';
import assert from 'node:assert/strict';
import { arithmeticReply } from './arithmetic.mjs';

test('complete arithmetic questions calculate with precedence, Thai digits and natural wrappers', () => {
  for (const [input, expected] of [
    ['1+1 ได้เท่าไหร่', '1+1 = 2'], ['ช่วยคำนวณ (2+3)*4 หน่อย', '(2+3)*4 = 20'],
    ['คำนวณ (2+3)*4', '(2+3)*4 = 20'], ['๒ บวก ๓ คูณ ๔ เท่ากับเท่าไหร่?', '2+3*4 = 14'],
    ['-2^2', '-2^2 = -4'], ['2^3^2', '2^3^2 = 512'], ['0.1+0.2?', '0.1+0.2 = 0.3'],
    ['12 หาร 4 ได้เท่าไหร่ครับ', '12/4 = 3'],
  ]) assert.equal(arithmeticReply(input), expected, input);
});

test('story numbers, comparisons, code and malformed expressions are never evaluated', () => {
  for (const input of ['เราเห็นคนบอกว่า 1+1=2 แล้วก็คิดถึงแฟน', 'ชีวิตไม่ใช่ 1+1', '1+1;process.exit()', '2+globalThis.secret', '1..2+3', '1+2)', '((1+2)', '2**3', '123', '+'.repeat(101)+'1'])
    assert.equal(arithmeticReply(input), null, input);
  assert.match(arithmeticReply('1/0'), /ศูนย์/);
  assert.match(arithmeticReply('10^1000'), /เกินช่วง/);
});
