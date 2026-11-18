import { OrderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, { message: 'Estado de pedido no válido' })
  status!: OrderStatus;
}

export class UpdateOrderNotesDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
