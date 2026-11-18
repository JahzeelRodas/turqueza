import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

/**
 * Catálogo público (solo lectura).
 * Las operaciones de escritura viven en /api/admin/products y requieren sesión.
 */
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /** GET /api/products?category=anillos&featured=true&onSale=true&search=oro&take=8 */
  @Get()
  findAll(
    @Query('category') categorySlug?: string,
    @Query('featured') featured?: string,
    @Query('onSale') onSale?: string,
    @Query('search') search?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.productsService.findAll({
      categorySlug: categorySlug || undefined,
      featured: featured === 'true',
      onSale: onSale === 'true',
      search: search || undefined,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }
}
