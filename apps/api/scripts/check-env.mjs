#!/usr/bin/env node
/**
 * Valida las variables de producción de la API antes de compilar en Hostinger.
 *
 * Se ejecuta desde `build:deploy` y solo actúa cuando NODE_ENV=production.
 * En local o en CI (sin NODE_ENV) se omite para no bloquear el desarrollo.
 */
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  console.log('[api/env] NODE_ENV no es "production": validación omitida.');
  process.exit(0);
}

const errors = [];
const warnings = [];

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  errors.push('DATABASE_URL es obligatoria.');
} else if (!/^mysql(s)?:\/\//.test(databaseUrl)) {
  errors.push('DATABASE_URL debe usar el esquema mysql:// de Prisma.');
} else if (!/[?&]connection_limit=/.test(databaseUrl)) {
  warnings.push(
    'DATABASE_URL no define connection_limit; en hosting compartido usa connection_limit=5.',
  );
}

const corsOrigin = process.env.CORS_ORIGIN?.trim();
if (!corsOrigin) {
  errors.push(
    'CORS_ORIGIN es obligatoria: incluye los dominios del frontend separados por coma.',
  );
} else if (corsOrigin !== '*') {
  const origins = corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    errors.push('CORS_ORIGIN no contiene orígenes válidos.');
  }

  for (const origin of origins) {
    if (!/^https?:\/\/[^/]+$/.test(origin)) {
      errors.push(
        `CORS_ORIGIN contiene un origen inválido: "${origin}". Usa https://dominio.com sin barra final ni ruta.`,
      );
    }
  }
}

const adminEmail = process.env.ADMIN_EMAIL?.trim();
if (!adminEmail) {
  errors.push('ADMIN_EMAIL es obligatoria.');
} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
  errors.push('ADMIN_EMAIL no es un correo válido.');
}

const adminPassword = process.env.ADMIN_PASSWORD ?? '';
if (!adminPassword) {
  errors.push('ADMIN_PASSWORD es obligatoria.');
} else {
  if (adminPassword === 'admin123') {
    errors.push('ADMIN_PASSWORD no puede ser la contraseña de desarrollo.');
  }
  if (adminPassword.length < 10) {
    errors.push('ADMIN_PASSWORD debe tener al menos 10 caracteres.');
  }
}

const adminSecret = process.env.ADMIN_JWT_SECRET ?? '';
if (!adminSecret) {
  errors.push('ADMIN_JWT_SECRET es obligatorio.');
} else if (adminSecret.length < 32) {
  errors.push('ADMIN_JWT_SECRET debe tener al menos 32 caracteres.');
}

for (const warning of warnings) {
  console.warn(`[api/env] Aviso: ${warning}`);
}

if (errors.length > 0) {
  console.error('\n[api/env] Configuración de producción incompleta:\n');
  for (const error of errors) console.error(`  - ${error}`);
  console.error(
    '\nDefine estas variables en hPanel → Web App (API) → Environment variables.\n',
  );
  process.exit(1);
}

console.log('[api/env] Variables de producción de la API válidas.');
