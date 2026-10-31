import { parseResponseText } from './ai-provider.mjs';

type SettingsEnv = { DB?: D1Database; AI_SETTINGS_ENCRYPTION_KEY?: string; OPENAI_API_KEY?: string; OPENAI_MODEL?: string };
type Stored = { encrypted_key: string; model: string; updated_at: number };
type Identity = { userId: string; email: string } | null;
export type ProviderSettings = { apiKey?: string; model?: string };
const AAD = new TextEncoder().encode('moonmind:openai-settings:v1');
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
class SettingsError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

async function encryptionKey(secret?: string) {
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) throw new SettingsError(503, 'ระบบเก็บคีย์ยังไม่พร้อม กรุณาลองใหม่ภายหลัง');
  const raw = Uint8Array.from(secret.match(/../g)!, hex => parseInt(hex, 16));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptAPIKey(value: string, secret?: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: AAD }, await encryptionKey(secret), new TextEncoder().encode(value)));
  const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
  return `v1.${encode(iv)}.${encode(ciphertext)}`;
}

export async function decryptAPIKey(value: string, secret?: string): Promise<string> {
  const [version, iv, ciphertext, extra] = value.split('.');
  if (version !== 'v1' || !iv || !ciphertext || extra || value.length > 1400) throw new Error('Invalid encrypted settings');
  const decode = (encoded: string) => Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(iv), additionalData: AAD }, await encryptionKey(secret), decode(ciphertext));
  return new TextDecoder().decode(plaintext);
}

async function saved(settings: SettingsEnv): Promise<Stored | null> {
  return settings.DB ? settings.DB.prepare("SELECT encrypted_key, model, updated_at FROM ai_settings WHERE id = 'openai'").first<Stored>() : null;
}

/** Server-only: callers expose mode, never this configuration. No isolate cache after key changes. */
export async function resolveProviderSettings(settings: SettingsEnv): Promise<ProviderSettings> {
  const row = await saved(settings);
  if (row) return { apiKey: await decryptAPIKey(row.encrypted_key, settings.AI_SETTINGS_ENCRYPTION_KEY), model: row.model };
  return { apiKey: settings.OPENAI_API_KEY, model: settings.OPENAI_MODEL };
}

async function readBody(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new SettingsError(403, 'คำขอต้องมาจากเว็บไซต์เดียวกัน');
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new SettingsError(415, 'รูปแบบข้อมูลไม่ถูกต้อง');
  if (Number(request.headers.get('content-length')) > 4096) throw new SettingsError(413, 'ข้อมูลยาวเกินกำหนด');
  const reader = request.body?.getReader();
  if (!reader) throw new SettingsError(400, 'กรุณาระบุคีย์และโมเดล');
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const part = await reader.read(); if (part.done) break;
    size += part.value.length;
    if (size > 4096) { await reader.cancel(); throw new SettingsError(413, 'ข้อมูลยาวเกินกำหนด'); }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (data && typeof data === 'object' && !Array.isArray(data)) return data as Record<string, unknown>;
  } catch { /* Never echo credential-bearing bodies or parser errors. */ }
  throw new SettingsError(400, 'รูปแบบข้อมูลไม่ถูกต้อง');
}

/** One short synthetic Responses request checks credentials and actual generation access. */
export async function verifyProvider(config: ProviderSettings, fetchImpl: typeof fetch = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model: config.model, input: 'Reply with only OK.', max_output_tokens: 1024, store: false }),
    });
    if (!response.ok) {
      const messages: Record<number, string> = {
        401: 'คีย์ไม่ถูกต้องหรือหมดอายุ กรุณาตรวจสอบคีย์',
        403: 'คีย์นี้ไม่มีสิทธิ์ใช้โมเดลที่เลือก',
        404: 'ไม่พบโมเดลนี้หรือบัญชียังไม่มีสิทธิ์ใช้งาน',
        429: 'บัญชี API อาจมีเครดิตไม่พอหรือถึงขีดจำกัด กรุณาตรวจสอบบัญชีแล้วลองใหม่',
        400: 'โมเดลนี้ยังใช้กับการตอบแชทนี้ไม่ได้ กรุณาตรวจสอบชื่อโมเดล',
      };
      throw new SettingsError(422, messages[response.status] ?? 'OpenAI ยังไม่พร้อมให้บริการ กรุณาลองใหม่');
    }
    parseResponseText(await response.json());
  } catch (error) {
    if (error instanceof SettingsError) throw error;
    throw new SettingsError(502, 'ตรวจสอบการเชื่อมต่อไม่สำเร็จ กรุณาลองใหม่');
  } finally { clearTimeout(timer); }
}

export async function handleAISettings(request: Request, settings: SettingsEnv, identity: Identity, adminIds: string[], fetchImpl: typeof fetch = fetch): Promise<Response> {
  const reply = (data: unknown, status = 200) => Response.json(data, { status, headers });
  try {
    if (!identity) throw new SettingsError(401, 'กรุณาเข้าสู่ระบบผู้ดูแล');
    if (!adminIds.includes(identity.userId)) throw new SettingsError(403, 'ไม่มีสิทธิ์ตั้งค่า AI');
    if (!settings.DB) throw new SettingsError(503, 'ระบบบันทึกข้อมูลยังไม่พร้อม');
    if (request.method === 'GET') {
      const row = await saved(settings);
      return reply({ configured: Boolean(row || (settings.OPENAI_API_KEY && settings.OPENAI_MODEL)), model: row?.model ?? settings.OPENAI_MODEL ?? '', updatedAt: row?.updated_at ?? null, ready: Boolean(settings.AI_SETTINGS_ENCRYPTION_KEY) });
    }
    if (request.method !== 'POST') return reply({ error: 'ไม่รองรับคำขอนี้' }, 405);
    const data = await readBody(request);
    const apiKey = typeof data.apiKey === 'string' ? data.apiKey.trim() : '';
    const model = typeof data.model === 'string' ? data.model.trim() : '';
    if (!/^sk-[A-Za-z0-9_-]{20,509}$/.test(apiKey)) throw new SettingsError(400, 'กรุณาใส่ OpenAI API key ที่ถูกต้อง');
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,149}$/.test(model)) throw new SettingsError(400, 'กรุณาระบุชื่อโมเดลที่ถูกต้อง');
    const encrypted = await encryptAPIKey(apiKey, settings.AI_SETTINGS_ENCRYPTION_KEY);
    await verifyProvider({ apiKey, model }, fetchImpl);
    const updatedAt = Date.now();
    await settings.DB.prepare("INSERT INTO ai_settings (id, encrypted_key, model, updated_at) VALUES ('openai', ?, ?, ?) ON CONFLICT(id) DO UPDATE SET encrypted_key = excluded.encrypted_key, model = excluded.model, updated_at = excluded.updated_at").bind(encrypted, model, updatedAt).run();
    return reply({ configured: true, model, updatedAt });
  } catch (error) {
    const safe = error instanceof SettingsError ? error : new SettingsError(503, 'บันทึกการตั้งค่าไม่สำเร็จ กรุณาลองใหม่');
    return reply({ error: safe.message }, safe.status);
  }
}
