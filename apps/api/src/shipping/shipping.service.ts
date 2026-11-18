import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateShippingZoneDto,
  UpdateShippingZoneDto,
} from '../admin/dtos/shipping-zone.dto';

@Injectable()
export class ShippingService {
  constructor(private readonly prisma: PrismaService) {}

  /* ── Público ─────────────────────────────────────────────────────────── */

  /** Zonas activas ordenadas para el selector del checkout. */
  findAll() {
    return this.prisma.shippingZone.findMany({
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { department: 'asc' }],
    });
  }

  /**
   * Resuelve la zona por código ("LP"), departamento ("La Paz") o ciudad.
   * Devuelve null si no hay coincidencia (el checkout decide el fallback).
   */
  async resolve(params: { code?: string; department?: string; city?: string }) {
    const { code, department, city } = params;

    if (code) {
      const byCode = await this.prisma.shippingZone.findFirst({
        where: { code, isActive: true },
      });
      if (byCode) return byCode;
    }

    if (department) {
      const byDepartment = await this.prisma.shippingZone.findFirst({
        where: { department: { equals: department, mode: 'insensitive' }, isActive: true },
      });
      if (byDepartment) return byDepartment;
    }

    if (city) {
      return this.prisma.shippingZone.findFirst({
        where: { cities: { has: city }, isActive: true },
      });
    }

    return null;
  }

  /** Costo final aplicando el umbral de envío gratis de la zona. */
  quote(
    zone: { price: number; freeThreshold: number | null } | null,
    subtotal: number,
  ): number {
    if (!zone) return 0;
    if (zone.freeThreshold !== null && subtotal >= zone.freeThreshold) return 0;
    return zone.price;
  }

  /* ── Administración ──────────────────────────────────────────────────── */

  adminFindAll() {
    return this.prisma.shippingZone.findMany({
      orderBy: [{ position: 'asc' }, { department: 'asc' }],
      include: { _count: { select: { orders: true } } },
    });
  }

  async create(dto: CreateShippingZoneDto) {
    try {
      return await this.prisma.shippingZone.create({
        data: {
          code: dto.code.trim().toUpperCase(),
          department: dto.department.trim(),
          cities: dto.cities ?? [],
          price: dto.price,
          freeThreshold: dto.freeThreshold ?? null,
          estimatedDays: dto.estimatedDays?.trim() || '2-4 días hábiles',
          isActive: dto.isActive ?? true,
          position: dto.position ?? 0,
        },
      });
    } catch (error) {
      throw uniqueError(error);
    }
  }

  async update(id: string, dto: UpdateShippingZoneDto) {
    await this.ensureExists(id);
    try {
      return await this.prisma.shippingZone.update({
        where: { id },
        data: {
          ...(dto.code !== undefined
            ? { code: dto.code.trim().toUpperCase() }
            : {}),
          ...(dto.department !== undefined
            ? { department: dto.department.trim() }
            : {}),
          ...(dto.cities !== undefined ? { cities: dto.cities } : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.freeThreshold !== undefined
            ? { freeThreshold: dto.freeThreshold }
            : {}),
          ...(dto.estimatedDays !== undefined
            ? { estimatedDays: dto.estimatedDays.trim() }
            : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.position !== undefined ? { position: dto.position } : {}),
        },
      });
    } catch (error) {
      throw uniqueError(error);
    }
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.shippingZone.delete({ where: { id } });
    return { deleted: true, id };
  }

  private async ensureExists(id: string) {
    const count = await this.prisma.shippingZone.count({ where: { id } });
    if (!count) throw new NotFoundException('Zona de envío no encontrada');
  }
}

function uniqueError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return new ConflictException(
        'Ya existe una zona con ese código o departamento',
      );
    }
    if (error.code === 'P2025') {
      return new NotFoundException('La zona de envío ya no existe');
    }
  }
  return error;
}
