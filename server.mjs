/**
 * Gateway de producción para Hostinger.
 *
 * Hostinger expone un único proceso Node por Web App. Este proceso:
 *   1. aplica las migraciones de Prisma,
 *   2. arranca NestJS en 127.0.0.1:3001,
 *   3. arranca Next.js en 127.0.0.1:3000,
 *   4. publica un proxy en el puerto que asigna Hostinger (process.env.PORT).
 *
 * El navegador llama a /api en el mismo origen, así que no hace falta un
 * subdominio para la API ni configurar CORS entre dominios distintos.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const API_DIR = path.join(ROOT, 'apps', 'api');
const WEB_DIR = path.join(ROOT, 'apps', 'web');
const API_ENTRY = path.join(API_DIR, 'dist', 'main.js');
const PRISMA_SCHEMA = path.join(API_DIR, 'prisma', 'schema.prisma');

const PUBLIC_PORT = Number(process.env.PORT) || 8080;
// Hostinger puede asignar 3000 o 3001 como puerto público. Los procesos internos
// nunca deben chocar con ese puerto.
const WEB_PORT =
  Number(process.env.WEB_INTERNAL_PORT) || (PUBLIC_PORT === 3000 ? 3100 : 3000);
const API_PORT =
  Number(process.env.API_INTERNAL_PORT) || (PUBLIC_PORT === 3001 ? 3101 : 3001);
const READY_TIMEOUT_MS = 90_000;

if (WEB_PORT === API_PORT) {
  console.error('[gateway] WEB_INTERNAL_PORT y API_INTERNAL_PORT no pueden ser iguales.');
  process.exit(1);
}
if (WEB_PORT === PUBLIC_PORT || API_PORT === PUBLIC_PORT) {
  console.error('[gateway] Los puertos internos no pueden coincidir con PORT.');
  process.exit(1);
}

const require = createRequire(import.meta.url);

function resolveFromApp(specifier, appDir) {
  try {
    return require.resolve(specifier, { paths: [appDir] });
  } catch {
    return null;
  }
}

const nextCli =
  resolveFromApp('next/dist/bin/next', WEB_DIR) ??
  [path.join(WEB_DIR, 'node_modules', 'next', 'dist', 'bin', 'next'), path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next')]
    .find((candidate) => existsSync(candidate));

const prismaCli = [
  path.join(API_DIR, 'node_modules', 'prisma', 'build', 'index.js'),
  path.join(ROOT, 'node_modules', 'prisma', 'build', 'index.js'),
].find((candidate) => existsSync(candidate));

if (!existsSync(API_ENTRY)) {
  console.error(`[gateway] No existe ${API_ENTRY}. Ejecuta "pnpm build" antes de arrancar.`);
  process.exit(1);
}

if (!nextCli) {
  console.error('[gateway] No se encontró Next.js en apps/web. Ejecuta "pnpm install".');
  process.exit(1);
}

if (!prismaCli) {
  console.error('[gateway] No se encontró Prisma en apps/api. Ejecuta "pnpm install".');
  process.exit(1);
}

let server;
let apiProc;
let webProc;
let shuttingDown = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    const done = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(1_000);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

async function waitForPort(port, name) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < READY_TIMEOUT_MS) {
    if (await canConnect(port)) {
      console.log(`[gateway] ${name} listo en 127.0.0.1:${port}`);
      return;
    }
    await sleep(500);
  }
  throw new Error(`${name} no respondió en ${READY_TIMEOUT_MS / 1000}s`);
}

function runMigrations() {
  if (process.env.RUN_MIGRATIONS === 'false') {
    console.log('[gateway] Migraciones omitidas (RUN_MIGRATIONS=false)');
    return;
  }

  console.log('[gateway] Aplicando migraciones de Prisma...');
  const result = spawnSync(
    process.execPath,
    [prismaCli, 'migrate', 'deploy', '--schema', PRISMA_SCHEMA],
    {
      cwd: API_DIR,
      env: process.env,
      stdio: 'inherit',
    },
  );

  if (result.error) {
    console.error('[gateway] No se pudo ejecutar Prisma:', result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[gateway] Prisma migrate deploy falló (código ${result.status}).`);
    process.exit(result.status ?? 1);
  }
}

function runSeed() {
  if (process.env.RUN_SEED !== 'true') return;

  console.log('[gateway] Ejecutando seed inicial...');
  const result = spawnSync(
    process.execPath,
    [prismaCli, 'db', 'seed', '--schema', PRISMA_SCHEMA],
    {
      cwd: API_DIR,
      env: process.env,
      stdio: 'inherit',
    },
  );

  if (result.error) {
    console.error('[gateway] No se pudo ejecutar el seed:', result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[gateway] El seed falló (código ${result.status}).`);
    process.exit(result.status ?? 1);
  }
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log('[gateway] Cerrando procesos...');
  server?.close();

  for (const child of [apiProc, webProc]) {
    if (child && child.exitCode === null && !child.killed) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => {
    for (const child of [apiProc, webProc]) {
      if (child && child.exitCode === null) {
        child.kill('SIGKILL');
      }
    }
    process.exit(code);
  }, 5_000).unref();
}

function forward(req, res) {
  const isApi = req.url === '/api' || req.url?.startsWith('/api/');
  const targetPort = isApi ? API_PORT : WEB_PORT;
  const remoteAddress = req.socket.remoteAddress ?? '127.0.0.1';
  const forwardedFor = req.headers['x-forwarded-for']
    ? `${req.headers['x-forwarded-for']}, ${remoteAddress}`
    : remoteAddress;
  const forwardedProto =
    req.headers['x-forwarded-proto'] ?? (req.socket.encrypted ? 'https' : 'http');
  const host = req.headers.host ?? `127.0.0.1:${PUBLIC_PORT}`;

  const headers = {
    ...req.headers,
    host,
    'x-real-ip': remoteAddress,
    'x-forwarded-for': forwardedFor,
    'x-forwarded-host': host,
    'x-forwarded-proto': forwardedProto,
  };

  // Node calcula estas cabeceras al reenviar; dejarlas puede romper el proxy.
  delete headers.connection;
  delete headers['keep-alive'];
  delete headers['proxy-connection'];
  delete headers['transfer-encoding'];

  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: targetPort,
      path: req.url,
      method: req.method,
      headers,
      agent: proxyAgent,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    },
  );

  proxyReq.setTimeout(120_000, () => {
    proxyReq.destroy(new Error('Tiempo de espera agotado'));
  });

  proxyReq.on('error', (error) => {
    console.error(`[gateway] Error al conectar con ${isApi ? 'API' : 'Web'}:`, error.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('La aplicación se está iniciando. Recarga en unos segundos.');
    } else {
      res.destroy(error);
    }
  });

  req.pipe(proxyReq, { end: true });
}

const proxyAgent = new http.Agent({ keepAlive: true, maxSockets: 64 });

function startChild(command, args, options, name) {
  const child = spawn(command, args, options);
  child.on('error', (error) => {
    console.error(`[gateway] No se pudo arrancar ${name}:`, error.message);
    shutdown(1);
  });
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`[gateway] ${name} terminó (código ${code ?? 'null'}, señal ${signal ?? 'null'}).`);
    shutdown(code && code !== 0 ? code : 1);
  });
  return child;
}

runMigrations();
runSeed();

console.log('[gateway] Arrancando API y Web...');
apiProc = startChild(
  process.execPath,
  [API_ENTRY],
  {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV ?? 'production',
      PORT: String(API_PORT),
    },
    stdio: 'inherit',
  },
  'API',
);

webProc = startChild(
  process.execPath,
  [nextCli, 'start', '-p', String(WEB_PORT)],
  {
    cwd: WEB_DIR,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV ?? 'production',
      PORT: String(WEB_PORT),
      // Next usa esta URL en Server Components/build; el navegador usa /api.
      API_INTERNAL_URL: `http://127.0.0.1:${API_PORT}`,
    },
    stdio: 'inherit',
  },
  'Web',
);

try {
  await Promise.all([waitForPort(API_PORT, 'API'), waitForPort(WEB_PORT, 'Web')]);
} catch (error) {
  console.error('[gateway]', error.message);
  shutdown(1);
  process.exit(1);
}

server = http.createServer(forward);
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

server.on('error', (error) => {
  console.error('[gateway] Error del servidor HTTP:', error.message);
  shutdown(1);
});

server.listen(PUBLIC_PORT, '0.0.0.0', () => {
  console.log(`[gateway] Escuchando en 0.0.0.0:${PUBLIC_PORT} (Web:${WEB_PORT}, API:${API_PORT})`);
});

process.on('SIGTERM', () => shutdown(0));
process.on('SIGINT', () => shutdown(0));
process.on('uncaughtException', (error) => {
  console.error('[gateway] Excepción no controlada:', error);
  shutdown(1);
});
process.on('unhandledRejection', (error) => {
  console.error('[gateway] Promesa rechazada sin controlar:', error);
  shutdown(1);
});
