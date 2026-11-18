import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { slugify } from '../common/slugify';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateProductDto,
  CreateProductVariantDto,
} from './dtos/create-product.dto';

const PRODUCT_INCLUDE = {
  variants: { orderBy: { position: 'asc' as const } },
  category: true,
} satisfies Prisma.ProductInclude;

const LOW_STOCK_THRESHOLD = 5;

type AdminProductQuery = {
  search?: string;
  status?: ProductStatus;
  categoryId?: string;
  lowStock?: boolean;
  sort?: string;
  take?: number;
  skip?: number;
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /* ── Catálogo público ────────────────────────────────────────────────── */

  /** Listado público con filtros para el storefront. */
  findAll(params: {
    categorySlug?: string;
    featured?: boolean;
    onSale?: boolean;
    search?: string;
    take?: number;
    skip?: number;
  }) {
    const { categorySlug, featured, onSale, search, take = 24, skip = 0 } = params;

    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      ...(featured ? { isFeatured: true } : {}),
      ...(onSale ? { compareAtPrice: { not: null } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.product
      .findMany({
        where,
        include: PRODUCT_INCLUDE,
        take,
        skip,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      })
      .then((items) =>
        onSale
          ? items.filter(
              (product) =>
                product.compareAtPrice !== null && product.compareAtPrice > product.price,
            )
          : items,
      );
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      // Los borradores solo son visibles desde el panel de administración.
      where: { slug, status: ProductStatus.ACTIVE },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw new NotFoundException(`Producto "${slug}" no encontrado`);
    return product;
  }

  /* ── Administración ──────────────────────────────────────────────────── */

  /** Listado completo (incluye borradores y archivados) con paginación. */
  async adminFindAll(params: AdminProductQuery) {
    const take = Math.min(100, Math.max(1, params.take ?? 20));
    const skip = Math.max(0, params.skip ?? 0);
    const where: Prisma.ProductWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    };

    const and: Prisma.ProductWhereInput[] = [];
    if (params.search?.trim()) {
      const search = params.search.trim();
      and.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
          { subtitle: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } },
          { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
        ],
      });
    }
    if (params.lowStock) {
      and.push({
        OR: [
          {
            variants: { none: { isActive: true } },
            stock: { lte: LOW_STOCK_THRESHOLD },
          },
          {
            variants: {
              some: { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD } },
            },
          },
        ],
      });
    }
    if (and.length) where.AND = and;

    const orderBy = resolveOrderBy(params.sort);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        take,
        skip,
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, take, skip };
  }

  async adminFindById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async create(dto: CreateProductDto) {
    const { variants, engraving, ...data } = dto;
    try {
      return await this.prisma.product.create({
        data: {
          ...data,
          slug: data.slug?.trim() || (await this.uniqueSlug(slugify(data.name))),
          categoryId: data.categoryId || null,
          metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
          attributes: (data.attributes ?? {}) as Prisma.InputJsonValue,
          engraving: engraving
            ? (engraving as Prisma.InputJsonValue)
            : undefined,
          status: dto.status ?? ProductStatus.ACTIVE,
          variants: {
            create: (variants ?? []).map((variant) => ({
              ...stripVariantId(variant),
              options: (variant.options ?? {}) as Prisma.InputJsonValue,
            })),
          },
        },
        include: PRODUCT_INCLUDE,
      });
    } catch (error) {
      throw uniqueError(error);
    }
  }

  async update(id: string, dto: Partial<CreateProductDto>) {
    await this.ensureExists(id);
    const {
      variants,
      metadata,
      attributes,
      engraving,
      slug,
      categoryId,
      ...rest
    } = dto;

    const updateData: Prisma.ProductUncheckedUpdateInput = {
      ...rest,
      ...(slug !== undefined
        ? { slug: slug.trim() || slugify(dto.name ?? 'producto') }
        : {}),
      ...(categoryId !== undefined ? { categoryId: categoryId || null } : {}),
      ...(metadata !== undefined
        ? { metadata: metadata as Prisma.InputJsonValue }
        : {}),
      ...(attributes !== undefined
        ? { attributes: attributes as Prisma.InputJsonValue }
        : {}),
      ...(engraving !== undefined
        ? {
            engraving: engraving
              ? (engraving as Prisma.InputJsonValue)
              : Prisma.DbNull,
          }
        : {}),
    };
    // El DTO no incluye estas claves; evita writes accidentales.
    delete (updateData as Record<string, unknown>).variants;

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (variants !== undefined) {
          await this.syncVariants(tx, id, variants);
        }
        return tx.product.update({
          where: { id },
          data: updateData,
          include: PRODUCT_INCLUDE,
        });
      });
    } catch (error) {
      throw uniqueError(error);
    }
  }

  async updateStatus(id: string, status: ProductStatus) {
    await this.ensureExists(id);
    return this.prisma.product.update({
      where: { id },
      data: { status },
      include: PRODUCT_INCLUDE,
    });
  }

  async updateStock(id: string, stock: number) {
    await this.ensureExists(id);
    return this.prisma.product.update({
      where: { id },
      data: { stock },
      include: PRODUCT_INCLUDE,
    });
  }

  /**
   * Aplica (o retira) un descuento porcentual masivo.
   *
   * El precio original se conserva en `compareAtPrice` (producto y variante),
   * de modo que aplicar 20% dos veces no acumula descuentos: la segunda vez se
   * recalcula sobre el mismo precio base. Al retirar la oferta, el precio
   * vuelve exactamente al valor original.
   */
  async bulkDiscount(input: {
    discountPercent?: number | null;
    productIds?: string[];
    includeArchived?: boolean;
  }) {
    if (input.discountPercent === undefined) {
      throw new BadRequestException(
        'Indica el porcentaje de descuento (o null para retirar la oferta)',
      );
    }
    const percent = input.discountPercent;
    if (percent !== null && (percent < 1 || percent > 90)) {
      throw new BadRequestException('El descuento debe estar entre 1% y 90%');
    }

    const where: Prisma.ProductWhereInput = {
      ...(input.includeArchived ? {} : { status: { not: ProductStatus.ARCHIVED } }),
      ...(input.productIds?.length ? { id: { in: input.productIds } } : {}),
    };

    const products = await this.prisma.product.findMany({
      where,
      select: {
        id: true,
        price: true,
        compareAtPrice: true,
        variants: {
          select: { id: true, price: true, compareAtPrice: true },
        },
      },
    });

    if (products.length === 0) {
      return { updated: 0, discountPercent: percent, affectedProducts: 0 };
    }

    const operations: Prisma.PrismaPromise<unknown>[] = [];

    for (const product of products) {
      if (percent === null) {
        const originalPrice = product.compareAtPrice ?? product.price;
        operations.push(
          this.prisma.product.update({
            where: { id: product.id },
            data: { price: originalPrice, compareAtPrice: null },
          }),
        );
        for (const variant of product.variants) {
          if (variant.compareAtPrice === null) continue;
          operations.push(
            this.prisma.productVariant.update({
              where: { id: variant.id },
              data: { price: variant.compareAtPrice, compareAtPrice: null },
            }),
          );
        }
        continue;
      }

      const basePrice = product.compareAtPrice ?? product.price;
      operations.push(
        this.prisma.product.update({
          where: { id: product.id },
          data: {
            price: discountedPrice(basePrice, percent),
            compareAtPrice: basePrice,
          },
        }),
      );

      for (const variant of product.variants) {
        if (variant.price === null) continue;
        const baseVariantPrice = variant.compareAtPrice ?? variant.price;
        operations.push(
          this.prisma.productVariant.update({
            where: { id: variant.id },
            data: {
              price: discountedPrice(baseVariantPrice, percent),
              compareAtPrice: baseVariantPrice,
            },
          }),
        );
      }
    }

    // Se ejecuta en lotes para catálogos grandes y mantener la transacción ligera.
    for (let index = 0; index < operations.length; index += 50) {
      await this.prisma.$transaction(operations.slice(index, index + 50));
    }

    return {
      updated: products.length,
      affectedProducts: products.length,
      discountPercent: percent,
    };
  }

  async duplicate(id: string) {
    const source = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });
    if (!source) throw new NotFoundException('Producto no encontrado');

    const suffix = Date.now().toString(36).slice(-5).toUpperCase();
    try {
      return await this.prisma.product.create({
        data: {
          name: `${source.name} (copia)`,
          slug: await this.uniqueSlug(`${source.slug}-copia`),
          subtitle: source.subtitle,
          description: source.description,
          price: source.price,
          compareAtPrice: source.compareAtPrice,
          currency: source.currency,
          images: source.images,
          status: ProductStatus.DRAFT,
          isFeatured: false,
          stock: source.stock,
          tags: source.tags,
          metadata: source.metadata as Prisma.InputJsonValue,
          attributes: source.attributes as Prisma.InputJsonValue,
          engraving: source.engraving
            ? (source.engraving as Prisma.InputJsonValue)
            : undefined,
          categoryId: source.categoryId,
          variants: {
            create: source.variants.map((variant, index) => ({
              sku: `${variant.sku}-${suffix}`,
              name: variant.name,
              price: variant.price,
              stock: variant.stock,
              isActive: variant.isActive,
              position: index,
              imageUrl: variant.imageUrl,
              options: variant.options as Prisma.InputJsonValue,
            })),
          },
        },
        include: PRODUCT_INCLUDE,
      });
    } catch (error) {
      throw uniqueError(error);
    }
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.product.delete({ where: { id } });
    return { deleted: true, id };
  }

  /* ── Variantes ───────────────────────────────────────────────────────── */

  async createVariant(productId: string, dto: CreateProductVariantDto) {
    await this.ensureExists(productId);
    try {
      return await this.prisma.productVariant.create({
        data: {
          ...stripVariantId(dto),
          productId,
          options: (dto.options ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      throw uniqueError(error);
    }
  }

  async updateVariant(
    productId: string,
    variantId: string,
    dto: Partial<CreateProductVariantDto>,
  ) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      select: { id: true },
    });
    if (!variant) throw new NotFoundException('Variante no encontrada');

    const { id: _id, options, ...rest } = dto;
    try {
      return await this.prisma.productVariant.update({
        where: { id: variantId },
        data: {
          ...rest,
          ...(options !== undefined
            ? { options: options as Prisma.InputJsonValue }
            : {}),
        },
      });
    } catch (error) {
      throw uniqueError(error);
    }
  }

  async removeVariant(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      select: { id: true },
    });
    if (!variant) throw new NotFoundException('Variante no encontrada');

    // Si ya está referenciada en pedidos no se borra: se desactiva para
    // conservar la trazabilidad histórica.
    const refs = await this.prisma.orderItem.count({ where: { variantId } });
    if (refs > 0) {
      await this.prisma.productVariant.update({
        where: { id: variantId },
        data: { isActive: false },
      });
      return { deleted: false, deactivated: true, id: variantId };
    }
    await this.prisma.productVariant.delete({ where: { id: variantId } });
    return { deleted: true, id: variantId };
  }

  /* ── Helpers ─────────────────────────────────────────────────────────── */

  private async syncVariants(
    tx: Prisma.TransactionClient,
    productId: string,
    variants: CreateProductVariantDto[],
  ) {
    const current = await tx.productVariant.findMany({
      where: { productId },
      select: { id: true },
    });
    const currentIds = new Set(current.map((v) => v.id));
    const incomingIds = new Set(
      variants.map((v) => v.id).filter((v): v is string => Boolean(v)),
    );

    for (const id of incomingIds) {
      if (!currentIds.has(id)) {
        throw new BadRequestException(`La variante ${id} no pertenece al producto`);
      }
    }

    for (const variant of variants) {
      const { id, options, ...rest } = variant;
      const data = {
        ...rest,
        options: (options ?? {}) as Prisma.InputJsonValue,
      };
      if (id) {
        await tx.productVariant.update({ where: { id }, data });
      } else {
        await tx.productVariant.create({ data: { ...data, productId } });
      }
    }

    const removed = current.filter((v) => !incomingIds.has(v.id));
    for (const variant of removed) {
      const refs = await tx.orderItem.count({
        where: { variantId: variant.id },
      });
      if (refs > 0) {
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { isActive: false },
        });
      } else {
        await tx.productVariant.delete({ where: { id: variant.id } });
      }
    }
  }

  private async uniqueSlug(base: string) {
    const safe = base || 'producto';
    let candidate = safe;
    let counter = 2;
    while (await this.prisma.product.count({ where: { slug: candidate } })) {
      candidate = `${safe}-${counter++}`;
    }
    return candidate;
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.product.count({ where: { id } });
    if (!exists) throw new NotFoundException('Producto no encontrado');
  }
}

function stripVariantId(variant: CreateProductVariantDto) {
  const { id: _id, ...rest } = variant;
  return rest;
}

/** Redondea a céntimos y garantiza un precio mínimo de 1 céntimo. */
function discountedPrice(basePrice: number, percent: number) {
  return Math.max(1, Math.round((basePrice * (100 - percent)) / 100));
}

function uniqueError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target)
        ? (error.meta?.target as string[]).join(', ')
        : 'slug, SKU';
      return new ConflictException(`Ya existe un registro con ese valor (${target})`);
    }
    if (error.code === 'P2025') {
      return new NotFoundException('El registro ya no existe');
    }
  }
  return error;
}

function resolveOrderBy(sort?: string): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'name':
      return [{ name: 'asc' }];
    case 'price-asc':
      return [{ price: 'asc' }];
    case 'price-desc':
      return [{ price: 'desc' }];
    case 'stock-asc':
      return [{ stock: 'asc' }];
    case 'oldest':
      return [{ createdAt: 'asc' }];
    default:
      return [{ createdAt: 'desc' }];
  }
}
