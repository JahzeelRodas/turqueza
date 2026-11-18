import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { slugify } from '../common/slugify';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../admin/dtos/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /* ── Público ─────────────────────────────────────────────────────────── */

  /** Árbol de categorías activas con contador de productos (para el mega menú). */
  async findAll() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        position: true,
        parentId: true,
        _count: { select: { products: true } },
      },
    });
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findFirst({
      where: { slug, isActive: true },
      include: {
        products: {
          where: { status: 'ACTIVE' },
          include: { variants: { orderBy: { position: 'asc' } } },
          take: 48,
        },
      },
    });
    if (!category) throw new NotFoundException(`Categoría "${slug}" no encontrada`);
    return category;
  }

  /* ── Administración ──────────────────────────────────────────────────── */

  adminFindAll() {
    return this.prisma.category.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { products: true, children: true } },
      },
    });
  }

  async adminFindById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { products: true, children: true } },
      },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    await this.assertParentValid(null, dto.parentId);
    try {
      return await this.prisma.category.create({
        data: {
          name: dto.name.trim(),
          slug: dto.slug?.trim() || (await this.uniqueSlug(slugify(dto.name))),
          description: dto.description || null,
          imageUrl: dto.imageUrl || null,
          position: dto.position ?? 0,
          isActive: dto.isActive ?? true,
          parentId: dto.parentId || null,
        },
        include: {
          _count: { select: { products: true, children: true } },
        },
      });
    } catch (error) {
      throw uniqueError(error);
    }
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const current = await this.prisma.category.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Categoría no encontrada');

    if (dto.parentId !== undefined) {
      await this.assertParentValid(id, dto.parentId);
    }

    try {
      return await this.prisma.category.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.slug !== undefined
            ? { slug: dto.slug.trim() || slugify(dto.name ?? current.name) }
            : {}),
          ...(dto.description !== undefined
            ? { description: dto.description || null }
            : {}),
          ...(dto.imageUrl !== undefined
            ? { imageUrl: dto.imageUrl || null }
            : {}),
          ...(dto.position !== undefined ? { position: dto.position } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.parentId !== undefined
            ? { parentId: dto.parentId || null }
            : {}),
        },
        include: {
          parent: { select: { id: true, name: true } },
          _count: { select: { products: true, children: true } },
        },
      });
    } catch (error) {
      throw uniqueError(error);
    }
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada');

    await this.prisma.category.delete({ where: { id } });
    return {
      deleted: true,
      id,
      detachedProducts: category._count.products,
      detachedChildren: category._count.children,
    };
  }

  /* ── Helpers ─────────────────────────────────────────────────────────── */

  /** Evita ciclos al mover una categoría dentro de su propio árbol. */
  private async assertParentValid(id: string | null, parentId?: string | null) {
    if (!parentId) return;
    if (id && parentId === id) {
      throw new BadRequestException('Una categoría no puede ser su propio padre');
    }

    const parent = await this.prisma.category.findUnique({
      where: { id: parentId },
      select: { id: true, parentId: true },
    });
    if (!parent) throw new BadRequestException('La categoría padre no existe');

    if (!id) return;
    let cursor: string | null = parent.parentId;
    while (cursor) {
      if (cursor === id) {
        throw new BadRequestException(
          'No puedes mover una categoría dentro de una de sus subcategorías',
        );
      }
      const next: { parentId: string | null } | null =
        await this.prisma.category.findUnique({
          where: { id: cursor },
          select: { parentId: true },
        });
      cursor = next?.parentId ?? null;
    }
  }

  private async uniqueSlug(base: string) {
    const safe = base || 'categoria';
    let candidate = safe;
    let counter = 2;
    while (await this.prisma.category.count({ where: { slug: candidate } })) {
      candidate = `${safe}-${counter++}`;
    }
    return candidate;
  }
}

function uniqueError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return new ConflictException('Ya existe una categoría con ese slug');
    }
    if (error.code === 'P2025') {
      return new NotFoundException('La categoría ya no existe');
    }
  }
  return error;
}
