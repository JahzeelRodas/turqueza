import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StoreConfigService } from '../store-config/store-config.service';
import { UpdateStoreConfigDto } from '../store-config/dtos/update-store-config.dto';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly storeConfig: StoreConfigService,
  ) {}

  /** GET /api/admin/stats — KPIs del dashboard. */
  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  /** GET /api/admin/inventory?search=&lowStock=true */
  @Get('inventory')
  inventory(
    @Query('search') search?: string,
    @Query('lowStock') lowStock?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.admin.inventory({
      search: search || undefined,
      lowStock: lowStock === 'true',
      take: parseNumber(take),
      skip: parseNumber(skip),
    });
  }

  /** GET /api/admin/customers?search= */
  @Get('customers')
  customers(@Query('search') search?: string) {
    return this.admin.customers(search || undefined);
  }

  /** GET /api/admin/store-config — configuración completa + CMS. */
  @Get('store-config')
  getStoreConfig() {
    return this.storeConfig.get();
  }

  /** PATCH /api/admin/store-config — datos generales, tema y bloques JSON. */
  @Patch('store-config')
  updateStoreConfig(@Body() dto: UpdateStoreConfigDto) {
    return this.storeConfig.update(dto);
  }
}

function parseNumber(value?: string): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
