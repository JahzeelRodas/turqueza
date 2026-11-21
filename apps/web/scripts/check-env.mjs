#!/usr/bin/env node
/**
 * Valida las variables del frontend antes de compilar en Hostinger.
 *
 * En el despliegue de dos Web Apps, el navegador llama directamente a la API
 * pública. Si NEXT_PUBLIC_API_URL queda vacía, el navegador intentaría /api en
 * el dominio del frontend y recibiría 404. Este chequeo evita ese despliegue.
 *
 * `ALLOW_SAME_ORIGIN_API=true` permite compilar el modo opcional de una sola
 * Web App (gateway `server.mjs`), donde la API se sirve en el mismo origen.
 */
const allowSameOrigin = process.env.ALLOW_SAME_ORIGIN_API === 'true';
const errors = [];
const warnings = [];

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * El cliente y el servidor añaden `/api` a la base. Si la variable ya termina
 * en `/api` la petición sale como `/api/api/...` y devuelve 404.
 */
function hasApiPath(value) {
  try {
    return /\/api\/?$/i.test(new URL(value).pathname);
  } catch {
    return false;
  }
}

function isLocalhostUrl(value) {
  return /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::|\/|$)/i.test(value);
}

const publicUrl = process.env.NEXT_PUBLIC_API_URL?.trim() ?? '';
const internalUrl = process.env.API_INTERNAL_URL?.trim() ?? '';

if (!publicUrl && !allowSameOrigin) {
  errors.push(
    'NEXT_PUBLIC_API_URL es obligatoria. Ejemplo: https://turqueza-api.rovelbots.com',
  );
} else if (publicUrl && !isHttpUrl(publicUrl)) {
  errors.push(
    'NEXT_PUBLIC_API_URL debe ser una URL absoluta http(s), sin barra final.',
  );
} else if (publicUrl.endsWith('/')) {
  warnings.push('NEXT_PUBLIC_API_URL termina en "/": se recomienda sin barra final.');
}

if (publicUrl && hasApiPath(publicUrl)) {
  errors.push(
    'NEXT_PUBLIC_API_URL debe ser el origen de la API, sin /api. El cliente ya añade /api. Ejemplo: https://turqueza-api.rovelbots.com',
  );
}

if (internalUrl && !isHttpUrl(internalUrl)) {
  errors.push('API_INTERNAL_URL debe ser una URL absoluta http(s).');
} else if (!internalUrl && !allowSameOrigin) {
  warnings.push(
    'API_INTERNAL_URL no está definida: el servidor usará NEXT_PUBLIC_API_URL.',
  );
}

if (internalUrl && hasApiPath(internalUrl)) {
  errors.push(
    'API_INTERNAL_URL debe ser el origen de la API, sin /api. El servidor ya añade /api. Ejemplo: https://turqueza-api.rovelbots.com',
  );
}

if (internalUrl && isLocalhostUrl(internalUrl) && process.env.NODE_ENV === 'production') {
  warnings.push(
    'API_INTERNAL_URL apunta a localhost. En Hostinger cada Web App tiene su propia red: usa la URL pública de la API.',
  );
}

if (allowSameOrigin) {
  console.log(
    '[web/env] ALLOW_SAME_ORIGIN_API=true: se permite usar /api en el mismo origen.',
  );
}

for (const warning of warnings) {
  console.warn(`[web/env] Aviso: ${warning}`);
}

if (errors.length > 0) {
  console.error('\n[web/env] Configuración de producción incompleta:\n');
  for (const error of errors) console.error(`  - ${error}`);
  console.error(
    '\nDefine estas variables en hPanel → Web App (Frontend) → Environment variables.\n',
  );
  process.exit(1);
}

console.log('[web/env] Variables de producción del frontend válidas.');
