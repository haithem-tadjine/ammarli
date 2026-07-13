import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { DispatchService } from '../dispatch.service';

@Processor('continuous-matching')
@Injectable()
export class ContinuousMatchingProcessor extends WorkerHost {
  private readonly logger = new Logger(ContinuousMatchingProcessor.name);

  constructor(private readonly dispatchService: DispatchService) {
    super();
  }

  async process(job: Job): Promise<void> {
    try {
      await this.dispatchService.performContinuousMatching();
    } catch (e) {
      this.logger.error(`Error in continuous matching sweep: ${e.message}`, e.stack);
    }
  }
}
