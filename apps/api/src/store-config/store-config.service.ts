import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateStoreConfigDto } from './dtos/update-store-config.dto';

const SINGLETON_ID = 'singleton';

@Injectable()
export class StoreConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /** Devuelve la config singleton; crea una mínima si no existe todavía. */
  async get() {
    const existing = await this.prisma.storeConfig.findUnique({ where: { id: SINGLETON_ID } });
    if (existing) return existing;

    return this.prisma.storeConfig.create({
      data: {
        id: SINGLETON_ID,
        storeName: 'Nueva tienda',
        currency: 'BOB',
        locale: 'es-BO',
        country: 'Bolivia',
        navigation: { groups: [] },
        footer: {},
        valueProps: { items: [] },
        homeLayout: [],
      },
    });
  }

  /** PATCH /api/store-config — el CMS/panel actualiza navegación, footer, bloques... */
  async update(dto: UpdateStoreConfigDto) {
    await this.get();
    const { navigation, footer, valueProps, homeLayout, ...scalars } = dto;

    const data = {
      ...scalars,
      ...(navigation !== undefined
        ? { navigation: navigation as Prisma.InputJsonValue }
        : {}),
      ...(footer !== undefined ? { footer: footer as Prisma.InputJsonValue } : {}),
      ...(valueProps !== undefined
        ? { valueProps: valueProps as Prisma.InputJsonValue }
        : {}),
      ...(homeLayout !== undefined
        ? { homeLayout: homeLayout as Prisma.InputJsonValue }
        : {}),
    } as Prisma.StoreConfigUncheckedUpdateInput;

    return this.prisma.storeConfig.update({
      where: { id: SINGLETON_ID },
      data,
    });
  }
}
