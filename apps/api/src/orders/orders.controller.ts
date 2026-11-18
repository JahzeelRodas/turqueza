import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { CreateOrderDto } from './dtos/create-order.dto';
import { OrdersService } from './orders.service';

/**
 * Checkout público. La consulta y gestión de pedidos vive en /api/admin/orders
 * (requiere sesión) para no exponer datos personales de clientes.
 */
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /** POST /api/orders — checkout (los precios se recalculan siempre en servidor). */
  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  /** PATCH /api/orders/:orderNumber/confirm-whatsapp — audita el envío del mensaje. */
  @Patch(':orderNumber/confirm-whatsapp')
  confirmWhatsApp(@Param('orderNumber') orderNumber: string) {
    return this.ordersService.confirmWhatsApp(orderNumber);
  }
}
