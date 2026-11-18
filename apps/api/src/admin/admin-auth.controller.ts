import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminGuard, type AdminRequest } from './admin.guard';
import { AdminLoginDto } from './dtos/admin-auth.dto';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  /** POST /api/admin/auth/login */
  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  /** GET /api/admin/auth/me — valida el token y devuelve la sesión activa. */
  @Get('me')
  @UseGuards(AdminGuard)
  me(@Req() request: AdminRequest) {
    return { admin: request.admin };
  }
}
