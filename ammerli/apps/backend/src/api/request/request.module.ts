import { RabbitMqLibModule } from '@/libs/rabbitMq/rabbitMq.module';
import { RedisLibModule } from '@/libs/redis/redis.module';
import { forwardRef, Module } from '@nestjs/common';

import { RequestCacheRepository } from './request-cache.repository';
import { RequestController } from './request.controller';
import { RequestService } from './request.service';

import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderModule } from '../order/order.module';
import { TrackingModule } from '../tracking/tracking.module';
import { RequestEntity } from './entities/request.entity';
import { UserModule } from '../user/user.module';
import { DriverModule } from '../driver/driver.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { GeocodingModule } from '@/libs/geocoding/geocoding.module';

@Module({
  imports: [
    RedisLibModule,
    RabbitMqLibModule,
    TypeOrmModule.forFeature([RequestEntity]),
    OrderModule,
    UserModule,
    forwardRef(() => TrackingModule),
    forwardRef(() => DriverModule),
    forwardRef(() => DispatchModule),
    GeocodingModule,
  ],
  controllers: [RequestController],
  providers: [RequestService, RequestCacheRepository],
  exports: [RequestService],
})
export class RequestModule {}
