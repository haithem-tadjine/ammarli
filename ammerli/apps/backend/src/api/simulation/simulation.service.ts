import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { RequestEntity } from '../request/entities/request.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestService } from '../request/request.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { RabbitMqExchange, RabbitMqRoutingKey } from '@/libs/rabbitMq/domain-events';
import { RequestStatusEnum } from '../request/enums/request-status.enum';
import { plainToInstance } from 'class-transformer';
import { RequestResDto } from '../request/dto/request.res.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);

  constructor(
    @InjectQueue('simulation-queue') private readonly simulationQueue: Queue,
    @InjectRepository(RequestEntity) private readonly requestRepo: Repository<RequestEntity>,
    private readonly requestService: RequestService,
    private readonly amqpConnection: AmqpConnection,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Enqueues a simulated driver lifecycle for a review customer order.
   * This bypasses real driver dispatch.
   */
  async simulateDriverFlow(request: RequestEntity) {
    this.logger.log(
      `Starting simulated driver flow for review request ${request.id}`,
    );

    // Enqueue the first step of the simulation (Driver accepted) after a short delay
    await this.simulationQueue.add(
      'simulate-accept',
      { requestId: request.id },
      { delay: 3000 },
    );
  }

  /**
   * Phase 4: Driver Review Flow
   * Injects a mock dispatch offer directly to a Review Driver.
   * Creates an isolated RequestEntity and bypasses the MatchingService/DispatchService.
   */
  async injectMockOffer(driverId: string, driverUserId: string) {
    this.logger.log(`[SimulationService] Injecting mock offer for Review Driver: ${driverId}`);

    // Create a mock RequestEntity in Postgres
    const requestEntity = this.requestRepo.create({
      userId: driverUserId, // Use the driver's own userId to satisfy FK constraints
      type: 'BOTTLED',
      volume: 1,
      bottledItems: {
        '1.5L': { qty: 2, price: 50 },
      },
      status: RequestStatusEnum.SEARCHING, // Start at SEARCHING so acceptRequest works
      pickupLat: 36.7525, // Mock coordinates in Algiers
      pickupLng: 3.04197,
      deliveryAddress: 'Review Mock Delivery Address',
      totalPrice: 100,
      deliveryFee: 0,
      subtotal: 100,
      isReviewOrder: true,
    });

    const savedRequest = await this.requestRepo.save(requestEntity);

    // Fetch full request for serialization
    const fullRequest = await this.requestRepo.findOne({
      where: { id: savedRequest.id },
      relations: ['user'], // The 'customer'
    });

    if (!fullRequest) return;

    // Serialize to DTO
    const requestDto = plainToInstance(RequestResDto, fullRequest, {
      excludeExtraneousValues: true,
    });

    // We must manually add it to Redis so that `acceptRequest` can transition it from SEARCHING to LOCKED
    await this.requestService.setRequestInCache(requestDto, 14400);

    // Link this active request to the user (driver in this case) so idempotency check works
    if (typeof (this.requestService as any).cacheRepo?.setUserActiveRequest === 'function') {
      await (this.requestService as any).cacheRepo.setUserActiveRequest(driverUserId, savedRequest.id, 14400);
    }

    // Emit the offer WebSocket event by masquerading it as a dispatch offer payload.
    // The driver app expects the payload to have `matchedDrivers`.
    // We emit to DRIVER_OFFERED, and TrackingGateway will handle sending to WebSocket.
    const offerPayload = {
      ...requestDto,
      status: 'DISPATCHED', // TrackingGateway expects this string to emit the event
      matchedDrivers: [
        {
          driverId: driverId,
          distance: 100,
          estimatedDuration: 5,
        },
      ],
    };

    await this.amqpConnection.publish(
      RabbitMqExchange.REQUESTS,
      RabbitMqRoutingKey.DRIVER_OFFERED,
      offerPayload,
    );

    this.logger.log(`[SimulationService] Successfully injected mock offer ${savedRequest.id}`);
  }
}
