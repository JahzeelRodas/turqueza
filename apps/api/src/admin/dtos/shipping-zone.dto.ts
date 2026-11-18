import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateShippingZoneDto {
  @IsString()
  code!: string;

  @IsString()
  department!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cities?: string[];

  /** Costo en céntimos (Bs 30 = 3000). */
  @IsInt()
  @Min(0)
  price!: number;

  /** Subtotal mínimo para envío gratis, en céntimos. */
  @IsOptional()
  @IsInt()
  @Min(0)
  freeThreshold?: number | null;

  @IsOptional()
  @IsString()
  estimatedDays?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  position?: number;
}

export class UpdateShippingZoneDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cities?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  freeThreshold?: number | null;

  @IsOptional()
  @IsString()
  estimatedDays?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  position?: number;
}
