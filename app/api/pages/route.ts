import { env } from 'cloudflare:workers';
import { createPagesBridge } from '../../../lib/pages-bridge.mjs';
import { createBackend } from '../../../lib/backend';
import { generateProviderReply } from '../../../lib/ai-provider.mjs';
import { logoutVisitor, resolveVisitorSession, selectedVisitorId, signInVisitor, visitorIsSignedOut } from '../../../lib/visitor-session';

const handle = createPagesBridge(async (operation: string, request: Request) => {
  if (operation === 'sessionDelete') return logoutVisitor(request);
  const db = (env as Cloudflare.Env).DB;
  if (!db) return Response.json({ error: 'ระบบบันทึกข้อมูลยังไม่พร้อม' }, { status: 503 });
  const visitor = await resolveVisitorSession(request, { allowCreate: operation === 'sessionGet' });
  const signedOut = visitorIsSignedOut(request);
  if (operation === 'sessionGet' && signedOut) {
    const response = Response.json({ user: null, isAdmin: false, authenticated: false, localMode: false, mode: 'demo' });
    if (visitor?.setCookie) response.headers.append('Set-Cookie', visitor.setCookie);
    return response;
  }
  const userId = visitor ? await selectedVisitorId(request, visitor.userId) : null;
  let signInCookies: string[] = [];
  const response = await createBackend({
    db,
    getUserId: async () => signedOut ? null : userId,
    ...(visitor ? { resolveProfileId: async (name: string) => {
      const legacy = await db.prepare('SELECT name FROM profiles WHERE id = ?').bind(visitor.userId).first<{ name: string }>();
      const entry = await signInVisitor(request, visitor.userId, name, legacy?.name ?? null);
      signInCookies = entry.cookies;
      return entry.userId;
    } } : {}),
    adminIds: [],
    mode: () => 'demo',
    reply: input => generateProviderReply(input, {}),
  }).handle(operation, request);
  if (visitor?.setCookie) response.headers.append('Set-Cookie', visitor.setCookie);
  for (const cookie of signInCookies) if (response.ok) response.headers.append('Set-Cookie', cookie);
  if (operation.startsWith('session') && response.ok) {
    const data = await response.json() as Record<string, unknown>;
    return Response.json({ ...data, authenticated: false, localMode: false }, { status: response.status, headers: response.headers });
  }
  return response;
});

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
export const PATCH = handle;
export const OPTIONS = handle;
