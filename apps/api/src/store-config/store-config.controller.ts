import { Controller, Get } from '@nestjs/common';
import { StoreConfigService } from './store-config.service';

/**
 * Lectura pública de la configuración de tienda (tema, navegación, bloques).
 * La escritura vive en /api/admin/store-config y requiere sesión.
 */
@Controller('store-config')
export class StoreConfigController {
  constructor(private readonly storeConfigService: StoreConfigService) {}

  @Get()
  get() {
    return this.storeConfigService.get();
  }
}
