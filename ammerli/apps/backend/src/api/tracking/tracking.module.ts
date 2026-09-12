import { RedisLibModule } from '@/libs/redis/redis.module';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { DriverMetadataCacheRepository } from './driver-metadata-cache.repository';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './tracking.service';

import { RabbitMqLibModule } from '@/libs/rabbitMq/rabbitMq.module';
import { RequestDispatchedConsumer } from './consumers/request-dispatched.consumer';
import { DispatchModule } from '../dispatch/dispatch.module';
import { RequestModule } from '../request/request.module';
import { NotificationModule } from '../notification/notification.module';
import { DriverModule } from '../driver/driver.module';
import { SimulationModule } from '../simulation/simulation.module';

import { GeocodingModule } from '@/libs/geocoding/geocoding.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WilayaEntity } from '../wilaya/entities/wilaya.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WilayaEntity]),
    RedisLibModule,
    forwardRef(() => DriverModule),
    forwardRef(() => DispatchModule),
    forwardRef(() => RequestModule),
    forwardRef(() => SimulationModule),
    ConfigModule,
    JwtModule.register({}),
    RabbitMqLibModule,
    NotificationModule,
    GeocodingModule,
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
