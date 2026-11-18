import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminAuthService, type AdminSession } from './admin-auth.service';

export interface AdminRequest extends Request {
  admin?: AdminSession;
}

/**
 * Protege todos los endpoints /api/admin/*.
 * Acepta `Authorization: Bearer <token>` o la cabecera `x-admin-token`.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly auth: AdminAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const header = request.headers.authorization;
    const headerToken =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice(7)
        : undefined;
    const customHeader = request.headers['x-admin-token'];
    const customToken =
      typeof customHeader === 'string'
        ? customHeader
        : Array.isArray(customHeader)
          ? customHeader[0]
          : undefined;

    const session = this.auth.verify(headerToken ?? customToken);
    if (!session) {
      throw new UnauthorizedException('Sesión de administrador inválida o expirada');
    }
    request.admin = session;
    return true;
  }
}
