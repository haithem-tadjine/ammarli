import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { DispatchService } from '../dispatch.service';

@Processor('continuous-matching', {
  stalledInterval: 0,
  drainDelay: 5000,
  metrics: undefined,
})
@Injectable()
export class ContinuousMatchingProcessor extends WorkerHost {
  private readonly logger = new Logger(ContinuousMatchingProcessor.name);

  constructor(private readonly dispatchService: DispatchService) {
    super();
  }

  async process(job: Job<{ requestId?: string }>): Promise<void> {
    const requestId = job.data?.requestId;
    if (!requestId) return;

    try {
      await this.dispatchService.processSingleRequestMatching(requestId);
    } catch (e) {
      this.logger.error(
        `Error processing matching for request ${requestId}: ${e.message}`,
        e.stack,
      );
    }
  }
}
