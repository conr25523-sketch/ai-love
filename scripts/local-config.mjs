import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const LOCAL_DB_ID = '00000000-0000-4000-8000-000000000001';
export function localPaths(root) {
  const runtime = path.join(root, '.moonmind-local');
  return { root, runtime, worker: path.join(runtime, 'worker'), config: path.join(runtime, 'worker', 'wrangler.json'), state: path.join(runtime, 'state') };
}

export function localWorkerConfig() {
  return {
    name: 'moonmind-local', main: '../../build/sites-worker.ts', compatibility_date: '2026-05-15', compatibility_flags: ['nodejs_compat'],
    vars: { MOONMIND_LOCAL_MODE: '1', ADMIN_USER_IDS: 'local_seedy', ADMIN_EMAILS: '', OPENAI_API_KEY: '', OPENAI_MODEL: '', AI_SETTINGS_ENCRYPTION_KEY: '' },
    d1_databases: [{ binding: 'DB', database_name: 'moonmind-local', database_id: LOCAL_DB_ID, migrations_dir: '../../drizzle' }],
  };
}

export function parseLocalArgs(args) {
  let port = 5173;
  let check = false;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--check') check = true;
    else if (args[index] === '--port' && /^\d+$/.test(args[index + 1] ?? '')) port = Number(args[++index]);
    else throw new Error('Supported local options: --port <1024-65535>, --check. External --host is not allowed.');
  }
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Local port must be between 1024 and 65535.');
  return { port, check };
}

export function localEnvironment(source = process.env) {
  const environment = { ...source };
  for (const key of Object.keys(environment)) {
    if (/^(?:OPENAI_|AI_SETTINGS_|ADMIN_|CLOUDFLARE_API_|CF_API_|CLOUDFLARE_INCLUDE_PROCESS_ENV$|CLOUDFLARE_VITE_)/.test(key)) delete environment[key];
  }
  return { ...environment, CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false', CLOUDFLARE_INCLUDE_PROCESS_ENV: 'false', CLOUDFLARE_CF_FETCH_ENABLED: 'false', WRANGLER_SEND_METRICS: 'false', WRANGLER_WRITE_LOGS: 'false' };
}

/** New isolated storage; never read, migrate or remove the old preview database. */
export function prepareLocalRuntime(root) {
  const paths = localPaths(root);
  mkdirSync(paths.worker, { recursive: true });
  const config = `${JSON.stringify(localWorkerConfig(), null, 2)}\n`;
  if (!existsSync(paths.config)) writeFileSync(paths.config, config, { flag: 'wx', mode: 0o600 });
  else if (readFileSync(paths.config, 'utf8') !== config) throw new Error('Local worker configuration differs from the safe generated configuration. Back it up and inspect it before restarting; it was not overwritten.');
  const vars = path.join(paths.worker, '.dev.vars');
  const empty = '# Local deterministic mode: intentionally no credentials.\n';
  if (!existsSync(vars)) writeFileSync(vars, empty, { flag: 'wx', mode: 0o600 });
  else if (readFileSync(vars, 'utf8') !== empty) throw new Error('The isolated local .dev.vars was changed. It was not read into the app or overwritten.');
  return paths;
}

export function allowLocalRequest({ host, remoteAddress, url = '/', origin, fetchSite }) {
  if (typeof host !== 'string' || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remoteAddress)) return false;
  try {
    const authority = new URL(`http://${host}`);
    if (!['localhost', '127.0.0.1'].includes(authority.hostname) || authority.username || authority.password || authority.pathname !== '/') return false;
    if (new URL(url, authority).origin !== authority.origin) return false;
    return (!origin || origin === authority.origin) && fetchSite !== 'cross-site';
  } catch { return false; }
}
