/**
 * Gateway opcional de producción para Hostinger (modo una sola Web App).
 *
 * El despliegue recomendado de Turquesa es con dos Web Apps separadas:
 *   · apps/api  → api.tudominio.com
 *   · apps/web  → tudominio.com
 * Guía: docs/HOSTINGER.md. Usa este gateway solo si prefieres un único dominio
 * y una sola Web App; en ese caso la build del frontend debe ejecutarse con
 * ALLOW_SAME_ORIGIN_API=true (ver docs/HOSTINGER-UNA-APP.md).
 *
 * Hostinger expone un único proceso Node por Web App. Este proceso:
 *   1. abre el puerto público de inmediato (para que el proxy nunca devuelva 403),
 *   2. aplica las migraciones de Prisma,
 *   3. arranca NestJS en 127.0.0.1:3001,
 *   4. arranca Next.js en 127.0.0.1:3000,
 *   5. enruta /api/* a NestJS y el resto a Next.js.
 *
 * Si algo falla, el proceso sigue vivo y responde 503 con el motivo real en
 * lugar de dejar que Hostinger muestre un 403 sin información. El estado se
 * puede consultar en /__gateway/health.
 *
 * El navegador llama a /api en el mismo origen, así que no hace falta un
 * subdominio para la API ni configurar CORS entre dominios distintos.
 */
import { spawn } from 'node:child_process';
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
const READY_TIMEOUT_MS = 120_000;

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

const state = {
  startedAt: new Date().toISOString(),
  ready: false,
  migrations: 'pending',
  seed: process.env.RUN_SEED === 'true' ? 'pending' : 'skipped',
  api: { port: API_PORT, status: 'pending', detail: null },
  web: { port: WEB_PORT, status: 'pending', detail: null },
  fatal: null,
};

/**
 * Errores de arranque que no dependen de los procesos hijos. Se informan por
 * HTTP en vez de terminar el proceso, para que el problema sea visible.
 */
function setFatal(message) {
  state.fatal = message;
  console.error(`[gateway] ${message}`);
}

if (!existsSync(API_ENTRY)) {
  setFatal(`No existe ${API_ENTRY}. El build de la API no se copió al runtime.`);
}

if (!nextCli) {
  setFatal('No se encontró Next.js en apps/web. Ejecuta "pnpm install".');
}

if (!prismaCli) {
  setFatal('No se encontró Prisma. Ejecuta "pnpm install" en el runtime.');
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

async function waitForPort(port, name, slot) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < READY_TIMEOUT_MS) {
    if (await canConnect(port)) {
      slot.status = 'ready';
      slot.detail = null;
      console.log(`[gateway] ${name} listo en 127.0.0.1:${port}`);
      return true;
    }
    if (slot.status === 'crashed') return false;
    await sleep(500);
  }
  slot.status = 'timeout';
  slot.detail = `No respondió en ${READY_TIMEOUT_MS / 1000}s`;
  console.error(`[gateway] ${name}: ${slot.detail}`);
  return false;
}

/**
 * Ejecuta un comando de forma asíncrona para no bloquear el servidor HTTP
 * mientras corren migraciones o el seed.
 */
function runCommand(args, label) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: API_DIR,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      resolve({ ok: false, detail: error.message });
    });
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve({ ok: true, detail: null });
        return;
      }
      resolve({ ok: false, detail: `${label}: código ${code ?? 'null'} señal ${signal ?? 'null'}` });
    });
  });
}

async function runMigrations() {
  if (process.env.RUN_MIGRATIONS === 'false') {
    state.migrations = 'skipped';
    console.log('[gateway] Migraciones omitidas (RUN_MIGRATIONS=false)');
    return;
  }

  state.migrations = 'running';
  console.log('[gateway] Aplicando migraciones de Prisma...');
  const result = await runCommand(
    [prismaCli, 'migrate', 'deploy', '--schema', PRISMA_SCHEMA],
    'prisma migrate deploy',
  );

  if (result.ok) {
    state.migrations = 'ok';
    console.log('[gateway] Migraciones aplicadas.');
    return;
  }

  state.migrations = 'failed';
  state.fatal = state.fatal ?? result.detail;
  console.error(`[gateway] Migraciones fallidas: ${result.detail}`);
}

async function runSeed() {
  if (process.env.RUN_SEED !== 'true') return;

  state.seed = 'running';
  console.log('[gateway] Ejecutando seed inicial...');
  const result = await runCommand(
    [prismaCli, 'db', 'seed', '--schema', PRISMA_SCHEMA],
    'prisma db seed',
  );

  if (result.ok) {
    state.seed = 'ok';
    console.log('[gateway] Seed completado.');
    return;
  }

  state.seed = 'failed';
  console.error(`[gateway] El seed falló: ${result.detail}`);
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

const proxyAgent = new http.Agent({ keepAlive: true, maxSockets: 64 });

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendUnavailable(res) {
  const detail = state.fatal ?? 'La aplicación todavía se está iniciando.';
  const body = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Iniciando tienda</title>
<style>body{font:15px/1.6 system-ui,sans-serif;max-width:640px;margin:12vh auto;padding:0 24px;color:#222}
code{background:#f3f3f3;padding:2px 6px;border-radius:4px}</style></head>
<body><h1>La tienda se está iniciando</h1>
<p>El proceso Node ya está en marcha, pero la API o el frontend aún no responden.</p>
<p>Detalle: <code>${detail.replace(/[<>&]/g, '')}</code></p>
<p>Estado: <a href="/__gateway/health">/__gateway/health</a></p>
<p>Esta página se actualiza sola en 10 segundos.</p>
<script>setTimeout(function(){location.reload()},10000)</script>
</body></html>`;

  res.writeHead(503, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Retry-After': '10',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function forward(req, res) {
  const isApi = req.url === '/api' || req.url?.startsWith('/api/');
  const slot = isApi ? state.api : state.web;
  const targetPort = slot.port;

  if (slot.status !== 'ready') {
    sendUnavailable(res);
    return;
  }

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
      slot.status = 'unreachable';
      slot.detail = error.message;
      sendUnavailable(res);
    } else {
      res.destroy(error);
    }
  });

  req.pipe(proxyReq, { end: true });
}

function handleRequest(req, res) {
  const url = req.url ?? '/';

  if (url === '/__gateway/health') {
    sendJson(res, state.ready ? 200 : 503, {
      ready: state.ready,
      uptimeSeconds: Math.round(process.uptime()),
      startedAt: state.startedAt,
      publicPort: PUBLIC_PORT,
      migrations: state.migrations,
      seed: state.seed,
      api: state.api,
      web: state.web,
      fatal: state.fatal,
      node: process.version,
    });
    return;
  }

  if (state.fatal && state.api.status !== 'ready') {
    sendUnavailable(res);
    return;
  }

  forward(req, res);
}

function startChild(args, options, name, slot) {
  const child = spawn(process.execPath, args, options);

  child.on('error', (error) => {
    slot.status = 'crashed';
    slot.detail = error.message;
    console.error(`[gateway] No se pudo arrancar ${name}:`, error.message);
  });
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    slot.status = 'crashed';
    slot.detail = `Terminó con código ${code ?? 'null'} (señal ${signal ?? 'null'})`;
    console.error(`[gateway] ${name} terminó (código ${code ?? 'null'}, señal ${signal ?? 'null'}).`);
  });

  return child;
}

server = http.createServer(handleRequest);
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

server.on('error', (error) => {
  console.error('[gateway] Error del servidor HTTP:', error.message);
  shutdown(1);
});

// El puerto público se abre antes de arrancar nada: el proxy de Hostinger tiene
// un upstream válido desde el primer segundo.
server.listen(PUBLIC_PORT, '0.0.0.0', () => {
  console.log(`[gateway] Escuchando en 0.0.0.0:${PUBLIC_PORT} (Web:${WEB_PORT}, API:${API_PORT})`);
});

async function boot() {
  if (state.fatal) {
    console.error(`[gateway] Arranque incompleto: ${state.fatal}`);
    return;
  }

  await runMigrations();
  await runSeed();

  console.log('[gateway] Arrancando API y Web...');
  apiProc = startChild(
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
    state.api,
  );

  webProc = startChild(
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
    state.web,
  );

  const [apiReady, webReady] = await Promise.all([
    waitForPort(API_PORT, 'API', state.api),
    waitForPort(WEB_PORT, 'Web', state.web),
  ]);

  if (apiReady && webReady) {
    state.ready = true;
    console.log('[gateway] Aplicación lista.');
  } else {
    state.fatal = state.fatal ?? 'La API o el frontend no llegaron a iniciar. Revisa los logs.';
    console.error(`[gateway] ${state.fatal}`);
  }
}

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

await boot();
