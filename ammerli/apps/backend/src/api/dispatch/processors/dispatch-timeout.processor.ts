import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { DispatchService } from '../dispatch.service';

@Processor('dispatch-timeout', {
  stalledInterval: 30000, // BullMQ v5.66+ requires stalledInterval > 0
  drainDelay: 5000,
  metrics: undefined,
})
@Injectable()
export class DispatchTimeoutProcessor extends WorkerHost {
  private readonly logger = new Logger(DispatchTimeoutProcessor.name);

  constructor(private readonly dispatchService: DispatchService) {
    super();
  }

  async process(job: Job<{ requestId: string; driverId?: string }>): Promise<void> {
    const { requestId, driverId } = job.data;

    // ── 1. Request Expiration (Single 3-Minute Delayed Job) ────────────────
    if (job.name === 'request-expiration-job') {
      this.logger.warn(`⏰ BullMQ Request Expiration Job Executing for Request: ${requestId}`);
      await this.dispatchService.markRequestUnfulfilled(requestId);
      return;
    }

    // ── 2. Driver Offer Timeout (30s Delayed Job) ──────────────────────────
    if (driverId) {
      this.logger.warn(
        `⏰ BullMQ Driver Offer Timeout Job Executing for Request: ${requestId}, Driver: ${driverId}`,
      );
      await this.dispatchService.handleDispatchRejection(requestId, driverId);
    }
  }
}
