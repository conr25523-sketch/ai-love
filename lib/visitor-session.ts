export const VISITOR_COOKIE_NAME = "moonmind_visitor";
export const VISITOR_COOKIE_MAX_AGE = 180 * 24 * 60 * 60;
export const VISITOR_PROFILE_COOKIE = "moonmind_guest_profile";
export const VISITOR_LOGOUT_COOKIE = "moonmind_guest_signed_out";

export type VisitorSession = { userId: string; setCookie?: string };

function cookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header || header.length > 16384) return null;
  const values = header.split(";").map(part => part.trim()).filter(part => part.split("=", 1)[0].trim() === name);
  if (values.length !== 1) return null;
  return values[0].slice(values[0].indexOf("=") + 1);
}

function guestCookie(request: Request, name: string, value: string): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${name}=${value}; Max-Age=${VISITOR_COOKIE_MAX_AGE}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function visitorIsSignedOut(request: Request): boolean {
  return cookie(request, VISITOR_LOGOUT_COOKIE) === "1";
}

function canonicalName(name: string): string {
  return name.normalize("NFKC").trim().toLowerCase();
}

async function hash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

/** Every nickname is scoped to this browser's secret, never a global lookup. */
async function scopedProfileId(browserId: string, selector: string): Promise<string> {
  return `guest:${await hash(`moonmind:profile:${browserId}:${selector}`)}`;
}

export async function selectedVisitorId(request: Request, browserId: string): Promise<string> {
  const selector = cookie(request, VISITOR_PROFILE_COOKIE);
  return selector && /^[a-f0-9]{64}$/.test(selector) ? scopedProfileId(browserId, selector) : browserId;
}

/** Preserve the legacy profile when its owner returns with the same nickname. */
export async function signInVisitor(request: Request, browserId: string, name: string, legacyName: string | null): Promise<{ userId: string; cookies: string[] }> {
  const selector = legacyName !== null && canonicalName(legacyName) === canonicalName(name)
    ? "legacy" : await hash(`moonmind:nickname:${canonicalName(name)}`);
  return {
    userId: selector === "legacy" ? browserId : await scopedProfileId(browserId, selector),
    cookies: [guestCookie(request, VISITOR_PROFILE_COOKIE, selector), guestCookie(request, VISITOR_LOGOUT_COOKIE, "0")],
  };
}

/** Hide guest chat until name-based re-entry; keep its private browser identity. */
export function logoutVisitor(request: Request): Response {
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (request.method !== "DELETE") {
    return Response.json({ error: "คำขอนี้ไม่รองรับ" }, { status: 405, headers: { ...headers, Allow: "DELETE" } });
  }
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({ error: "คำขอนี้ไม่ได้มาจากเว็บไซต์เดียวกัน" }, { status: 403, headers });
  }
  return Response.json({ loggedOut: true }, { headers: {
    ...headers,
    "Set-Cookie": guestCookie(request, VISITOR_LOGOUT_COOKIE, "1"),
  } });
}

// A canonical base64url encoding of 32 random bytes has 43 characters.
// The last character is restricted because only four bits remain.
const TOKEN_PATTERN = /^v1\.[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;

function readToken(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header || header.length > 16384) return null;
  const matches: string[] = [];
  for (const part of header.split(";")) {
    const cookie = part.trim();
    const equals = cookie.indexOf("=");
    if (equals < 0) {
      if (cookie === VISITOR_COOKIE_NAME) matches.push("");
      continue;
    }
    if (cookie.slice(0, equals).trim() === VISITOR_COOKIE_NAME) matches.push(cookie.slice(equals + 1));
  }
  // Ambiguous cookies must never select an existing visitor's history.
  if (matches.length !== 1 || !TOKEN_PATTERN.test(matches[0])) return null;
  return matches[0];
}

function mintToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const binary = String.fromCharCode(...bytes);
  return `v1.${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

/** A browser's bearer cookie identifies its own history; names never grant access. */
export function resolveVisitorSession(request: Request): Promise<VisitorSession>;
export function resolveVisitorSession(request: Request, options: { allowCreate?: boolean }): Promise<VisitorSession | null>;
export async function resolveVisitorSession(request: Request, options: { allowCreate?: boolean } = {}): Promise<VisitorSession | null> {
  const existing = readToken(request);
  if (!existing && options.allowCreate === false) return null;
  const token = existing ?? mintToken();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`moonmind:visitor:${token}`));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const userId = `guest:${hash}`;
  if (existing) return { userId };
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return { userId, setCookie: `${VISITOR_COOKIE_NAME}=${token}; Max-Age=${VISITOR_COOKIE_MAX_AGE}; Path=/; HttpOnly; SameSite=Lax${secure}` };
}
