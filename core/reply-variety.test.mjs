import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseReply } from './reply-variety.mjs';

test('avoids recently used wording despite imagery, questions, whitespace and emoji', () => {
  const options = ['ค่อย ๆ คุยเรื่องนี้ได้', 'เริ่มจากส่วนที่อยากพูดก่อน', 'มีพื้นที่ให้เรื่องเล็ก ๆ ด้วย'];
  const history = [
    { role: 'assistant', content: `ภาพดาว\n\n${options[0]} คุณอยากเริ่มตรงไหน?` },
    { role: 'assistant', content: `${options[1].replaceAll(' ', '\n')} 🙂` },
  ];
  assert.equal(chooseReply(options, history), options[2]);
});

test('exhausted alternatives select the least recently used rather than a two-reply loop', () => {
  const options = ['ทางแรกให้ค่อย ๆ ลอง', 'ทางถัดไปเริ่มจากทีละส่วน', 'อีกทางให้พักการสรุปก่อน'];
  assert.equal(chooseReply(options, [options[1], options[0], options[2]].map(content => ({ role: 'assistant', content }))), options[1]);
});

test('selection ignores other roles and has no global state', () => {
  const options = ['เริ่มจากส่วนนี้ได้', 'คุยต่ออีกมุมได้'];
  assert.equal(chooseReply(options, [{ role: 'user', content: options[0] }, { role: 'system', content: options[0] }]), options[0]);
  chooseReply(options, [{ role: 'assistant', content: options[0] }]);
  assert.equal(chooseReply(options), options[0]);
  assert.equal(chooseReply(null, null), '');
});
