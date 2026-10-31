declare global {
  interface ImportMetaEnv { readonly VITE_MOONMIND_PAGES_BACKEND?: string }
}
const backend = import.meta.env.VITE_MOONMIND_PAGES_BACKEND;
const storageKey = 'moonmind:pages-session:v1';

export const homeUrl = backend ? '/ai-love/' : '/';
export const adminUrl = backend ? `${backend}/admin` : '/admin';

export async function chatFetch(url: string, options?: RequestInit): Promise<Response> {
  if (!backend) return fetch(url, options);
  if (!['/api/session', '/api/messages'].includes(url)) throw new Error('เปิดหน้าผู้ดูแลเพื่อใช้เมนูนี้');
  let saved: string | null;
  try { saved = localStorage.getItem(storageKey); }
  catch { throw new Error('กรุณาอนุญาตการเก็บข้อมูลเว็บไซต์เพื่อเก็บประวัติบนเบราว์เซอร์นี้'); }
  const headers = new Headers(options?.headers);
  if (saved) headers.set('X-Moonmind-Session', saved);
  const response = await fetch(`${backend}/api/pages?resource=${url.split('/').at(-1)}`, { ...options, headers, credentials: 'omit', mode: 'cors' });
  const next = response.headers.get('X-Moonmind-Session');
  if (next) localStorage.setItem(storageKey, next);
  return response;
}
