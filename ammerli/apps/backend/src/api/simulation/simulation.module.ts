import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';
import { RabbitMqLibModule } from '@/libs/rabbitMq/rabbitMq.module';
import { RequestModule } from '../request/request.module';
import { TrackingModule } from '../tracking/tracking.module';
import { SimulationProcessor } from './processors/simulation.processor';
import { SimulationService } from './simulation.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestEntity } from '../request/entities/request.entity';

@Module({
  imports: [
    forwardRef(() => RequestModule),
    forwardRef(() => TrackingModule),
    BullModule.registerQueue({
      name: 'simulation-queue',
    }),
    RabbitMqLibModule,
    TypeOrmModule.forFeature([RequestEntity]),
  ],
  providers: [SimulationService, SimulationProcessor],
  exports: [SimulationService],
})
export class SimulationModule {}
