import { OrderStatusEnum } from '@/api/order/entities/order.entity';
import { RequestResDto } from '@/api/request/dto/request.res.dto';
import { Uuid } from '@/common/types/common.type';
import {
  RabbitMqExchange,
  RabbitMqRoutingKey,
} from '@/libs/rabbitMq/domain-events';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppLogger } from 'src/logger/logger.service';
import { OrderService } from '../order.service';
import { TrackingService } from '@/api/tracking/tracking.service';
import { DriverEntity } from '@/api/driver/entities/driver.entity';

@Injectable()
export class RideCompletedConsumer {
  constructor(
    private readonly orderService: OrderService,
    private readonly trackingService: TrackingService,
    @InjectRepository(DriverEntity)
    private readonly driverRepo: Repository<DriverEntity>,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(RideCompletedConsumer.name);
  }

  /**
   * RabbitMQ consumer: listens to ride completed events and updates order status.
   * Also resets the driver to AVAILABLE so they can receive new orders.
   */
  @RabbitSubscribe({
    exchange: RabbitMqExchange.REQUESTS,
    routingKey: RabbitMqRoutingKey.RIDE_COMPLETED,
    queue: 'ride_completed_order_queue',
    queueOptions: {
      deadLetterExchange: RabbitMqExchange.DLQ,
      deadLetterRoutingKey: 'dead.letter',
    },
  })
  async handleRideCompleted(message: RequestResDto) {
    this.logger.log(`Received ride.completed for requestId: ${message.id}`);

    try {
      await this.orderService.updateStatus(
        message.id as Uuid,
        OrderStatusEnum.DELIVERED,
      );
      this.logger.log(
        `Order status updated to DELIVERED for requestId: ${message.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update order status for requestId: ${message.id}`,
        error.stack,
      );
      throw error;
    }

    // Reset driver to AVAILABLE in Redis & re-add to geo index
    // so they can immediately receive new orders without re-connecting.
    // IMPORTANT: The socket connects with userId (userProfile.id), NOT driver.id
    // So we must resolve the userId from the driver record.
    if (message.driverId) {
      try {
        // Resolve userId from driverId (driver table PK)
        const driver = await this.driverRepo.findOne({
          where: { id: message.driverId as Uuid },
          relations: ['user'],
        });
        const socketId = driver?.user?.id ?? message.driverId;

        await this.trackingService.setDriverOnline(socketId);
        this.logger.log(
          `Driver ${socketId} (driverId=${message.driverId}) reset to AVAILABLE after completing ride ${message.id}`,
        );
      } catch (e) {
        this.logger.warn(
          `Failed to reset driver ${message.driverId} to AVAILABLE: ${e?.message}`,
        );
      }
    }
  }
}
