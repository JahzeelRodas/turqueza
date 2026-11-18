// Punto de entrada de la API headless.
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

const PREFIX = 'api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  // Prefijo global: todos los endpoints viven bajo /api (Nginx hace proxy directo)
  app.setGlobalPrefix(PREFIX);

  // Seguridad + CORS (orígenes separados por coma en CORS_ORIGIN)
  app.use(helmet());
  const origins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim());
  app.enableCors({ origin: origins ?? true, credentials: true });

  // Validación estricta de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);

  console.log(`🚀 API lista en http://localhost:${port}/${PREFIX}`);
}

bootstrap();
