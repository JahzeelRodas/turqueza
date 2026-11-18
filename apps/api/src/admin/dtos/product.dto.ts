import { ProductStatus } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateProductStatusDto {
  @IsEnum(ProductStatus, { message: 'Estado de producto no válido' })
  status!: ProductStatus;
}

export class UpdateStockDto {
  @IsInt()
  @Min(0)
  stock!: number;
}

/**
 * Aplica un descuento masivo al catálogo.
 * · `discountPercent` entre 1 y 90 → aplica la oferta.
 * · `discountPercent: null` → retira la oferta y restaura el precio original.
 * · `productIds` vacío/omitido → todos los productos no archivados.
 */
export class BulkDiscountDto {
  @IsOptional()
  @IsInt({ message: 'El descuento debe ser un número entero' })
  @Min(1, { message: 'El descuento mínimo es 1%' })
  @Max(90, { message: 'El descuento máximo es 90%' })
  discountPercent?: number | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @IsOptional()
  @IsBoolean()
  includeArchived?: boolean;
}
