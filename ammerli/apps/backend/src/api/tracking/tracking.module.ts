import { RedisLibModule } from '@/libs/redis/redis.module';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { DriverMetadataCacheRepository } from './driver-metadata-cache.repository';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './tracking.service';

import { RabbitMqLibModule } from '@/libs/rabbitMq/rabbitMq.module';
import { DriverModule } from '../driver/driver.module';
import { RequestDispatchedConsumer } from './consumers/request-dispatched.consumer';
import { DispatchModule } from '../dispatch/dispatch.module';
import { RequestModule } from '../request/request.module';

@Module({
  imports: [
    RedisLibModule,
    forwardRef(() => DriverModule),
    forwardRef(() => DispatchModule),
    forwardRef(() => RequestModule),
    ConfigModule,
    JwtModule.register({}),
    RabbitMqLibModule,
  ],
  providers: [
    DriverMetadataCacheRepository,
    TrackingService,
    TrackingGateway,
    RequestDispatchedConsumer,
  ],
  exports: [TrackingGateway, TrackingService],
})
export class TrackingModule {}
