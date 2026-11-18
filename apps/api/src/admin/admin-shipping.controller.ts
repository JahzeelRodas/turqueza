import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ShippingService } from '../shipping/shipping.service';
import { AdminGuard } from './admin.guard';
import {
  CreateShippingZoneDto,
  UpdateShippingZoneDto,
} from './dtos/shipping-zone.dto';

@Controller('admin/shipping-zones')
@UseGuards(AdminGuard)
export class AdminShippingController {
  constructor(private readonly shipping: ShippingService) {}

  @Get()
  findAll() {
    return this.shipping.adminFindAll();
  }

  @Post()
  create(@Body() dto: CreateShippingZoneDto) {
    return this.shipping.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateShippingZoneDto) {
    return this.shipping.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.shipping.remove(id);
  }
}
