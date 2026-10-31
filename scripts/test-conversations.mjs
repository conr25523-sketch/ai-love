import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const core = readdirSync(new URL('../core/', import.meta.url)).filter(file => file.endsWith('.test.mjs')).sort().map(file => `core/${file}`);
const tests = [...core, 'tests/backend.test.mjs', 'tests/visitor-session.test.mjs', 'tests/admin-access.test.mjs', 'tests/dialogue-flow.test.mjs', 'tests/pages-bridge.test.mjs'];
const result = spawnSync(process.execPath, ['--test', ...tests], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
