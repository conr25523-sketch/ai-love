import assert from 'node:assert/strict';
const base = new URL(process.env.MOONMIND_TEST_URL || 'http://127.0.0.1:5173');
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname), 'Synthetic local records only');
async function visitor() {
  const response = await fetch(new URL('/api/session', base));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).mode, 'demo', 'Never call a paid model');
  const cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  return async (path, method = 'GET', body) => {
    const result = await fetch(new URL(path, base), { method, headers: { cookie,
      ...(body === undefined ? {} : { origin: base.origin, 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    assert.equal(result.status, 200);
    return result.json();
  };
}
const call = await visitor();
await call('/api/session', 'POST', { name: '__MOONMIND_MEMORY_SMOKE__', consent: true, consentAdmin: false });
const send = async content => (await call('/api/messages', 'POST', { content, requestId: crypto.randomUUID() })).messages.find(message => message.role === 'assistant').content;
try {
  await send('เราชอบคณิต');
  await send('ไม่ต้องถามบ่อย และไม่เอาอีโมจิ');
  for (let i = 0; i < 11; i++) await send(`คุยเล่นเรื่องวันนี้ ${i}`);
  assert.ok((await call('/api/session')).user);
  const recalled = await send('จำได้ไหมว่าเราชอบอะไร');
  assert.match(recalled, /คณิต/);
  assert.doesNotMatch(recalled, /[?？]/);
  const guidance = await send('ไม่รู้จะเรียนอะไร');
  assert.doesNotMatch(guidance, /[?？]/);
  const greeting = await send('สวัสดี');
  assert.doesNotMatch(greeting, /[\p{Extended_Pictographic}?？]/u);
  await send('เราไม่ชอบคณิต');
  const corrected = await send('จำอะไรเกี่ยวกับเรา');
  assert.match(corrected, /ไม่ชอบ/);
  const other = await visitor();
  await other('/api/session', 'POST', { name: '__MOONMIND_MEMORY_SMOKE__', consent: true, consentAdmin: false });
  try {
    const foreign = (await other('/api/messages', 'POST', { content: 'จำอะไรเกี่ยวกับเรา', requestId: crypto.randomUUID() })).messages.find(message => message.role === 'assistant').content;
    assert.doesNotMatch(foreign, /คณิต/);
  } finally { await other('/api/messages', 'DELETE', {}); }
  await call('/api/messages', 'DELETE', {});
  const forgotten = await send('จำอะไรเกี่ยวกับเรา');
  assert.doesNotMatch(forgotten, /คณิต/);
  console.log('Memory HTTP passed: older statements, saved-session recall, learned style, correction, same-name isolation and deletion; local demo only.');
} finally { await call('/api/messages', 'DELETE', {}); }
