const normalize = value => value.normalize('NFC').replace(/[\s\p{P}\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F]/gu, '');

/** Prefer wording absent from this caller's recent replies, then least recently used. */
export function chooseReply(options, messages = []) {
  const candidates = Array.isArray(options) ? options.filter(value => typeof value === 'string' && value.trim()) : [];
  if (!candidates.length) return '';
  const history = Array.isArray(messages) ? messages.slice(-24).flatMap(message => {
    if (message?.role !== 'assistant') return [];
    const value = typeof message.content === 'string' ? message.content : message.text;
    return typeof value === 'string' ? [normalize(value.slice(0, 16000))] : [];
  }) : [];
  const last = history.at(-1) || '';
  return candidates.map((value, index) => {
    const normalized = normalize(value);
    const used = history.findLastIndex(reply => reply.includes(normalized));
    return { value, index, used, sameOpening: last.startsWith(normalized.slice(0, 12)) };
  }).sort((a, b) => a.used - b.used || Number(a.sameOpening) - Number(b.sameOpening) || a.index - b.index)[0].value;
}
