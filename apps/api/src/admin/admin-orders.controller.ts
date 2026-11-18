import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from '../orders/orders.service';
import { AdminGuard } from './admin.guard';
import { UpdateOrderNotesDto, UpdateOrderStatusDto } from './dtos/order.dto';

@Controller('admin/orders')
@UseGuards(AdminGuard)
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.orders.adminFindAll({
      status:
        status && Object.values(OrderStatus).includes(status as OrderStatus)
          ? (status as OrderStatus)
          : undefined,
      search: search || undefined,
      from: from || undefined,
      to: to || undefined,
      take: parseNumber(take),
      skip: parseNumber(skip),
    });
  }

  @Get(':orderNumber')
  findOne(@Param('orderNumber') orderNumber: string) {
    return this.orders.adminFindByNumber(orderNumber);
  }

  @Patch(':orderNumber/status')
  updateStatus(
    @Param('orderNumber') orderNumber: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orders.updateStatus(orderNumber, dto.status);
  }

  @Patch(':orderNumber/notes')
  updateNotes(
    @Param('orderNumber') orderNumber: string,
    @Body() dto: UpdateOrderNotesDto,
  ) {
    return this.orders.updateNotes(orderNumber, dto.notes);
  }
}

function parseNumber(value?: string): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
