import { DispatchService } from '@/api/dispatch/dispatch.service';
import { RequestResDto } from '@/api/request/dto/request.res.dto';
import { RequestStatusEnum } from '@/api/request/enums/request-status.enum';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import {
  RabbitMqExchange,
  RabbitMqRoutingKey,
} from '@/libs/rabbitMq/domain-events';

@Injectable()
export class RequestCreatedConsumer {
  constructor(private readonly dispatchService: DispatchService) {}

  @RabbitSubscribe({
    exchange: RabbitMqExchange.REQUESTS,
    routingKey: [RabbitMqRoutingKey.REQUEST_CREATED, 'request.requeued'],
    queue: 'process_request_queue',
    queueOptions: {
      deadLetterExchange: RabbitMqExchange.DLQ,
      deadLetterRoutingKey: 'dead.letter',
    },
  })
  async handleDispatch(message: RequestResDto) {
    // We pass the full message to ensure critical fields like refusedDrivers,
    // tankerDetails, bottledItems, and dispatchAttempts are preserved during re-dispatch.
    const requestPayload = { ...message, status: RequestStatusEnum.DISPATCHED };
    await this.dispatchService.dispatchRequest(
      plainToInstance(RequestResDto, requestPayload, { excludeExtraneousValues: true })
    );
  }
}
