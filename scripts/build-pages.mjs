import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--config', 'vite.pages.config.ts'], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
copyFileSync(new URL('../dist-pages/index.html', import.meta.url), new URL('../index.html', import.meta.url));
cpSync(new URL('../dist-pages/pages-assets/', import.meta.url), new URL('../pages-assets/', import.meta.url), { recursive: true });
writeFileSync(new URL('../.nojekyll', import.meta.url), '');
console.log('GitHub Pages files generated: index.html and pages-assets/. Commit these with the source changes.');
