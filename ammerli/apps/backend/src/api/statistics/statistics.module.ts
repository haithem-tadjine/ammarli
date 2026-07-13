import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { OrderEntity } from '../order/entities/order.entity';
import { ProductEntity } from '../product/entities/product.entity';
import { RequestEntity } from '../request/entities/request.entity';
import { UserEntity } from '../user/entities/user.entity';
import { OrderMetricProvider } from './providers/order-metric.provider';
import { RevenueMetricProvider } from './providers/revenue-metric.provider';
import { UserMetricProvider } from './providers/user-metric.provider';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';

/**
 * Module responsible for aggregating and serving system-wide statistics.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      OrderEntity,
      RequestEntity,
      ProductEntity,
    ]),
    AuthModule,
  ],
  controllers: [StatisticsController],
  providers: [
    StatisticsService,
    UserMetricProvider,
    OrderMetricProvider,
    RevenueMetricProvider,
  ],
  exports: [StatisticsService],
})
export class StatisticsModule {}
