import { Controller, Get } from '@nestjs/common';
import { ShippingService } from './shipping.service';

@Controller('shipping-zones')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  /** GET /api/shipping-zones — destinos y costos de envío nacionales. */
  @Get()
  findAll() {
    return this.shippingService.findAll();
  }
}
