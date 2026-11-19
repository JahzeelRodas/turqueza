import { spawn } from 'node:child_process';
import http from 'node:http';

const PUBLIC_PORT = Number(process.env.PORT) || 8080;
const WEB_PORT = 3000;
const API_PORT = 3001;

// 1. Arrancar Backend NestJS en puerto interno 3001
const apiProc = spawn('node', ['apps/api/dist/main.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: String(API_PORT) },
});

// 2. Arrancar Frontend Next.js en puerto interno 3000
const webProc = spawn(
  'pnpm',
  ['--filter', 'web', 'exec', 'next', 'start', '-p', String(WEB_PORT)],
  {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(WEB_PORT) },
  }
);

// 3. Proxy reverso simple en el puerto que asigna Hostinger
const server = http.createServer((req, res) => {
  const isApi = req.url?.startsWith('/api');
  const targetPort = isApi ? API_PORT : WEB_PORT;

  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `127.0.0.1:${targetPort}`,
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    }
  );

  proxyReq.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Servicio iniciando, intenta recargar en unos segundos...');
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(PUBLIC_PORT, '0.0.0.0', () => {
  console.log(`Gateway listo en puerto ${PUBLIC_PORT} (Web:${WEB_PORT}, API:${API_PORT})`);
});

process.on('SIGTERM', () => {
  apiProc.kill();
  webProc.kill();
  server.close();
});