import { RabbitMqLibModule } from '@/libs/rabbitMq/rabbitMq.module';
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestAcceptedConsumer } from './consumers/request-accepted.consumer';
import { RequestCancelledConsumer } from './consumers/request-cancelled.consumer';
import { RideCompletedConsumer } from './consumers/ride-completed.consumer';
import { RideStartedConsumer } from './consumers/ride-started.consumer';
import { OrderEntity } from './entities/order.entity';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { TrackingModule } from '@/api/tracking/tracking.module';
import { DriverEntity } from '@/api/driver/entities/driver.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, DriverEntity]),
    RabbitMqLibModule,
    forwardRef(() => TrackingModule),
  ],
  providers: [
    OrderService,
    RequestAcceptedConsumer,
    RideStartedConsumer,
    RideCompletedConsumer,
    RequestCancelledConsumer,
  ],
  controllers: [OrderController],
  exports: [OrderService],
})
export class OrderModule {}
