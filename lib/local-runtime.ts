/** Dedicated local config plus compile-time DEV check; never a public auth bypass. */
export function localRuntimeEnabled(request: Request, marker?: string, development = import.meta.env.DEV): boolean {
  if (!development || marker !== '1') return false;
  try { return ['localhost', '127.0.0.1'].includes(new URL(request.url).hostname); }
  catch { return false; }
}
