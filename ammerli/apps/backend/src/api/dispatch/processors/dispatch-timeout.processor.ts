import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { DispatchService } from '../dispatch.service';

@Processor('dispatch-timeout')
@Injectable()
export class DispatchTimeoutProcessor extends WorkerHost {
  private readonly logger = new Logger(DispatchTimeoutProcessor.name);

  constructor(private readonly dispatchService: DispatchService) {
    super();
  }

  async process(job: Job<{ requestId: string; driverId: string }>): Promise<void> {
    const { requestId, driverId } = job.data;
    this.logger.warn(`⏰ BullMQ Timeout Job Executing for Request: ${requestId}, Driver: ${driverId}`);
    
    // Explicitly handle the cascade failure
    await this.dispatchService.handleDispatchRejection(requestId, driverId);
  }
}
