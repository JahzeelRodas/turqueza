import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { CreateProductDto, CreateProductVariantDto, UpdateProductDto, UpdateProductVariantDto } from '../products/dtos/create-product.dto';
import { ProductsService } from '../products/products.service';
import { AdminGuard } from './admin.guard';
import { BulkDiscountDto, UpdateProductStatusDto, UpdateStockDto } from './dtos/product.dto';

@Controller('admin/products')
@UseGuards(AdminGuard)
export class AdminProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('category') categoryId?: string,
    @Query('lowStock') lowStock?: string,
    @Query('sort') sort?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.products.adminFindAll({
      search: search || undefined,
      status: parseStatus(status),
      categoryId: categoryId || undefined,
      lowStock: lowStock === 'true',
      sort,
      take: parseNumber(take),
      skip: parseNumber(skip),
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.products.adminFindById(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  /** Ofertas masivas: aplicar % a todos, a una selección, o retirarlas. */
  @Patch('bulk-discount')
  bulkDiscount(@Body() dto: BulkDiscountDto) {
    return this.products.bulkDiscount(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.products.remove(id);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string) {
    return this.products.duplicate(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateProductStatusDto) {
    return this.products.updateStatus(id, dto.status);
  }

  @Patch(':id/stock')
  updateStock(@Param('id') id: string, @Body() dto: UpdateStockDto) {
    return this.products.updateStock(id, dto.stock);
  }

  @Post(':id/variants')
  createVariant(@Param('id') id: string, @Body() dto: CreateProductVariantDto) {
    return this.products.createVariant(id, dto);
  }

  @Patch(':id/variants/:variantId')
  updateVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.products.updateVariant(id, variantId, dto);
  }

  @Delete(':id/variants/:variantId')
  removeVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
  ) {
    return this.products.removeVariant(id, variantId);
  }
}

function parseStatus(value?: string): ProductStatus | undefined {
  if (!value) return undefined;
  if (Object.values(ProductStatus).includes(value as ProductStatus)) {
    return value as ProductStatus;
  }
  throw new BadRequestException('Estado de producto no válido');
}

function parseNumber(value?: string): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
