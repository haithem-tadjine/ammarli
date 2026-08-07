import { RabbitMqLibModule } from '@/libs/rabbitMq/rabbitMq.module';
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverModule } from '../driver/driver.module';
import { DriverEntity } from '../driver/entities/driver.entity';
import { WilayaEntity } from '../wilaya/entities/wilaya.entity';
import { OrderModule } from '../order/order.module';
import { RequestModule } from '../request/request.module';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { MatchingService } from './matching.service';

import { AuthModule } from '../auth/auth.module';
import { RequestCreatedConsumer } from './consumers/request-created.consumer';
import { BullModule } from '@nestjs/bullmq';
import { DispatchTimeoutProcessor } from './processors/dispatch-timeout.processor';
import { ContinuousMatchingProcessor } from './processors/continuous-matching.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([DriverEntity, WilayaEntity]),
    RabbitMqLibModule,
    forwardRef(() => AuthModule),
    forwardRef(() => RequestModule),
    forwardRef(() => DriverModule),
    forwardRef(() => OrderModule),
    BullModule.registerQueue({
      name: 'dispatch-timeout',
    }),
    BullModule.registerQueue({
      name: 'continuous-matching',
    }),
  ],
  controllers: [DispatchController],
  providers: [
    DispatchService, 
    MatchingService, 
    RequestCreatedConsumer,
    DispatchTimeoutProcessor,
    ContinuousMatchingProcessor,
  ],
  exports: [DispatchService],
})
export class DispatchModule {}
