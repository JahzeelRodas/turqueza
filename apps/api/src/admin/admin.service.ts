import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const LOW_STOCK_THRESHOLD = 5;

/** `images` es JSON en MySQL; devuelve la primera URL de forma segura. */
function firstImage(value: Prisma.JsonValue | null | undefined): string | null {
  if (!Array.isArray(value)) return null;
  return typeof value[0] === 'string' ? value[0] : null;
}

/** Estados que cuentan como venta consolidada para los KPIs. */
const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED_WHATSAPP,
  OrderStatus.PAID,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /* ── Dashboard ───────────────────────────────────────────────────────── */

  async stats() {
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6),
    );

    const [
      products,
      activeProducts,
      draftProducts,
      archivedProducts,
      categories,
      orders,
      pendingOrders,
      acceptedOrders,
      revenueAgg,
      unitsAgg,
      customersRows,
      lowStockProducts,
      recentOrders,
      statusGroups,
      salesRows,
      topGroups,
      config,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { status: ProductStatus.ACTIVE } }),
      this.prisma.product.count({ where: { status: ProductStatus.DRAFT } }),
      this.prisma.product.count({ where: { status: ProductStatus.ARCHIVED } }),
      this.prisma.category.count(),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { status: { in: REVENUE_STATUSES } } }),
      this.prisma.order.aggregate({
        where: { status: { in: REVENUE_STATUSES } },
        _sum: { total: true, shipping: true },
      }),
      this.prisma.orderItem.aggregate({
        where: { order: { status: { in: REVENUE_STATUSES } } },
        _sum: { quantity: true },
      }),
      this.prisma.order.groupBy({
        by: ['email'],
        where: { status: { not: OrderStatus.CANCELLED } },
        _count: { _all: true },
      }),
      this.prisma.product.findMany({
        where: {
          status: { not: ProductStatus.ARCHIVED },
          OR: [
            { variants: { none: { isActive: true } }, stock: { lte: LOW_STOCK_THRESHOLD } },
            { variants: { some: { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD } } } },
          ],
        },
        orderBy: { stock: 'asc' },
        take: 8,
        select: {
          id: true,
          name: true,
          slug: true,
          stock: true,
          images: true,
          status: true,
          variants: {
            where: { isActive: true },
            select: { stock: true },
          },
        },
      }),
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { _count: { select: { items: true } } },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: start }, status: { not: OrderStatus.CANCELLED } },
        select: { createdAt: true, total: true, status: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          productId: { not: null },
          order: { status: { in: REVENUE_STATUSES } },
        },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      this.prisma.storeConfig.findUnique({
        where: { id: 'singleton' },
        select: { currency: true },
      }),
    ]);

    const revenue = revenueAgg._sum.total ?? 0;
    const productIds = topGroups
      .map((row) => row.productId)
      .filter((id): id is string => Boolean(id));
    const topProducts =
      productIds.length > 0
        ? await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, slug: true, images: true },
          })
        : [];

    const productById = new Map(topProducts.map((p) => [p.id, p]));

    const salesByDay = buildSalesByDay(salesRows);
    const statusCounts = Object.fromEntries(
      statusGroups.map((row) => [row.status, row._count._all]),
    ) as Record<OrderStatus, number>;

    return {
      currency: config?.currency ?? 'BOB',
      revenue,
      shippingRevenue: revenueAgg._sum.shipping ?? 0,
      orders,
      acceptedOrders,
      pendingOrders,
      products,
      activeProducts,
      draftProducts,
      archivedProducts,
      categories,
      customers: customersRows.filter((row) => row.email?.trim()).length,      unitsSold: unitsAgg._sum.quantity ?? 0,
      averageTicket: acceptedOrders > 0 ? Math.round(revenue / acceptedOrders) : 0,
      lowStockCount: await this.prisma.product.count({
        where: {
          status: { not: ProductStatus.ARCHIVED },
          OR: [
            { variants: { none: { isActive: true } }, stock: { lte: LOW_STOCK_THRESHOLD } },
            { variants: { some: { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD } } } },
          ],
        },
      }),
      lowStockProducts,
      recentOrders,
      salesByDay,
      statusCounts,
      topProducts: topGroups.map((row) => {
        const product = row.productId ? productById.get(row.productId) : null;
        return {
          productId: row.productId,
          name: product?.name ?? 'Producto eliminado',
          slug: product?.slug ?? null,
          image: firstImage(product?.images),
          quantity: row._sum.quantity ?? 0,
          revenue: row._sum.total ?? 0,
        };
      }),
    };
  }

  /* ── Inventario ──────────────────────────────────────────────────────── */

  async inventory(params: {
    search?: string;
    lowStock?: boolean;
    take?: number;
    skip?: number;
  }) {
    const take = Math.min(200, Math.max(1, params.take ?? 50));
    const skip = Math.max(0, params.skip ?? 0);

    const and: Prisma.ProductWhereInput[] = [];
    if (params.search?.trim()) {
      const search = params.search.trim();
      and.push({
        OR: [
          { name: { contains: search } },
          { slug: { contains: search } },
          { variants: { some: { sku: { contains: search } } } },
        ],
      });
    }
    if (params.lowStock) {
      and.push({
        OR: [
          { variants: { none: { isActive: true } }, stock: { lte: LOW_STOCK_THRESHOLD } },
          { variants: { some: { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD } } } },
        ],
      });
    }

    const where: Prisma.ProductWhereInput = {
      status: { not: ProductStatus.ARCHIVED },
      ...(and.length ? { AND: and } : {}),
    };

    const [
      items,
      total,
      variantCount,
      lowStockVariants,
      outOfStockVariants,
      productsWithoutVariants,
      lowStockProductsNoVariants,
      outOfStockProductsNoVariants,
      variantStock,
      simpleProductStock,
    ] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: [{ stock: 'asc' }, { name: 'asc' }],
        take,
        skip,
        select: {
          id: true,
          name: true,
          slug: true,
          stock: true,
          status: true,
          images: true,
          category: { select: { id: true, name: true } },
          variants: {
            orderBy: { position: 'asc' },
            select: {
              id: true,
              sku: true,
              name: true,
              stock: true,
              price: true,
              isActive: true,
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
      this.prisma.productVariant.count({
        where: { isActive: true, product: { status: { not: ProductStatus.ARCHIVED } } },
      }),
      this.prisma.productVariant.count({
        where: {
          isActive: true,
          stock: { lte: LOW_STOCK_THRESHOLD },
          product: { status: { not: ProductStatus.ARCHIVED } },
        },
      }),
      this.prisma.productVariant.count({
        where: {
          isActive: true,
          stock: 0,
          product: { status: { not: ProductStatus.ARCHIVED } },
        },
      }),
      this.prisma.product.count({
        where: {
          status: { not: ProductStatus.ARCHIVED },
          variants: { none: {} },
        },
      }),
      this.prisma.product.count({
        where: {
          status: { not: ProductStatus.ARCHIVED },
          variants: { none: {} },
          stock: { lte: LOW_STOCK_THRESHOLD },
        },
      }),
      this.prisma.product.count({
        where: {
          status: { not: ProductStatus.ARCHIVED },
          variants: { none: {} },
          stock: 0,
        },
      }),
      this.prisma.productVariant.aggregate({
        where: { isActive: true, product: { status: { not: ProductStatus.ARCHIVED } } },
        _sum: { stock: true },
      }),
      this.prisma.product.aggregate({
        where: {
          status: { not: ProductStatus.ARCHIVED },
          variants: { none: {} },
        },
        _sum: { stock: true },
      }),
    ]);

    return {
      items,
      total,
      take,
      skip,
      stats: {
        totalSkus: variantCount + productsWithoutVariants,
        lowStock: lowStockVariants + lowStockProductsNoVariants,
        outOfStock: outOfStockVariants + outOfStockProductsNoVariants,
        totalUnits:
          (variantStock._sum.stock ?? 0) + (simpleProductStock._sum.stock ?? 0),
      },
    };
  }

  /* ── Clientes (derivados de pedidos) ─────────────────────────────────── */

  async customers(search?: string) {
    const rows = await this.prisma.order.findMany({
      where: { status: { not: OrderStatus.CANCELLED } },
      orderBy: { createdAt: 'desc' },
      select: {
        orderNumber: true,
        email: true,
        customerName: true,
        phone: true,
        total: true,
        currency: true,
        shippingAddress: true,
        createdAt: true,
        status: true,
      },
    });

    const map = new Map<
      string,
      {
        email: string;
        name: string;
        phone: string | null;
        orders: number;
        totalSpent: number;
        currency: string;
        lastOrderAt: Date;
        firstOrderAt: Date;
        lastOrderNumber: string;
        lastStatus: OrderStatus;
        department: string | null;
        city: string | null;
      }
    >();

    for (const row of rows) {
      const email = row.email.trim().toLowerCase();
      if (!email) continue;
      const address = asRecord(row.shippingAddress);
      const existing = map.get(email);
      if (!existing) {
        map.set(email, {
          email,
          name: row.customerName,
          phone: row.phone,
          orders: 1,
          totalSpent: row.total,
          currency: row.currency,
          lastOrderAt: row.createdAt,
          firstOrderAt: row.createdAt,
          lastOrderNumber: row.orderNumber,
          lastStatus: row.status,
          department: stringOrNull(address.department),
          city: stringOrNull(address.city),
        });
      } else {
        existing.orders += 1;
        existing.totalSpent += row.total;
        if (row.createdAt < existing.firstOrderAt) existing.firstOrderAt = row.createdAt;
      }
    }

    let list = [...map.values()];
    if (search?.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.email.includes(term) ||
          c.name.toLowerCase().includes(term) ||
          (c.phone ?? '').toLowerCase().includes(term),
      );
    }
    list.sort((a, b) => b.totalSpent - a.totalSpent);

    return {
      items: list,
      total: list.length,
      stats: {
        totalCustomers: list.length,
        repeatCustomers: list.filter((c) => c.orders > 1).length,
        averageLifetimeValue:
          list.length > 0
            ? Math.round(list.reduce((acc, c) => acc + c.totalSpent, 0) / list.length)
            : 0,
      },
    };
  }
}

function buildSalesByDay(
  rows: Array<{ createdAt: Date; total: number; status: OrderStatus }>,
) {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6),
  );
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start.getTime() + index * 86_400_000);
    return {
      date: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('es-BO', {
        weekday: 'short',
        timeZone: 'UTC',
      }),
      revenue: 0,
      orders: 0,
    };
  });
  const byDate = new Map(days.map((day) => [day.date, day]));

  for (const row of rows) {
    const key = row.createdAt.toISOString().slice(0, 10);
    const day = byDate.get(key);
    if (!day) continue;
    day.revenue += row.total;
    day.orders += 1;
  }

  return days;
}

function asRecord(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}
