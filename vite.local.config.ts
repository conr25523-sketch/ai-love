import vinext from 'vinext';
import { defineConfig, type ResolvedConfig, type ViteDevServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sites } from './build/sites-vite-plugin';
import { allowLocalRequest, localPaths } from './scripts/local-config.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const paths = localPaths(root);
const port = Number(process.env.MOONMIND_LOCAL_PORT || 5173);

export default defineConfig(async ({ command }) => {
  if (command !== 'serve') throw new Error('This configuration is local development only.');
  const { cloudflare } = await import('@cloudflare/vite-plugin');
  return {
    envDir: paths.worker,
    server: { host: '127.0.0.1', port, strictPort: true, allowedHosts: ['localhost', '127.0.0.1'] },
    plugins: [
      {
        name: 'moonmind-loopback-only', enforce: 'pre',
        configResolved(config: ResolvedConfig) {
          if (config.server.host !== '127.0.0.1' || !config.server.strictPort) throw new Error('Local owner mode must bind only 127.0.0.1 with strictPort.');
        },
        configureServer(server: ViteDevServer) {
          server.middlewares.use((request, response, next) => {
            if (!allowLocalRequest({ host: request.headers.host, remoteAddress: request.socket.remoteAddress, url: request.url, origin: request.headers.origin, fetchSite: request.headers['sec-fetch-site'] })) {
              response.writeHead(403, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }); response.end('Local access only.'); return;
            }
            next();
          });
        },
      },
      vinext(),
      sites({ mockAuth: true }),
      cloudflare({ configPath: paths.config, persistState: { path: path.relative(root, paths.state) }, inspectorPort: false, viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] } }),
    ],
  };
});
