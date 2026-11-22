import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { runTool } from './scripts/engine.mjs';

function localOxcApi(): Plugin {
  return {
    name: 'local-oxc-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/run', async (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: '仅支持 POST 请求' }));
          return;
        }

        try {
          const chunks: Buffer[] = [];
          let length = 0;
          for await (const chunk of req) {
            const buffer = Buffer.from(chunk);
            length += buffer.length;
            if (length > 32_000) {
              res.statusCode = 413;
              res.end(JSON.stringify({ error: '请求内容过大' }));
              return;
            }
            chunks.push(buffer);
          }

          const payload: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          const result = await runTool(payload);
          res.statusCode = 200;
          res.end(JSON.stringify(result));
        } catch (error) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
        }
      });
    },
  };
}

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/oxc-demo/' : '/',
  plugins: [react(), localOxcApi()],
  build: { target: 'es2022' },
});
