/**
 * Punto de entrada Node.js para Hostinger.
 *
 * El despliegue recomendado de Turquesa usa dos Web Apps separadas:
 *   · apps/api  → https://turqueza-api.rovelbots.com
 *   · apps/web  → https://turqueza.rovelbots.com
 *
 * En ese modo este proceso solo sirve Next.js y consume la API pública. Si la
 * API está configurada en localhost (VPS/Docker con una sola app), delega en
 * `gateway.mjs`, que arranca NestJS y Next.js dentro del mismo proceso.
 *
 * La decisión se toma con API_INTERNAL_URL y NEXT_PUBLIC_API_URL. En Hostinger
 * las dos Web Apps NO comparten 127.0.0.1: usa siempre la URL pública de la API.
 */

function isLocalOrigin(value) {
  const url = value?.trim();
  if (!url) return true;
  return /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::|\/|$)/i.test(url);
}

const configuredOrigins = [
  process.env.API_INTERNAL_URL,
  process.env.NEXT_PUBLIC_API_URL,
]
  .map((value) => value?.trim())
  .filter(Boolean);

const remoteOrigin = configuredOrigins.find((value) => !isLocalOrigin(value));

if (remoteOrigin) {
  console.log(`[entry] Modo web-only · API externa: ${remoteOrigin}`);
  await import('./web-only.mjs');
} else {
  console.log('[entry] Modo gateway · API local (VPS/Docker).');
  await import('./gateway.mjs');
}
