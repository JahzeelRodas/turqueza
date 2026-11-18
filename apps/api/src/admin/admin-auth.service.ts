import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export interface AdminSession {
  email: string;
  name: string;
  role: 'admin';
  iat: number;
  exp: number;
}

export interface LoginResult {
  token: string;
  expiresIn: number;
  admin: Pick<AdminSession, 'email' | 'name' | 'role'>;
}

const DEFAULT_EMAIL = 'admin@turquesa.bo';
const DEFAULT_PASSWORD = 'admin123';
const DEFAULT_TTL_HOURS = 12;
const MIN_PRODUCTION_SECRET_LENGTH = 32;
const MIN_PRODUCTION_PASSWORD_LENGTH = 10;

/**
 * Autenticación ligera del panel de administración.
 *
 * No depende de proveedores externos ni de tablas extra: las credenciales
 * viven en variables de entorno y el token es un JWT-like firmado con HMAC.
 * Para producción SIEMPRE define ADMIN_EMAIL, ADMIN_PASSWORD y ADMIN_JWT_SECRET.
 */
@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);
  private readonly secret: string;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    const configuredEmail = process.env.ADMIN_EMAIL?.trim();
    const configuredPassword = process.env.ADMIN_PASSWORD;
    const configuredSecret = process.env.ADMIN_JWT_SECRET;

    if (isProduction) {
      const missing = [
        !configuredEmail && 'ADMIN_EMAIL',
        !configuredPassword && 'ADMIN_PASSWORD',
        !configuredSecret && 'ADMIN_JWT_SECRET',
      ].filter((name): name is string => Boolean(name));

      if (missing.length > 0) {
        throw new Error(
          `[AdminAuth] Configuración de producción incompleta: define ${missing.join(', ')}.`,
        );
      }
      if (configuredPassword === DEFAULT_PASSWORD) {
        throw new Error(
          '[AdminAuth] ADMIN_PASSWORD no puede ser la contraseña de desarrollo en producción.',
        );
      }
      if ((configuredPassword?.length ?? 0) < MIN_PRODUCTION_PASSWORD_LENGTH) {
        throw new Error(
          `[AdminAuth] ADMIN_PASSWORD debe tener al menos ${MIN_PRODUCTION_PASSWORD_LENGTH} caracteres en producción.`,
        );
      }
      if ((configuredSecret?.length ?? 0) < MIN_PRODUCTION_SECRET_LENGTH) {
        throw new Error(
          `[AdminAuth] ADMIN_JWT_SECRET debe tener al menos ${MIN_PRODUCTION_SECRET_LENGTH} caracteres en producción.`,
        );
      }
    }

    if (configuredSecret) {
      this.secret = configuredSecret;
    } else {
      // Secreto efímero: las sesiones se invalidan al reiniciar la API, pero
      // nunca se usa una clave conocida por defecto.
      this.secret = randomBytes(48).toString('base64url');
      this.logger.warn(
        'ADMIN_JWT_SECRET no está definido: se generó un secreto temporal. Configúralo en producción.',
      );
    }
    if (!configuredPassword) {
      this.logger.warn(
        'ADMIN_PASSWORD no está definido: credenciales de desarrollo activas (admin@turquesa.bo / admin123).',
      );
    }
  }

  login(email: string, password: string): LoginResult {
    const expectedEmail = (process.env.ADMIN_EMAIL ?? DEFAULT_EMAIL).trim().toLowerCase();
    const expectedPassword = process.env.ADMIN_PASSWORD ?? DEFAULT_PASSWORD;

    const emailOk = safeEqual(email.trim().toLowerCase(), expectedEmail);
    const passwordOk = safeEqual(password, expectedPassword);

    if (!emailOk || !passwordOk) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const ttlHours = Number(process.env.ADMIN_TOKEN_TTL_HOURS ?? DEFAULT_TTL_HOURS);
    const now = Math.floor(Date.now() / 1000);
    const exp =
      now +
      Math.max(1, Number.isFinite(ttlHours) ? ttlHours : DEFAULT_TTL_HOURS) * 3600;

    const session: AdminSession = {
      email: expectedEmail,
      name: process.env.ADMIN_NAME?.trim() || 'Administrador',
      role: 'admin',
      iat: now,
      exp,
    };

    return {
      token: this.sign(session),
      expiresIn: exp - now,
      admin: { email: session.email, name: session.name, role: session.role },
    };
  }

  /** Verifica firma + expiración. Devuelve null si el token no es válido. */
  verify(token?: string | null): AdminSession | null {
    if (!token) return null;
    const [payloadPart, signature] = token.split('.');
    if (!payloadPart || !signature) return null;

    const expected = this.hmac(payloadPart);
    if (!safeEqual(signature, expected)) return null;

    try {
      const payload = JSON.parse(
        Buffer.from(payloadPart, 'base64url').toString('utf8'),
      ) as Partial<AdminSession>;
      if (
        payload.role !== 'admin' ||
        typeof payload.email !== 'string' ||
        typeof payload.name !== 'string' ||
        typeof payload.iat !== 'number' ||
        typeof payload.exp !== 'number'
      ) {
        return null;
      }
      if (payload.exp * 1000 <= Date.now()) return null;
      return payload as AdminSession;
    } catch {
      return null;
    }
  }

  private hmac(value: string) {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }

  private sign(payload: AdminSession) {
    const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    return `${body}.${this.hmac(body)}`;
  }
}

/** Comparación en tiempo constante tolerando longitudes distintas. */
function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
