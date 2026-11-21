/**
 * Servidor Next.js para el despliegue de dos Web Apps en Hostinger.
 *
 * Hostinger aísla la red de cada Web App: no se puede usar 127.0.0.1 para
 * hablar con la API. Este proceso solo sirve el storefront y consume la API
 * pública configurada en API_INTERNAL_URL / NEXT_PUBLIC_API_URL.
 *
 * Lo arranca `server.mjs` cuando detecta una API remota. El puerto lo inyecta
 * Hostinger en process.env.PORT.
 */
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.join(ROOT, 'apps', 'web');
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

const require = createRequire(path.join(WEB_DIR, 'package.json'));
const next = require('next');

const app = next({ dev: false, dir: WEB_DIR, hostname: HOST, port: PORT });
const handle = app.getRequestHandler();

await app.prepare();

const server = http.createServer((req, res) => handle(req, res));
server.listen(PORT, HOST, () => {
  console.log(`[web] Next.js listo en http://${HOST}:${PORT}`);
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5_000).unref();
  });
}
