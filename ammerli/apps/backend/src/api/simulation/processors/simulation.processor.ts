import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { RequestStatusEnum } from '../../request/enums/request-status.enum';
import { RequestService } from '../../request/request.service';
import { TrackingGateway } from '../../tracking/tracking.gateway';
import { SimulationService } from '../simulation.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

@Processor('simulation-queue')
@Injectable()
export class SimulationProcessor extends WorkerHost {
  private readonly logger = new Logger(SimulationProcessor.name);

  constructor(
    private readonly requestService: RequestService,
    private readonly trackingGateway: TrackingGateway,
    private readonly simulationService: SimulationService,
    private readonly amqpConnection: AmqpConnection,
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
      default:
        this.logger.warn(`Unknown simulation job name: ${job.name}`);
    }
  }

  private async handleSimulateAccept(requestId: string) {
    // 1. Fetch request from cache to ensure it exists
    const request = await this.requestService.getRequestFromCache(requestId);
    if (!request) return;

    // 2. Update status to ACCEPTED
    await this.requestService.updateRequest(requestId, { status: RequestStatusEnum.ACCEPTED });

    // 3. Emit websocket event
    const updatedRequest = await this.requestService.getRequestFromCache(requestId);
    if (updatedRequest) {
      await this.amqpConnection.publish('requests', 'request.accepted', updatedRequest);
    }
    
    this.logger.log(`[Simulation] Request ${requestId} ACCEPTED`);
    
    
    // Schedule arrive
    await this.simulationQueue.add(
      'simulate-arrive',
      { requestId },
      { delay: 10000 },
    );
  }

  private async handleSimulateArrive(requestId: string) {
    const request = await this.requestService.getRequestFromCache(requestId);
    if (!request) return;

    await this.requestService.updateRequest(requestId, { status: RequestStatusEnum.ARRIVED });

    const updatedRequest = await this.requestService.getRequestFromCache(requestId);
    if (updatedRequest) {
      await this.amqpConnection.publish('requests', 'driver.arrived', updatedRequest);
    }
    
    this.logger.log(`[Simulation] Request ${requestId} ARRIVED`);
    
    // Schedule deliver
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
}
