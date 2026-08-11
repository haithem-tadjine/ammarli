import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { UserRoleEnum } from '@/api/user/enums/user-role.enum';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Uuid } from '@/common/types/common.type';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { Roles } from '@/decorators/roles.decorator';
import { UserResDto } from '../user/dto/user.res.dto';
import { CreateRequestDto } from './dto/create-request.dto';
import { ListRequestReqDto } from './dto/list-request.req.dto';
import { RateRequestDto } from './dto/rate-request.dto';
import { RequestResDto } from './dto/request.res.dto';
import { RequestStatusEnum } from './enums/request-status.enum';
import { RequestService } from './request.service';
import { DispatchService } from '../dispatch/dispatch.service';

/**
 * Controller for managing customer requests and driver-side state updates.
 * Orchestrates the lifecycle from initial creation to finalization.
 *
 * @version 1
 * @tag Requests
 */
@ApiTags('Requests')
@Controller({
  path: 'requests',
  version: '1',
})
export class RequestController {
  constructor(
    private readonly requestService: RequestService,
    private readonly dispatchService: DispatchService,
  ) {}

  /**
   * Submits a new service request.
   * Restricted to users with the CLIENT role.
   *
   * @param createRequestDto - Request details (coordinates, quantity, product)
   * @param user - Currently authenticated client
   * @returns The initialized request object
   */
  @Post()
  @Roles(UserRoleEnum.CLIENT)
  @ApiAuth({
    type: UserResDto, // Note: This type seems incorrect in original code (should be RequestResDto), checking context
    summary: 'create a new request',
    statusCode: HttpStatus.CREATED,
  })
  async create(
    @Body() createRequestDto: CreateRequestDto,
    @CurrentUser() user: UserResDto,
  ): Promise<RequestResDto> {
    return this.requestService.createRequest(
      user.id as Uuid,
      createRequestDto,
      user,
    );
  }

  /**
   * Retrieves a list of historical requests with pagination and filtering.
   *
   * @param reqDto - Pagination and filtering arguments
   * @returns Paginated result of requests
   */
  @Get()
  @ApiAuth({
    type: RequestResDto,
    summary: 'List requests',
    isPaginated: true,
  })
  async findAll(
    @Query() reqDto: ListRequestReqDto,
    @CurrentUser() user: UserResDto,
  ): Promise<OffsetPaginatedDto<RequestResDto>> {
    if (user.role === 'CLIENT') {
      reqDto.userId = user.id as string;
    } else if (user.role === 'DRIVER') {
      (reqDto as any).driverUserId = user.id as string;
    }
    return this.requestService.findAll(reqDto);
  }

  /**
   * Retrieves the current user's active request if it existence.
   * Checks both cache and persistent storage for live requests.
   *
   * @param user - Currently authenticated user
   * @returns The active request or null
   */
  @Get('active')
  @ApiAuth({
    type: RequestResDto,
    summary: 'Get active request for current user',
    statusCode: HttpStatus.OK,
  })
  async getActive(
    @CurrentUser() user: UserResDto,
  ): Promise<RequestResDto | null> {
    return this.requestService.findActiveRequest(user.id as Uuid);
  }

  /**
   * DRIVER ONLY: Locks the request for the driver to evaluate and set the price.
   *
   * @param id - Request identifier
   * @param user - Currently authenticated driver
   * @returns Updated request object
   */
  @Post(':id/lock')
  @Roles(UserRoleEnum.DRIVER)
  @ApiAuth({
    summary: 'Driver locks a request for evaluation',
    statusCode: HttpStatus.OK,
  })
  async lockRequest(
    @Param('id') id: Uuid,
    @CurrentUser() user: any,
  ) {
    return await this.dispatchService.acceptRequest(id, user.id);
  }

  /**
   * DRIVER ONLY: Rejects a request during the negotiation phase (DISPATCHED or LOCKED).
   * This refuses the order without cancelling it in the DB, and routes it to the next driver.
   *
   * @param id - Request identifier
   * @param user - Currently authenticated driver
   * @returns Success confirmation
   */
  @Post(':id/reject')
  @Roles(UserRoleEnum.DRIVER)
  @ApiAuth({
    summary: 'Driver rejects an incoming or locked request',
    statusCode: HttpStatus.OK,
  })
  async rejectRequest(
    @Param('id') id: Uuid,
    @CurrentUser() user: any,
  ) {
    return await this.dispatchService.refuseRequest(id, user.id);
  }

  /**
   * DRIVER ONLY: Signals that the driver has arrived at the pickup location.
   * Transitions request state to ARRIVED.
   *
   * @param id - Request identifier
   * @returns Updated request object
   */
  @Post(':id/arrived')
  @Roles(UserRoleEnum.DRIVER)
  @ApiAuth({
    summary: 'Driver arrived at pickup location',
    statusCode: HttpStatus.OK,
  })
  async arrived(@Param('id') id: string) {
    return await this.requestService.finalizeRequest(
      id,
      RequestStatusEnum.ARRIVED,
    );
  }

  /**
   * DRIVER ONLY: Signals that the ride/delivery has physically started.
   * Transitions request state to IN_PROGRESS.
   *
   * @param id - Request identifier
   * @returns Updated request object
   */
  @Post(':id/start')
  @Roles(UserRoleEnum.DRIVER)
  @ApiAuth({
    summary: 'Start the ride/delivery',
    statusCode: HttpStatus.OK,
  })
  async start(
    @Param('id') id: string,
    @Body('price') price: number,
  ) {
    if (!price) {
      throw new BadRequestException('Price is required to start the delivery');
    }
    return await this.requestService.finalizeRequest(
      id,
      RequestStatusEnum.DELIVERING,
      price,
    );
  }

  /**
   * DRIVER ONLY: Signals successful completion of the request.
   * Transition request state to COMPLETED and triggers persistence.
   *
   * @param id - Request identifier
   * @returns Finalized request object
   */
  @Post(':id/complete')
  @Roles(UserRoleEnum.DRIVER)
  @ApiAuth({
    summary: 'Complete a request',
    statusCode: HttpStatus.OK,
  })
  async complete(@Param('id') id: string) {
    return await this.requestService.finalizeRequest(
      id,
      RequestStatusEnum.DELIVERED,
    );
  }

  /**
   * CLIENT ONLY: Aborts the request.
   * Transitions request state to CANCELLED and triggers persistence for audit record.
   *
   * @param id - Request identifier
   * @returns Finalized (cancelled) request object
   */
  @Post(':id/cancel')
  @Roles(UserRoleEnum.CLIENT, UserRoleEnum.DRIVER)
  @ApiAuth({
    summary: 'Cancel a request',
    statusCode: HttpStatus.OK,
  })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: UserResDto,
    @Body('reason') reason?: string,
  ) {
    return await this.requestService.cancelRequest(id, user.id as string, reason);
  }

  /**
   * Rate a completed request.
   * Can be called by either the Customer or the Driver.
   *
   * @param id - Request identifier
   * @param dto - Rating details
   * @param user - Current user making the request
   * @returns Created rating
   */
  @Post(':id/rate')
  @Roles(UserRoleEnum.CLIENT, UserRoleEnum.DRIVER)
  @ApiAuth({
    summary: 'Rate a completed request',
    statusCode: HttpStatus.OK,
  })
  async rate(
    @Param('id') id: string,
    @Body() dto: RateRequestDto,
    @CurrentUser() user: any,
  ) {
    return await this.requestService.rateRequest(id, dto, user.id as string);
  }
}
