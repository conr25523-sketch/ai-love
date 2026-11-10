import { spawnSync } from 'node:child_process';
import { existsSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { localEnvironment, parseLocalArgs, prepareLocalRuntime } from './local-config.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
try {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Use Node.js 24 or later for the local runtime.');
  const { port, check } = parseLocalArgs(process.argv.slice(2));
  if (!existsSync(path.join(root, 'vite.local.config.ts'))) throw new Error('Local configuration is missing: restore vite.local.config.ts before starting.');
  const wrangler = path.join(root, 'node_modules/wrangler/bin/wrangler.js');
  if (!existsSync(wrangler) || !existsSync(path.join(root, 'node_modules/vite/bin/vite.js'))) throw new Error('Dependencies are missing. Run npm ci in this checkout first.');
  const paths = prepareLocalRuntime(root);
  const environment = localEnvironment(process.env);
  Object.assign(environment, { WRANGLER_LOG_PATH: path.join(paths.runtime, 'logs'), WRANGLER_REGISTRY_PATH: path.join(paths.runtime, 'registry'), MINIFLARE_REGISTRY_PATH: path.join(paths.runtime, 'registry'), MOONMIND_LOCAL_PORT: String(port) });
  // stdin is non-interactive: Wrangler applies only unapplied checked-in migrations.
  const migration = spawnSync(process.execPath, [wrangler, 'd1', 'migrations', 'apply', 'DB', '--local', '--config', paths.config, '--persist-to', paths.state], { cwd: root, env: environment, stdio: ['ignore', 'inherit', 'inherit'] });
  if (migration.error) throw migration.error;
  if (migration.status !== 0) throw new Error('Local database bootstrap failed. Existing database files were retained.');
  if (check) console.log('Local prerequisites and persistent database migrations are ready. No web server started.');
  else {
    Object.assign(process.env, environment);
    for (const key of Object.keys(process.env)) if (!(key in environment)) delete process.env[key];
    process.chdir(root);
    // The root index.html is the GitHub Pages build output (it points at /ai-love/pages-assets/...).
    // While it exists the dev server serves it at "/" instead of the app, so set it aside for this
    // run and put it back on exit. A hard kill leaves it held; the next start restores it first.
    const pagesIndex = path.join(root, 'index.html');
    const heldIndex = path.join(root, 'index.html.local-hold');
    if (existsSync(heldIndex) && !existsSync(pagesIndex)) renameSync(heldIndex, pagesIndex);
    if (existsSync(pagesIndex)) {
      renameSync(pagesIndex, heldIndex);
      const restore = () => { try { if (existsSync(heldIndex) && !existsSync(pagesIndex)) renameSync(heldIndex, pagesIndex); } catch { /* best effort */ } };
      process.on('exit', restore);
      for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => process.exit(0));
    }
    process.argv =[process.execPath, path.join(root, 'node_modules/vite/bin/vite.js'), '--config', path.join(root, 'vite.local.config.ts')];
    console.log(`Local only: http://127.0.0.1:${port} · owner sign-in is simulated; external AI is disabled.`);
    await import(new URL('../node_modules/vite/bin/vite.js', import.meta.url).href);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Local startup failed.');
  process.exitCode = 1;
}
