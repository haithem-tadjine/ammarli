import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { RequestStatusEnum } from '../../request/enums/request-status.enum';
import { RequestService } from '../../request/request.service';
import { TrackingGateway } from '../../tracking/tracking.gateway';
import { SimulationService } from '../simulation.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

import { DriverMetadataService } from '../../driver/driver-metadata.service';

@Processor('simulation-queue')
@Injectable()
export class SimulationProcessor extends WorkerHost {
  private readonly logger = new Logger(SimulationProcessor.name);

  constructor(
    private readonly requestService: RequestService,
    private readonly trackingGateway: TrackingGateway,
    private readonly simulationService: SimulationService,
    private readonly amqpConnection: AmqpConnection,
    private readonly driverMetadataService: DriverMetadataService,
    @InjectQueue('simulation-queue') private readonly simulationQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing simulation job: ${job.name} for request ${job.data.requestId}`);
    const { requestId } = job.data;

    switch (job.name) {
      case 'simulate-accept':
        await this.handleSimulateAccept(requestId);
        break;
      case 'simulate-arrive':
        await this.handleSimulateArrive(requestId);
        break;
      case 'simulate-deliver':
        await this.handleSimulateDeliver(requestId);
        break;
      case 'inject-mock-offer':
        await this.handleInjectMockOffer(job.data.driverId, job.data.driverUserId);
        break;
      default:
        this.logger.warn(`Unknown simulation job name: ${job.name}`);
    }
  }

  private async handleSimulateAccept(requestId: string) {
    // 1. Fetch request from cache to ensure it exists
    const request = await this.requestService.getRequestFromCache(requestId);
    if (!request) return;

    // 2. حساب السعر الديناميكي وفق نوع المياه والكمية
    let mockPrice = 0;

    try {
      // Normalize: collect all possible type identifiers from the request
      const rawWaterType = (
        request.tankerDetails?.waterType ||
        request.type ||
        ''
      );
      const waterType = String(rawWaterType).toUpperCase().trim();
      const requestType = String(request.type || '').toUpperCase().trim();

      if (waterType.includes('SPRING') || waterType.includes('ينابيع')) {
        // مياه الينابيع: 60 د.ج لكل 20 لتر
        const volume = Number(
          request.tankerDetails?.volume ||
          request.tankerDetails?.quantity ||
          request.quantity ||
          1000,
        );
        mockPrice = (volume / 20) * 60;

      } else if (
        waterType.includes('WELL') ||
        waterType.includes('آبار') ||
        waterType.includes('ASHGHAL') ||
        waterType.includes('CONSTRUCTION') ||
        waterType.includes('أشغال')
      ) {
        // مياه الآبار ومياه الأشغال: 700 د.ج لكل 1500 لتر
        const volume = Number(
          request.tankerDetails?.volume ||
          request.tankerDetails?.quantity ||
          request.quantity ||
          1500,
        );
        mockPrice = (volume / 1500) * 700;

      } else if (requestType === 'BOTTLED') {
        // المياه المعبأة
        if (request.bottledItems) {
          const items = Array.isArray(request.bottledItems)
            ? request.bottledItems
            : Object.values(request.bottledItems);

          mockPrice = items.reduce((sum: number, item: any) => {
            const size = String(item.size || item.bottleType || '').toLowerCase();
            const qty = Number(item.qty || item.quantity || 1);

            if (size.includes('0.5')) {
              return sum + qty * 210; // فاردو 0.5 لتر: 210 د.ج
            } else if (size.includes('5') && !size.includes('1.5')) {
              return sum + qty * 95;  // قارورة 5 لتر: 95 د.ج
            } else {
              return sum + qty * 200; // فاردو 1.5 لتر (الافتراضي): 200 د.ج
            }
          }, 0);
        } else {
          const qty = Number(request.quantity || 1);
          const bottleType = String(
            (request as any).bottledDetails?.bottleType || '',
          ).toLowerCase();
          if (bottleType.includes('0.5')) {
            mockPrice = qty * 210;
          } else if (bottleType.includes('5') && !bottleType.includes('1.5')) {
            mockPrice = qty * 95;
          } else {
            mockPrice = qty * 200;
          }
        }
      } else {
        // Fallback: نفس منطق الينابيع إذا لم يُعرّف النوع
        const qty = Number(request.quantity || 1);
        mockPrice = qty * 200;
      }
    } catch (pricingError) {
      this.logger.warn(`[Simulation] Pricing error for ${requestId}: ${(pricingError as Error).message}. Using fallback price.`);
      mockPrice = 500; // سعر احتياطي
    }

    mockPrice = Math.round(mockPrice);

    // معرف سائق بصيغة UUID صالحة لضمان توافق قاعدة البيانات
    const mockDriverId = 'a0000000-0000-0000-0000-000000000001' as any;

    // 3. تحديث الطلب بالحالة والسعر وبيانات السائق الوهمي
    await this.requestService.updateRequest(requestId, {
      status: RequestStatusEnum.ACCEPTED,
      driverId: mockDriverId,
      totalPrice: mockPrice,
      subtotal: mockPrice,
      deliveryFee: 0,
      driver: {
        id: mockDriverId,
        truckPlate: '16-104-55',
        rating: 4.9,
        avatarUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        user: {
          firstName: 'محمد',
          lastName: 'أمين (سائق معتمد)',
          phone: '+213550123456',
        },
      } as any,
    });

    // 4. Emit request.accepted websocket event
    const updatedRequest =
      await this.requestService.getRequestFromCache(requestId);
    if (updatedRequest) {
      await this.amqpConnection.publish(
        'requests',
        'request.accepted',
        updatedRequest,
      );
    }

    this.logger.log(
      `[Simulation] Request ${requestId} ACCEPTED with mockPrice=${mockPrice} DZD`,
    );

    // 5. Immediately transition to DELIVERING — mimics the real driver app which calls
    //    updateDriverOrderStatus('driving') right after accepting. This emits ride.started
    //    so the customer's handleRideStarted fires for ALL water types (Well, Ashghal, Bottled).
    await this.requestService.updateRequest(requestId, {
      status: RequestStatusEnum.DELIVERING,
    });

    const deliveringRequest =
      await this.requestService.getRequestFromCache(requestId);
    if (deliveringRequest) {
      await this.amqpConnection.publish(
        'requests',
        'ride.started',
        deliveringRequest,
      );
    }

    this.logger.log(
      `[Simulation] Request ${requestId} DELIVERING — ride.started emitted`,
    );

    // Schedule arrive (20 seconds for customer to see driver on route)
    await this.simulationQueue.add(
      'simulate-arrive',
      { requestId },
      { delay: 20000 },
    );
  }

  private async handleSimulateArrive(requestId: string) {
    const request = await this.requestService.getRequestFromCache(requestId);
    if (!request) return;

    await this.requestService.updateRequest(requestId, { status: RequestStatusEnum.ARRIVED });

    const updatedRequest = await this.requestService.getRequestFromCache(requestId);
    if (updatedRequest) {
      await this.amqpConnection.publish('requests', 'ride.driver_arrived', updatedRequest);
    }
    
    this.logger.log(`[Simulation] Request ${requestId} ARRIVED`);
    
    // Schedule deliver (15 seconds after arrive)
    await this.simulationQueue.add(
      'simulate-deliver',
      { requestId },
      { delay: 15000 },
    );
  }

  private async handleSimulateDeliver(requestId: string) {
    const request = await this.requestService.getRequestFromCache(requestId);
    if (!request) return;

    // finalizeRequest transitions status, saves to DB, publishes events, and cleans up
    await this.requestService.finalizeRequest(requestId, RequestStatusEnum.DELIVERED, request.totalPrice);
    
    this.logger.log(`[Simulation] Request ${requestId} DELIVERED (COMPLETED)`);
  }

  private async handleInjectMockOffer(driverId: string, driverUserId: string) {
    this.logger.log(`[Simulation] Attempting to inject mock offer for driver ${driverId}`);
    try {
      const metadata = await this.driverMetadataService.getMetadata(driverId);
      if (metadata && metadata.status === 'AVAILABLE') {
        // Double check no active request just to be safe
        const activeRequest = await this.requestService.findActiveRequest(driverUserId as any);
        if (!activeRequest) {
          await this.simulationService.injectMockOffer(driverId, driverUserId);
        } else {
          this.logger.log(`[Simulation] Driver ${driverId} already has an active request. Skipping.`);
        }
      } else {
        this.logger.log(`[Simulation] Driver ${driverId} is offline or not AVAILABLE. Skipping mock offer injection.`);
      }
    } catch (e) {
      this.logger.error(`[Simulation] Failed to inject mock offer: ${(e as Error).message}`);
    }
  }
}
