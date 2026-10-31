import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../chatgpt-auth";
import { createBackend } from "../../lib/backend";
import { generateProviderReply, getProviderMode } from "../../lib/ai-provider.mjs";
import { resolveProviderSettings } from "../../lib/ai-settings";
import { configuredAdminIds } from "../../lib/admin-access";
import { localRuntimeEnabled } from "../../lib/local-runtime";
import { resolveVisitorSession, logoutVisitor, visitorIsSignedOut, selectedVisitorId, signInVisitor } from "../../lib/visitor-session";

export async function handle(operation: string, request: Request) {
  // Guest logout must work even when storage or the AI provider is unavailable.
  if (operation === "sessionDelete") {
    const identity = await getChatGPTUser();
    if (identity) return Response.json({ error: "กรุณาออกจากระบบผ่านบัญชีที่ล็อกอิน" }, { status: 409, headers: { "Cache-Control": "no-store" } });
    return logoutVisitor(request);
  }
  const settings = env as Cloudflare.Env;
  const localMode = localRuntimeEnabled(request, settings.MOONMIND_LOCAL_MODE);
  if (!settings.DB) return Response.json({ error: "ระบบบันทึกข้อมูลยังไม่พร้อม กรุณาลองใหม่", recoverable: true }, { status: 503, headers: { "Cache-Control": "no-store" } });
  const identity = await getChatGPTUser();
  const visitor = !identity && !operation.startsWith("admin")
    ? await resolveVisitorSession(request, { allowCreate: operation === "sessionGet" })
    : null;
  let provider;
  try { provider = localMode ? {} : await resolveProviderSettings(settings); }
  catch { return Response.json({ error: "การตั้งค่า AI ยังไม่พร้อม กรุณาลองใหม่", recoverable: true }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
  const signedOut = !identity && visitorIsSignedOut(request);
  if (operation === "sessionGet" && signedOut) {
    const response = Response.json({ user: null, isAdmin: false, authenticated: false, localMode, mode: getProviderMode(provider) }, { headers: { "Cache-Control": "no-store" } });
    if (visitor?.setCookie) response.headers.append("Set-Cookie", visitor.setCookie);
    return response;
  }
  const guestId = visitor ? await selectedVisitorId(request, visitor.userId) : null;
  const db = settings.DB;
  let signInCookies: string[] = [];
  const response = await createBackend({
    db,
    getUserId: async () => identity?.userId ?? (signedOut ? null : guestId),
    ...(!identity && visitor ? { resolveProfileId: async (name: string) => {
      const legacy = await db.prepare("SELECT name FROM profiles WHERE id = ?").bind(visitor.userId).first<{ name: string }>();
      const entry = await signInVisitor(request, visitor.userId, name, legacy?.name ?? null);
      signInCookies = entry.cookies;
      return entry.userId;
    } } : {}),
    adminIds: identity ? configuredAdminIds(identity, settings.ADMIN_USER_IDS, settings.ADMIN_EMAILS) : [],
    mode: () => getProviderMode(provider),
    reply: input => generateProviderReply(input, provider),
  }).handle(operation, request);
  if (visitor?.setCookie) response.headers.append("Set-Cookie", visitor.setCookie);
  if (operation === "sessionPost" && response.ok) {
    for (const cookie of signInCookies) response.headers.append("Set-Cookie", cookie);
  }
  if (operation.startsWith("session") && response.ok) {
    const data = await response.json() as Record<string, unknown>;
    return Response.json({ ...data, authenticated: Boolean(identity), localMode }, { status: response.status, headers: response.headers });
  }
  return response;
}
