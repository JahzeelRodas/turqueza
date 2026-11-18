import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ShippingAddressDto {
  @IsString() @IsNotEmpty()
  fullName!: string;

  /** Calle, número, zona. */
  @IsString() @IsNotEmpty()
  line1!: string;

  @IsOptional() @IsString()
  line2?: string;

  /** Departamento de Bolivia (La Paz, Santa Cruz, ...). */
  @IsString() @IsNotEmpty()
  department!: string;

  @IsString() @IsNotEmpty()
  city!: string;

  /** Código postal (opcional en Bolivia). */
  @IsOptional() @IsString()
  postalCode?: string;

  @IsOptional() @IsString()
  country?: string;

  /** Punto de referencia para el repartidor. */
  @IsOptional() @IsString()
  reference?: string;

  @IsOptional() @IsString()
  phone?: string;
}

export class EngravingDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional() @IsString() @MaxLength(24)
  text?: string;

  /** ID de la tipografía configurada en el producto. */
  @IsOptional() @IsString()
  font?: string;

  @IsOptional() @IsIn(['interior', 'exterior'])
  placement?: 'interior' | 'exterior';

  /** Etiquetas legibles resueltas por el cliente (auditoría del pedido). */
  @IsOptional() @IsString()
  fontLabel?: string;

  @IsOptional() @IsString()
  placementLabel?: string;
}

export class CreateOrderItemDto {
  @IsString() @IsNotEmpty()
  variantId!: string;

  @IsInt() @Min(1)
  quantity!: number;

  @IsOptional() @IsObject() @ValidateNested() @Type(() => EngravingDto)
  engraving?: EngravingDto;
}

export class CreateOrderDto {
  @IsEmail()
  email!: string;

  @IsString() @IsNotEmpty()
  customerName!: string;

  @IsOptional() @IsString()
  phone?: string;

  /** Código de zona ("LP") o nombre del departamento. */
  @IsOptional() @IsString()
  shippingZoneCode?: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsObject() @ValidateNested() @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;

  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
