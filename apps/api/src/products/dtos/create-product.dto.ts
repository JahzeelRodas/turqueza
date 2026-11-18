import { ProductStatus } from '@prisma/client';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Nota: `metadata` (atributos dinámicos del rubro) y `attributes` (flags de UI)
 * se validan como objetos genéricos: son schema less por diseño (JSONB).
 */
export class CreateProductVariantDto {
  /** Solo en actualizaciones: identifica una variante existente. */
  @IsOptional() @IsString()
  id?: string;

  @IsString() @IsNotEmpty()
  sku!: string;

  @IsString() @IsNotEmpty()
  name!: string;

  @IsOptional() @IsInt() @Min(0)
  price?: number;

  @IsOptional() @IsInt() @Min(0)
  compareAtPrice?: number;

  @IsOptional() @IsInt() @Min(0)
  stock?: number;

  @IsOptional() @IsObject()
  options?: Record<string, string>;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsInt()
  position?: number;

  @IsOptional() @IsString()
  imageUrl?: string;
}

export class CreateProductDto {
  @IsString() @IsNotEmpty()
  name!: string;

  @IsOptional() @IsString()
  slug?: string;

  @IsOptional() @IsString()
  subtitle?: string;

  @IsOptional() @IsString()
  description?: string;

  /** Precio en céntimos */
  @IsInt() @Min(0)
  price!: number;

  @IsOptional() @IsInt() @Min(0)
  compareAtPrice?: number;

  @IsOptional() @IsString()
  currency?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  images?: string[];

  @IsOptional() @IsString()
  categoryId?: string | null;

  @IsOptional() @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional() @IsBoolean()
  isFeatured?: boolean;

  @IsOptional() @IsInt() @Min(0)
  stock?: number;

  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  @IsOptional() @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional() @IsObject()
  attributes?: Record<string, unknown>;

  /** Configuración JSONB del grabado láser (null/omitido = no disponible). */
  @IsOptional() @IsObject()
  engraving?: Record<string, unknown> | null;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class UpdateProductVariantDto extends PartialType(CreateProductVariantDto) {}
