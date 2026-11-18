import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ShippingService } from '../shipping/shipping.service';
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  extractShippingAddress,
  formatMoney,
} from '../common/whatsapp';
import type { CreateOrderDto, EngravingDto } from './dtos/create-order.dto';

/** Fallback si la tabla de zonas aún no está seedeada. */
const FALLBACK_SHIPPING = 3_000; // Bs 30,00

interface EngravingConfig {
  enabled: boolean;
  price: number;
  maxChars: number;
  fonts: Array<{ id: string; label: string }>;
  placements: Array<{ id: string; label: string }>;
}

function parseEngravingConfig(value: Prisma.JsonValue | null): EngravingConfig | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (raw.enabled !== true) return null;

  return {
    enabled: true,
    price: typeof raw.price === 'number' ? raw.price : 0,
    maxChars: typeof raw.maxChars === 'number' ? raw.maxChars : 18,
    fonts: Array.isArray(raw.fonts)
      ? (raw.fonts as Array<{ id: string; label: string }>)
      : [],
    placements: Array.isArray(raw.placements)
      ? (raw.placements as Array<{ id: string; label: string }>)
      : [],
  };
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shipping: ShippingService,
  ) {}

  /** Crea un pedido calculando TODOS los precios desde la DB (nunca desde el cliente). */
  async create(dto: CreateOrderDto) {
    const variantIds = [...new Set(dto.items.map((i) => i.variantId))];

    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds }, isActive: true },
      include: { product: true },
    });
    if (variants.length === 0) {
      throw new BadRequestException('Ninguna variante del pedido es válida');
    }

    const byId = new Map(variants.map((v) => [v.id, v]));
    const itemsData: Array<Prisma.OrderItemUncheckedCreateWithoutOrderInput> = [];
    const messageItems: Array<{
      name: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      total: number;
      options: Record<string, unknown> | null;
      engraving: {
        enabled: boolean;
        text: string;
        fontLabel?: string;
        placementLabel?: string;
        price: number;
      } | null;
    }> = [];

    let subtotal = 0;

    for (const item of dto.items) {
      const variant = byId.get(item.variantId);
      if (!variant) {
        throw new BadRequestException(`La variante ${item.variantId} no está disponible`);
      }
      if (item.quantity > variant.stock) {
        throw new BadRequestException(
          `Stock insuficiente para ${variant.name} (disponibles: ${variant.stock})`,
        );
      }

      const engraving = this.resolveEngraving(item.engraving, variant.product);
      const unitPrice = variant.price ?? variant.product.price;
      const lineTotal = (unitPrice + (engraving?.price ?? 0)) * item.quantity;
      subtotal += lineTotal;

      itemsData.push({
        variantId: variant.id,
        productId: variant.productId,
        name: variant.name,
        sku: variant.sku,
        unitPrice,
        quantity: item.quantity,
        total: lineTotal,
        options: variant.options as Prisma.InputJsonValue,
        engraving: engraving ? (engraving as unknown as Prisma.InputJsonValue) : undefined,
      });

      messageItems.push({
        name: variant.name,
        sku: variant.sku,
        quantity: item.quantity,
        unitPrice,
        total: lineTotal,
        options: variant.options as unknown as Record<string, unknown>,
        engraving: engraving
          ? {
              enabled: true,
              text: engraving.text,
              fontLabel: engraving.fontLabel,
              placementLabel: engraving.placementLabel,
              price: engraving.price,
            }
          : null,
      });
    }

    /* ── Envío nacional ─────────────────────────────────────────────────── */
    const address = dto.shippingAddress as unknown as Record<string, unknown>;
    const zone = await this.shipping.resolve({
      code: dto.shippingZoneCode,
      department: dto.shippingAddress.department,
      city: dto.shippingAddress.city,
    });

    if (dto.shippingZoneCode && !zone) {
      throw new BadRequestException(`Zona de envío "${dto.shippingZoneCode}" no válida`);
    }

    const shippingCost = zone ? this.shipping.quote(zone, subtotal) : FALLBACK_SHIPPING;
    const total = subtotal + shippingCost;
    const currency = variants[0].product.currency;
    const orderNumber = this.generateOrderNumber();

    /* ── Mensaje de WhatsApp (misma fuente para guardar y abrir) ───────── */
    const config = await this.prisma.storeConfig.findUnique({ where: { id: 'singleton' } });
    const addressFields = extractShippingAddress(address);
    const whatsappMessage = buildWhatsAppMessage({
      orderNumber,
      storeName: config?.storeName,
      customerName: dto.customerName,
      phone: dto.phone,
      email: dto.email,
      items: messageItems,
      shippingDepartment: addressFields.department ?? dto.shippingAddress.department,
      shippingCity: addressFields.city ?? dto.shippingAddress.city,
      shippingAddress: addressFields.line1 ?? dto.shippingAddress.line1,
      shippingReference: addressFields.reference ?? dto.shippingAddress.reference,
      shippingCost,
      shippingEta: zone?.estimatedDays ?? null,
      subtotal,
      total,
      currency,
      notes: dto.notes,
    });

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        email: dto.email,
        customerName: dto.customerName,
        phone: dto.phone,
        notes: dto.notes,
        status: 'PENDING',
        shippingAddress: dto.shippingAddress as unknown as Prisma.InputJsonValue,
        shippingDepartment: dto.shippingAddress.department,
        shippingZoneId: zone?.id,
        subtotal,
        shipping: shippingCost,
        total,
        currency,
        whatsappMessage,
        items: { create: itemsData },
      },
      include: { items: true, shippingZone: true },
    });

    const phone = config?.whatsappNumber;
    return {
      ...order,
      formattedTotal: formatMoney(total, currency),
      whatsappUrl: phone ? buildWhatsAppUrl(phone, whatsappMessage) : null,
      whatsappMessage,
    };
  }

  findRecent(take = 20) {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: { items: true, shippingZone: true },
    });
  }

  async findByNumber(orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true, shippingZone: true },
    });
    if (!order) throw new NotFoundException(`Pedido ${orderNumber} no encontrado`);
    return order;
  }

  /**
   * Marca el pedido como confirmado cuando el cliente ya envió el WhatsApp.
   * Es idempotente y solo devuelve datos no sensibles: el endpoint es público
   * porque lo invoca el checkout, por lo que nunca expone el pedido completo.
   */
  async confirmWhatsApp(orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      select: { status: true },
    });
    if (!order) throw new NotFoundException(`Pedido ${orderNumber} no encontrado`);

    if (order.status !== 'PENDING') {
      return { orderNumber, status: order.status, changed: false };
    }

    const updated = await this.prisma.order.update({
      where: { orderNumber },
      data: { status: 'CONFIRMED_WHATSAPP' },
      select: { orderNumber: true, status: true, updatedAt: true },
    });
    return { ...updated, changed: true };
  }

  /* ── Administración ──────────────────────────────────────────────────── */

  /** Listado paginado con búsqueda y filtro por estado. */
  async adminFindAll(params: {
    status?: OrderStatus;
    search?: string;
    from?: string;
    to?: string;
    take?: number;
    skip?: number;
  }) {
    const take = Math.min(100, Math.max(1, params.take ?? 20));
    const skip = Math.max(0, params.skip ?? 0);

    const and: Prisma.OrderWhereInput[] = [];
    if (params.search?.trim()) {
      const search = params.search.trim();
      and.push({
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (params.from || params.to) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (params.from) createdAt.gte = new Date(params.from);
      if (params.to) {
        const end = new Date(params.to);
        end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      and.push({ createdAt });
    }

    const where: Prisma.OrderWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(and.length ? { AND: and } : {}),
    };

    const [items, total, grouped] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: {
          shippingZone: true,
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const statusCounts = Object.fromEntries(
      grouped.map((row) => [row.status, row._count._all]),
    ) as Record<OrderStatus, number>;

    return { items, total, take, skip, statusCounts };
  }

  /** Detalle completo + enlace de WhatsApp listo para reenviar. */
  async adminFindByNumber(orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true, shippingZone: true },
    });
    if (!order) throw new NotFoundException(`Pedido ${orderNumber} no encontrado`);

    const config = await this.prisma.storeConfig.findUnique({
      where: { id: 'singleton' },
      select: { whatsappNumber: true },
    });

    return {
      ...order,
      whatsappUrl:
        config?.whatsappNumber && order.whatsappMessage
          ? buildWhatsAppUrl(config.whatsappNumber, order.whatsappMessage)
          : null,
    };
  }

  async updateStatus(orderNumber: string, status: OrderStatus) {
    await this.ensureOrder(orderNumber);
    return this.prisma.order.update({
      where: { orderNumber },
      data: { status },
      include: { items: true, shippingZone: true },
    });
  }

  async updateNotes(orderNumber: string, notes?: string | null) {
    await this.ensureOrder(orderNumber);
    return this.prisma.order.update({
      where: { orderNumber },
      data: { notes: notes?.trim() || null },
      include: { items: true, shippingZone: true },
    });
  }

  private async ensureOrder(orderNumber: string) {
    const count = await this.prisma.order.count({ where: { orderNumber } });
    if (!count) throw new NotFoundException(`Pedido ${orderNumber} no encontrado`);
  }

  private resolveEngraving(
    engraving: EngravingDto | undefined,
    product: { engraving: Prisma.JsonValue | null; name: string },
  ) {
    if (!engraving?.enabled) return null;

    const config = parseEngravingConfig(product.engraving);
    if (!config) {
      throw new BadRequestException(`${product.name} no admite grabado láser`);
    }

    const text = engraving.text?.trim() ?? '';
    if (!text) {
      throw new BadRequestException('El texto del grabado no puede estar vacío');
    }
    if (text.length > config.maxChars) {
      throw new BadRequestException(
        `El grabado admite un máximo de ${config.maxChars} caracteres`,
      );
    }

    const font = config.fonts.find((f) => f.id === engraving.font);
    const placement = config.placements.find((p) => p.id === engraving.placement);
    if (engraving.font && !font) {
      throw new BadRequestException('Tipografía de grabado no válida');
    }
    if (engraving.placement && !placement) {
      throw new BadRequestException('Ubicación de grabado no válida');
    }

    return {
      enabled: true,
      text,
      font: font?.id ?? config.fonts[0]?.id ?? 'serif',
      fontLabel: font?.label ?? config.fonts[0]?.label ?? 'Clásica',
      placement: placement?.id ?? config.placements[0]?.id ?? 'interior',
      placementLabel:
        placement?.label ?? config.placements[0]?.label ?? 'Interior',
      price: config.price,
    };
  }

  private generateOrderNumber(): string {
    const stamp = Date.now().toString(36).toUpperCase();
    const rnd = Math.floor(Math.random() * 1296)
      .toString(36)
      .padStart(2, '0')
      .toUpperCase();
    return `ORD-${stamp}${rnd}`;
  }
}
