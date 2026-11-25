import { existsSync, readdirSync } from 'node:fs';
import type { IncomingMessage } from 'node:http';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const THEME = '#F4F0E8';

export default defineConfig(({ mode }) => {
  // Make .env values visible to the API handlers during `npm run dev`.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  return {
    plugins: [
      react(),
      devApi(),
      VitePWA({
        registerType: 'autoUpdate',
        pwaAssets: {
          image: 'public/logo.svg',
          preset: 'minimal-2023',
          includeHtmlHeadLinks: true,
          overrideManifestIcons: true,
        },
        manifest: {
          name: 'Planny — Road trips together',
          short_name: 'Planny',
          description: 'Plan and live your road trips together.',
          theme_color: THEME,
          background_color: THEME,
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
        },
        workbox: {
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          runtimeCaching: [
            {
              // Trips: fresh when online, last copy when you're in the middle of nowhere.
              urlPattern: ({ url, request }) => url.pathname.startsWith('/api/trips') && request.method === 'GET',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'planny-api',
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 60 },
              },
            },
            {
              urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
              handler: 'CacheFirst',
              options: { cacheName: 'planny-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
            },
            {
              // Map tiles you've seen stay available offline.
              urlPattern: ({ url }) => url.hostname === 'tile.openstreetmap.org',
              handler: 'CacheFirst',
              options: {
                cacheName: 'planny-tiles',
                expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ request, url }) => request.destination === 'image' && url.origin !== self.location.origin,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'planny-images',
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    css: {
      preprocessorOptions: { scss: { api: 'modern-compiler' } },
      modules: { localsConvention: 'camelCaseOnly' },
    },
    build: { target: 'es2022', cssCodeSplit: true },
  };
});

/**
 * Serves /api/* from the ./api folder in dev, using the same file-based routing
 * and Web `Request -> Response` handlers that Vercel uses in production.
 */
function devApi(): Plugin {
  const apiDir = path.resolve('api');

  function resolveFile(pathname: string): string | null {
    const segs = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
    let dir = apiDir;
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i]!;
      const last = i === segs.length - 1;
      if (last && existsSync(path.join(dir, `${seg}.ts`))) return path.join(dir, `${seg}.ts`);
      if (existsSync(path.join(dir, seg))) {
        dir = path.join(dir, seg);
        continue;
      }
      const dyn = existsSync(dir) ? readdirSync(dir).find((f) => /^\[[^.]+\](\.ts)?$/.test(f)) : undefined;
      if (!dyn) return null;
      if (dyn.endsWith('.ts')) return last ? path.join(dir, dyn) : null;
      dir = path.join(dir, dyn);
    }
    const index = path.join(dir, 'index.ts');
    return existsSync(index) ? index : null;
  }

  const readBody = (req: IncomingMessage) =>
    new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });

  return {
    name: 'planny-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const file = resolveFile(url.pathname);
          const method = req.method ?? 'GET';
          const mod = file ? await server.ssrLoadModule(file) : null;
          const handler = mod?.[method] as ((r: Request) => Promise<Response>) | undefined;
          if (!handler) {
            res.statusCode = file ? 405 : 404;
            res.end(JSON.stringify({ error: file ? 'Method not allowed' : 'Not found' }));
            return;
          }
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) {
            if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
          }
          const body = method === 'GET' || method === 'HEAD' ? undefined : new Uint8Array(await readBody(req));
          const response = await handler(new Request(url, { method, headers, body }));
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          server.config.logger.error(String((err as Error)?.stack ?? err));
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Dev API crashed — see terminal' }));
        }
      });
    },
  };
}
