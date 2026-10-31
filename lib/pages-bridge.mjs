export const PAGES_ORIGIN = 'https://conr25523-sketch.github.io';
export const SESSION_HEADER = 'X-Moonmind-Session';
const COOKIE_NAMES = ['moonmind_visitor', 'moonmind_guest_profile', 'moonmind_guest_signed_out'];

function decodeSession(value) {
  if (!value) return {};
  if (value.length > 1024) throw new Error('Invalid session');
  const data = JSON.parse(value);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid session');
  for (const [key, token] of Object.entries(data)) {
    if (!COOKIE_NAMES.includes(key) || typeof token !== 'string' || !/^[A-Za-z0-9_.-]{1,100}$/.test(token)) throw new Error('Invalid session');
  }
  return data;
}

/** A separate guest-only API. Never forwards hosted cookies or admin identity. */
export function createPagesBridge(handleGuest) {
  return async request => {
    const cors = { 'Access-Control-Allow-Origin': PAGES_ORIGIN, 'Access-Control-Expose-Headers': SESSION_HEADER, 'Cache-Control': 'no-store', Vary: 'Origin' };
    if (request.headers.get('origin') !== PAGES_ORIGIN) return Response.json({ error: 'Origin not allowed' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS', 'Access-Control-Allow-Headers': `Content-Type, ${SESSION_HEADER}`, 'Access-Control-Max-Age': '600' } });
    const resource = new URL(request.url).searchParams.get('resource');
    const operations = { 'GET:session': 'sessionGet', 'POST:session': 'sessionPost', 'PATCH:session': 'sessionPatch', 'DELETE:session': 'sessionDelete', 'GET:messages': 'messagesGet', 'POST:messages': 'messagesPost', 'DELETE:messages': 'messagesDelete' };
    const operation = operations[`${request.method}:${resource}`];
    if (!operation) return Response.json({ error: 'Unsupported operation' }, { status: 405, headers: cors });
    let session;
    try { session = decodeSession(request.headers.get(SESSION_HEADER)); }
    catch { return Response.json({ error: 'Invalid session' }, { status: 400, headers: cors }); }
    // Construct a fresh internal request after validating this dedicated boundary.
    // No caller-supplied identity, cookie, forwarding, or Origin headers survive.
    const headers = new Headers({ origin: new URL(request.url).origin, 'content-type': request.headers.get('content-type') ?? '', cookie: Object.entries(session).map(([key, value]) => `${key}=${value}`).join('; ') });
    const internal = new Request(request.url, { method: request.method, headers, ...(request.body ? { body: request.body, duplex: 'half' } : {}) });
    let result;
    try { result = await handleGuest(operation, internal); }
    catch { return Response.json({ error: 'ระบบยังไม่พร้อม กรุณาลองใหม่', recoverable: true }, { status: 503, headers: cors }); }
    for (const cookie of result.headers.getSetCookie()) {
      const pair = cookie.split(';', 1)[0];
      const equals = pair.indexOf('=');
      const key = pair.slice(0, equals);
      if (COOKIE_NAMES.includes(key)) session[key] = pair.slice(equals + 1);
    }
    const responseHeaders = new Headers(cors);
    responseHeaders.set('Content-Type', 'application/json');
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.set(SESSION_HEADER, JSON.stringify(session));
    return new Response(result.body, { status: result.status, headers: responseHeaders });
  };
}
