import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { ShippingModule } from '../shipping/shipping.module';
import { StoreConfigModule } from '../store-config/store-config.module';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminProductsController } from './admin-products.controller';
import { AdminShippingController } from './admin-shipping.controller';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Module({
  imports: [
    ProductsModule,
    CategoriesModule,
    OrdersModule,
    ShippingModule,
    StoreConfigModule,
  ],
  controllers: [
    AdminAuthController,
    AdminController,
    AdminProductsController,
    AdminCategoriesController,
    AdminOrdersController,
    AdminShippingController,
  ],
  providers: [AdminAuthService, AdminGuard, AdminService],
})
export class AdminModule {}
