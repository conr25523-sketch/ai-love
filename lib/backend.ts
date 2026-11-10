import { formatReplyLines } from "../core/reply-layout.mjs";
import { requestedAnswerReply } from "../core/requested-answer.mjs";
import { FIRST_TAROT_INVITATION } from "../core/symbolic-cards.mjs";
import { cardChoiceReply } from "../core/reading-flow.mjs";

export type Message = { id: string; role: "user" | "assistant"; content: string; createdAt: number };
type Profile = { id: string; name: string; consent_admin: number };
type SavedRequest = { status: string; content: string; number: number | null; lock_token: string; mode: "demo" | "ai" | null; attempts: number };
export type BackendDependencies = {
  db: D1Database;
  getUserId: () => Promise<string | null>;
  resolveProfileId?: (name: string) => Promise<string>;
  adminIds: string[];
  mode: () => "demo" | "ai";
  reply: (input: { text: string; recentMessages: Message[]; learningMessages: Message[]; name: string }) => Promise<{ content: string; mode: "demo" | "ai" }>;
  now?: () => number;
};
class ApiError extends Error {
  status: number;
  recoverable: boolean;
  constructor(status: number, message: string, recoverable = false) { super(message); this.status = status; this.recoverable = recoverable; }
}

/** Framework independent so security and actual SQL are testable against SQLite. */
export function createBackend(deps: BackendDependencies) {
  const now = deps.now ?? Date.now;
  const statement = (sql: string, ...values: (string | number | null)[]) => deps.db.prepare(sql).bind(...values);
  const first = <T>(sql: string, ...values: (string | number | null)[]) => statement(sql, ...values).first<T>();
  const all = async <T>(sql: string, ...values: (string | number | null)[]) => (await statement(sql, ...values).all<T>()).results;
  const profile = (id: string) => first<Profile>("SELECT id, name, consent_admin FROM profiles WHERE id = ?", id);
  const identity = async () => {
    const id = await deps.getUserId();
    if (!id) throw new ApiError(401, "เปิดหน้าเว็บอีกครั้งและอนุญาตคุกกี้เพื่อใช้แชท");
    return id;
  };
  const requireProfile = async (id: string) => {
    const user = await profile(id);
    if (!user) throw new ApiError(409, "กรุณาใส่ชื่อและยอมรับการบันทึกบทสนทนาก่อน");
    return user;
  };
  const isAdmin = (id: string) => deps.adminIds.includes(id);
  const requireAdmin = async () => {
    const id = await identity();
    if (!isAdmin(id)) throw new ApiError(403, "ไม่มีสิทธิ์เข้าถึงประวัติผู้ใช้อื่น");
  };
  const session = async (id: string) => {
    const user = await profile(id);
    return { user: user ? { id: user.id, name: user.name, consentAdmin: Boolean(user.consent_admin) } : null, isAdmin: isAdmin(id), mode: deps.mode() };
  };
  const recentMessages = (id: string) => all<Message>(
    "SELECT id, role, content, created_at AS createdAt FROM (SELECT rowid AS ordering, * FROM messages WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 200) ORDER BY created_at ASC, ordering ASC", id,
  );
  // Derive memory only from this authenticated caller's own persisted user messages.
  // Assistant guesses and request-body memory fields are never learning sources.
  const learningMessages = (id: string) => all<Message>(
    "SELECT id, role, content, created_at AS createdAt FROM (SELECT rowid AS ordering, * FROM messages WHERE user_id = ? AND role = 'user' ORDER BY created_at DESC, rowid DESC LIMIT 200) ORDER BY created_at ASC, ordering ASC", id,
  );
  async function body(request: Request) {
    if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") throw new ApiError(403, "คำขอนี้ไม่ได้มาจากเว็บไซต์เดียวกัน");
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new ApiError(415, "กรุณาส่งข้อมูลแบบ JSON");
    if (Number(request.headers.get("content-length")) > 24000) throw new ApiError(413, "ข้อมูลยาวเกินกำหนด");
    const reader = request.body?.getReader();
    if (!reader) throw new ApiError(400, "ไม่มีข้อมูลในคำขอ");
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > 24000) { await reader.cancel(); throw new ApiError(413, "ข้อมูลยาวเกินกำหนด"); }
      chunks.push(chunk.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let parsed: unknown;
    try { parsed = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new ApiError(400, "JSON ไม่ถูกต้อง"); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new ApiError(400, "ข้อมูลไม่ถูกต้อง");
    return parsed as Record<string, unknown>;
  }
  async function handle(operation: string, request: Request): Promise<Response> {
    try {
      return Response.json(await execute(operation, request), { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    } catch (error) {
      const api = error instanceof ApiError ? error : new ApiError(503, "ระบบบันทึกข้อมูลยังไม่พร้อม กรุณาลองใหม่", true);
      return Response.json({ error: api.message, recoverable: api.recoverable }, { status: api.status, headers: { "Cache-Control": "no-store", ...(api.status === 429 ? { "Retry-After": "60" } : {}) } });
    }
  }
  async function execute(operation: string, request: Request): Promise<unknown> {
    if (operation === "adminUsers") {
      await requireAdmin();
      const users = await all<{ id: string; name: string; updatedAt: number; messageCount: number }>("SELECT p.id, p.name, p.updated_at AS updatedAt, (SELECT COUNT(*) FROM messages m WHERE m.user_id = p.id) AS messageCount FROM profiles p WHERE p.consent_admin = 1 ORDER BY p.updated_at DESC LIMIT 200");
      return { users: users.map(user => ({ ...user, canDelete: !isAdmin(user.id) })) };
    }
    if (operation === "adminUsersDelete") {
      await requireAdmin();
      if (request.method !== "DELETE") throw new ApiError(405, "กรุณาใช้คำขอลบบัญชี");
      const data = await body(request);
      const id = typeof data.userId === "string" ? data.userId : "";
      if (!id || id.length > 200 || typeof data.confirmName !== "string" || data.confirmed !== true) throw new ApiError(400, "กรุณายืนยันชื่อและบัญชีที่ต้องการลบ");
      if (isAdmin(id)) throw new ApiError(403, "ไม่สามารถลบบัญชีผู้ดูแลผ่านหน้าประวัติได้");
      const target = await first<Profile>("SELECT id, name, consent_admin FROM profiles WHERE id = ? AND consent_admin = 1", id);
      if (!target) throw new ApiError(404, "ไม่พบบัญชีที่ได้รับอนุญาตให้จัดการ");
      if (data.confirmName !== target.name) throw new ApiError(409, "ชื่อผู้ใช้เปลี่ยนไปแล้ว กรุณาโหลดรายชื่อและยืนยันใหม่");
      // One atomic delete: schema-owned foreign keys cascade to messages and
      // pending/completed requests. A revoked or renamed profile is not deleted.
      // D1's change count includes cascaded rows; RETURNING confirms the
      // selected profile itself was deleted without relying on that count.
      const deleted = await first<{ id: string }>("DELETE FROM profiles WHERE id = ? AND name = ? AND consent_admin = 1 RETURNING id", id, target.name);
      if (!deleted) throw new ApiError(409, "บัญชีหรือความยินยอมเปลี่ยนไปแล้ว กรุณาโหลดรายชื่อใหม่");
      return { deletedUserId: id };
    }
    if (operation === "adminMessages") {
      await requireAdmin();
      const id = new URL(request.url).searchParams.get("userId");
      if (!id || id.length > 200) throw new ApiError(400, "กรุณาระบุผู้ใช้");
      const user = await first<Profile>("SELECT id, name, consent_admin FROM profiles WHERE id = ? AND consent_admin = 1", id);
      if (!user) throw new ApiError(404, "ไม่พบประวัติที่ได้รับความยินยอม");
      return { name: user.name, messages: await all<Message>("SELECT id, role, content, created_at AS createdAt FROM messages WHERE user_id = ? AND EXISTS (SELECT 1 FROM profiles WHERE id = ? AND consent_admin = 1) ORDER BY created_at ASC, rowid ASC LIMIT 1000", id, id) };
    }
    if (operation === "sessionPost") {
      const callerId = deps.resolveProfileId ? null : await identity();
      const data = await body(request);
      const name = typeof data.name === "string" ? data.name.trim() : "";
      if (!name || name.length > 60 || /[\u0000-\u001f]/u.test(name) || data.consent !== true || typeof data.consentAdmin !== "boolean") throw new ApiError(400, "ระบุชื่อไม่เกิน 60 ตัวอักษรและยินยอมให้บันทึกบทสนทนา");
      const id = deps.resolveProfileId ? await deps.resolveProfileId(name) : callerId!;
      const time = now();
      const existing = await profile(id);
      const saveProfile = statement("INSERT INTO profiles (id, name, consent_admin, consent_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, consent_admin = excluded.consent_admin, consent_at = excluded.consent_at, updated_at = excluded.updated_at", id, name, data.consentAdmin ? 1 : 0, time, time, time);
      if (existing) await saveProfile.run();
      else {
        // Save the first spread only after consent, together with the profile.
        // The internal request ID cannot be supplied through messagesPost.
        await deps.db.batch([
          saveProfile,
          statement("INSERT INTO messages (id, user_id, request_id, role, content, created_at) SELECT ?, ?, 'system:initial-tarot', 'assistant', ?, ? WHERE NOT EXISTS (SELECT 1 FROM messages WHERE user_id = ?) ON CONFLICT(user_id, request_id, role) DO NOTHING", crypto.randomUUID(), id, FIRST_TAROT_INVITATION, time, id),
        ]);
      }
      return session(id);
    }
    const id = await identity();
    if (operation === "sessionGet") return session(id);
    const user = await requireProfile(id);
    if (operation === "sessionPatch") {
      const data = await body(request);
      if (typeof data.consentAdmin !== "boolean") throw new ApiError(400, "กรุณาระบุความยินยอม");
      await statement("UPDATE profiles SET consent_admin = ?, updated_at = ? WHERE id = ?", data.consentAdmin ? 1 : 0, now(), id).run();
      return session(id);
    }
    if (operation === "messagesGet") return { messages: await recentMessages(id), mode: deps.mode() };
    if (operation === "messagesDelete") {
      await body(request);
      await deps.db.batch([statement("DELETE FROM messages WHERE user_id = ?", id), statement("DELETE FROM requests WHERE user_id = ?", id), statement("UPDATE profiles SET updated_at = ? WHERE id = ?", now(), id)]);
      return { messages: [], mode: deps.mode() };
    }
    if (operation !== "messagesPost") throw new ApiError(404, "ไม่พบคำขอ");
    const data = await body(request);
    const content = typeof data.content === "string" ? data.content.trim() : "";
    const requestId = typeof data.requestId === "string" ? data.requestId : "";
    if (!content || content.length > 4000 || !/^[A-Za-z0-9_-]{8,80}$/.test(requestId)) throw new ApiError(400, "ข้อความต้องมี 1–4,000 ตัวอักษรและมีหมายเลขคำขอที่ถูกต้อง");
    if (data.number !== undefined) throw new ApiError(400, "กรุณาเริ่มแชทโดยส่งข้อความอย่างเดียว");
    const number = null; // Legacy column retained for existing saved requests.
    const getRequest = () => first<SavedRequest>("SELECT status, content, number, lock_token, mode, attempts FROM requests WHERE user_id = ? AND id = ?", id, requestId);
    const requestMessages = () => all<Message>("SELECT id, role, content, created_at AS createdAt FROM messages WHERE user_id = ? AND request_id = ? ORDER BY created_at, rowid", id, requestId);
    const existing = await getRequest();
    if (existing && (existing.content !== content || existing.number !== number)) throw new ApiError(409, "หมายเลขคำขอนี้ใช้กับข้อความอื่นแล้ว");
    if (existing?.status === "completed") return { messages: await requestMessages(), mode: existing.mode ?? deps.mode(), requestId };
    const time = now();
    const token = crypto.randomUUID();
    // Batch is transactional; the conditional statements acquire one pending request per user.
    await deps.db.batch([
      statement("INSERT INTO requests (id, user_id, content, number, status, lock_token, attempts, created_at, updated_at) SELECT ?, ?, ?, ?, 'pending', ?, 1, ?, ? WHERE NOT EXISTS (SELECT 1 FROM requests WHERE user_id = ? AND status = 'pending' AND updated_at > ?) AND (SELECT COALESCE(SUM(attempts), 0) FROM requests WHERE user_id = ? AND updated_at > ?) < 20 AND (SELECT COUNT(*) FROM messages WHERE user_id = ?) < 1000 ON CONFLICT(user_id, id) DO NOTHING", requestId, id, content, number, token, time, time, id, time - 180000, id, time - 3600000, id),
      statement("UPDATE requests SET status = 'pending', lock_token = ?, attempts = attempts + 1, updated_at = ? WHERE user_id = ? AND id = ? AND content = ? AND number IS ? AND attempts < 5 AND (status = 'failed' OR (status = 'pending' AND updated_at <= ?)) AND NOT EXISTS (SELECT 1 FROM requests WHERE user_id = ? AND id <> ? AND status = 'pending' AND updated_at > ?) AND (SELECT COALESCE(SUM(attempts), 0) FROM requests WHERE user_id = ? AND updated_at > ?) < 20", token, time, id, requestId, content, number, time - 180000, id, requestId, time - 180000, id, time - 3600000),
      statement("INSERT INTO messages (id, user_id, request_id, role, content, created_at) SELECT ?, ?, ?, 'user', ?, ? WHERE EXISTS (SELECT 1 FROM requests WHERE user_id = ? AND id = ? AND lock_token = ? AND status = 'pending') ON CONFLICT(user_id, request_id, role) DO NOTHING", crypto.randomUUID(), id, requestId, content, time, id, requestId, token),
      statement("UPDATE profiles SET updated_at = ? WHERE id = ? AND EXISTS (SELECT 1 FROM requests WHERE user_id = ? AND id = ? AND lock_token = ?)", time, id, id, requestId, token),
    ]);
    const acquired = await getRequest();
    if (acquired && (acquired.content !== content || acquired.number !== number)) throw new ApiError(409, "หมายเลขคำขอนี้ใช้กับข้อความอื่นแล้ว");
    if (acquired?.status === "completed") return { messages: await requestMessages(), mode: acquired.mode ?? deps.mode(), requestId };
    if (!acquired || acquired.lock_token !== token) {
      if (acquired?.status === "pending") throw new ApiError(409, "กำลังตอบข้อความนี้ กรุณาลองคำขอเดิมอีกครั้ง", true);
      if (acquired && acquired.attempts >= 5) throw new ApiError(429, "ลองข้อความนี้ครบจำนวนครั้งแล้ว กรุณาส่งข้อความใหม่");
      throw new ApiError(429, "กรุณาพักสักครู่ก่อนส่งข้อความอีกครั้ง หรือลบประวัติเมื่อเต็ม", true);
    }
    let reply: { content: string; mode: "demo" | "ai" };
    try {
      const [recent, learning] = await Promise.all([recentMessages(id), learningMessages(id)]);
      // This caller's bounded saved dialogue also carries the selected card.
      // The provider bounds ordinary conversational history independently.
      reply = await deps.reply({ text: content, recentMessages: recent, learningMessages: learning, name: user.name });
      if (!reply.content.trim() || reply.content.length > 16000 || !["demo", "ai"].includes(reply.mode)) throw new Error("Invalid provider response");
      // The demo can use the caller's saved user statements beyond the recent
      // twenty-message chat window. Guesses stay replies, never profile facts.
      if (reply.mode === "demo") {
        const previous = recent.at(-1)?.role === "user" && recent.at(-1)?.content === content ? recent.slice(-20, -1) : recent.slice(-20);
        // Preserve persisted invitation IDs for the same spread in server + UI.
        const selectedCard = /^เราเลือกไพ่ใบที่\s*[1-3]/u.test(content) ? cardChoiceReply(content, previous) : null;
        reply = { ...reply, content: selectedCard ?? requestedAnswerReply(content, previous, { userStatements: learning }) ?? reply.content };
      }
      reply = { ...reply, content: formatReplyLines(reply.content, { text: content, messages: recent.slice(-20) }) };
      if (reply.content.length > 16000) throw new Error("Formatted response exceeds storage limit");
    } catch {
      await statement("UPDATE requests SET status = 'failed', updated_at = ? WHERE user_id = ? AND id = ? AND lock_token = ? AND status = 'pending'", now(), id, requestId, token).run();
      throw new ApiError(502, "ตอบข้อความไม่สำเร็จ ข้อความของคุณบันทึกแล้ว กรุณาลองคำขอเดิมอีกครั้ง", true);
    }
    const completedAt = now();
    await deps.db.batch([
      statement("INSERT INTO messages (id, user_id, request_id, role, content, created_at) SELECT ?, ?, ?, 'assistant', ?, ? WHERE EXISTS (SELECT 1 FROM requests WHERE user_id = ? AND id = ? AND lock_token = ? AND status = 'pending') ON CONFLICT(user_id, request_id, role) DO NOTHING", crypto.randomUUID(), id, requestId, reply.content, completedAt, id, requestId, token),
      statement("UPDATE requests SET status = 'completed', mode = ?, updated_at = ? WHERE user_id = ? AND id = ? AND lock_token = ? AND status = 'pending'", reply.mode, completedAt, id, requestId, token),
      statement("UPDATE profiles SET updated_at = ? WHERE id = ? AND EXISTS (SELECT 1 FROM requests WHERE user_id = ? AND id = ? AND lock_token = ?)", completedAt, id, id, requestId, token),
    ]);
    if ((await getRequest())?.lock_token !== token) throw new ApiError(409, "บทสนทนาเปลี่ยนแปลงแล้ว กรุณาโหลดประวัติใหม่", true);
    return { messages: await requestMessages(), mode: reply.mode, requestId };
  }
  return { handle };
}
