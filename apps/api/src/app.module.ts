import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { CategoriesModule } from './categories/categories.module';
import { HealthModule } from './health/health.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { ShippingModule } from './shipping/shipping.module';
import { StoreConfigModule } from './store-config/store-config.module';

@Module({
  imports: [
    // Carga .env y lo expone vía process.env en toda la app
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ProductsModule,
    CategoriesModule,
    OrdersModule,
    ShippingModule,
    StoreConfigModule,
    AdminModule,
    HealthModule,
  ],
})
export class AppModule {}
