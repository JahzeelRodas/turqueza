// Punto de entrada de la API headless.
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';

const PREFIX = 'api';

/**
 * Orígenes permitidos para el navegador.
 *
 * En el despliegue de Hostinger con backend y frontend separados, la web vive
 * en https://turqueza.rovelbots.com y la API en https://turqueza-api.rovelbots.com.
 * Sin CORS la web no puede crear pedidos ni usar el panel. En producción exigimos
 * la variable para no abrir la API a cualquier origen por accidente.
 */
function resolveCorsOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGIN?.trim();

  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[bootstrap] Define CORS_ORIGIN con los dominios del frontend separados por coma.',
      );
    }
    // Desarrollo local: refleja el origen de la petición.
    return true;
  }

  if (raw === '*') return true;

  const origins = raw
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  if (origins.length === 0 && process.env.NODE_ENV === 'production') {
    throw new Error(
      '[bootstrap] CORS_ORIGIN no contiene ningún origen válido.',
    );
  }

  return origins;
}

function resolvePort(fallback = 3001): number {
  const parsed = Number(process.env.PORT);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function bootstrap() {
  const corsOrigins = resolveCorsOrigins();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: false,
  });

  // Hostinger termina TLS en su proxy: confía en X-Forwarded-* para la IP real.
  app.set('trust proxy', 1);

  // Prefijo global: todos los endpoints viven bajo /api.
  app.setGlobalPrefix(PREFIX);

  // Seguridad + CORS. El frontend es una Web App distinta en producción.
  app.use(
    helmet({
      // La API puede servir archivos estáticos en el futuro (p. ej. imágenes).
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    maxAge: 86_400,
  });

  // Validación estricta de DTOs.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableShutdownHooks();

  const port = resolvePort(3001);
  // 0.0.0.0 es obligatorio en Hostinger: 127.0.0.1 no es accesible desde el proxy.
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 API lista en http://0.0.0.0:${port}/${PREFIX}`);
}

bootstrap().catch((err) => {
  console.error('[bootstrap] Error fatal al iniciar la API:', err);
  process.exit(1);
});