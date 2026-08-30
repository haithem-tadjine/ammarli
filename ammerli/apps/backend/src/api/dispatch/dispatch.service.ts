import { ErrorMessageConstants } from '@/constants/error-code.constant';
import { LogConstants } from '@/constants/log.constant';
import { RedisConstants } from '@/constants/redis.constants';
import { Instrument } from '@/decorators/instrument.decorator';
import { AppException } from '@/exceptions/app.exception';
import { RedisLibsService } from '@/libs/redis/redis-libs.service';
import { RedisScriptService } from '@/libs/redis/redis-script.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AppLogger } from 'src/logger/logger.service';
import { Repository } from 'typeorm';
import { DriverEntity } from '../driver/entities/driver.entity';
import { RequestResDto } from '../request/dto/request.res.dto';
import { RequestStatusEnum } from '../request/enums/request-status.enum';
import { RequestService } from '../request/request.service';
import { DriverLocationResDto } from '../tracking/dto/driver-location.res.dto';

import { Uuid } from '@/common/types/common.type';
import { plainToInstance } from 'class-transformer';
import { DriverResDto } from '../driver/dto/driver.res.dto';
import { MatchingService } from './matching.service';
import { DriverMetadataService } from '../driver/driver-metadata.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { RabbitMqRoutingKey, RabbitMqExchange } from '@/libs/rabbitMq/domain-events';

/**
 * Service responsible for orchestrating the dispatch of requests to drivers.
 * Implements the core business logic for finding nearby candidates, scoring them
 * via MatchingService, and managing the request acceptance flow.
 *
 * @class DispatchService
 */
@Injectable()
export class DispatchService {
  constructor(
    private readonly requestService: RequestService,
    @InjectRepository(DriverEntity)
    private readonly driverRepo: Repository<DriverEntity>,
    private readonly redisLibsService: RedisLibsService,
    private readonly redisScriptService: RedisScriptService,
    private readonly matchingService: MatchingService,
    private readonly amqpConnection: AmqpConnection,
    private readonly logger: AppLogger,
    private readonly driverMetadataService: DriverMetadataService,
    @InjectQueue('dispatch-timeout') private readonly dispatchTimeoutQueue: Queue,
    @InjectQueue('continuous-matching') private readonly continuousMatchingQueue: Queue,
  ) {
    this.logger.setContext(DispatchService.name);
  }

  async onModuleInit() {
    // ── Clean up any legacy repeatable jobs from Redis ─────────────────────
    // Ensures Upstash Redis is purged of old polling crons upon boot.
    try {
      const repeatableJobs = await this.continuousMatchingQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        await this.continuousMatchingQueue.removeRepeatableByKey(job.key);
        this.logger.log(`[DispatchService] Removed legacy repeatable job: ${job.name} (${job.key})`);
      }
    } catch (e) {
      this.logger.warn(`[DispatchService] Could not clean legacy repeatable jobs: ${e?.message}`);
    }
    this.logger.log('🚀 Event-Driven Dispatch Service initialized (0 polling, 100% on-demand)');
  }

  /**
   * Main dispatching pipeline.
   * Finds, scores, and offers a request to the best available driver.
   *
   * @param params - The request data to be dispatched
   * @returns Array of driver identifiers that received the dispatch offer
   *
   * @example
   * const results = await dispatchService.dispatchRequest(activeRequest);
   */
  @Instrument({ performanceThreshold: 200 })
  async dispatchRequest(
    params: RequestResDto,
  ): Promise<DriverLocationResDto[]> {
    const request = await this.requestService.getRequestFromCache(params.id);

    if (!request) return [];

    // Increment dispatch attempts
    request.dispatchAttempts = (request.dispatchAttempts || 0) + 1;
    await this.requestService.updateRequest(request.id, request);

    // Progressive Ring Expansion strategy
    const RINGS = [3, 7, 15];
    let scoredCandidates: any[] = [];
    let candidatesFound = 0;

    for (const radius of RINGS) {
      this.logger.debug(`Searching for drivers within ${radius}km for request ${request.id}`);
      const candidates = await this.findNearbyDrivers(request, radius);
      
      if (!candidates.length) continue;
      candidatesFound += candidates.length;

      scoredCandidates = await this.matchingService.findBestDrivers(
        request,
        candidates,
      );

      if (scoredCandidates.length > 0) {
        this.logger.debug(`Found ${scoredCandidates.length} eligible drivers within ${radius}km`);
        break; // Found eligible drivers! Break the loop.
      }
    }

    if (!scoredCandidates.length) {
      this.logger.warnStructured(LogConstants.REQUEST.NO_DRIVERS, {
        requestId: request.id,
        totalFound: candidatesFound,
        reason: ErrorMessageConstants.REQUEST.NOT_AVAILABLE,
      });
      return [];
    }

    return this.reserveAndDispatchBestDriver(request, scoredCandidates);
  }

  /**
   * Iterates through ranked candidates, atomically reserving the first available driver.
   * Uses the RESERVE_DRIVER Lua script for a check-and-set operation to prevent
   * two concurrent requests from offering to the same driver.
   *
   * @param request - The active request being dispatched
   * @param scoredCandidates - Pre-scored and sorted driver candidates
   * @returns Array with the successfully reserved driver, or empty if none available
   * @private
   */
  private async reserveAndDispatchBestDriver(
    request: RequestResDto,
    scoredCandidates: { driverId: string; distanceKm: number; score: number; debug: Record<string, number>; metadata?: any }[],
  ): Promise<DriverLocationResDto[]> {
    for (const candidate of scoredCandidates) {
      const metadataKey = RedisConstants.KEYS.driverMetadata(candidate.driverId);
      
      const isRetail = candidate.metadata?.driverType === 'BOTTLED' || 
                       (candidate.metadata?.driverType === 'TANKER' && candidate.metadata?.waterType?.toLowerCase() === 'spring');

      if (isRetail) {
        // Retail drivers allow multiple orders, so we don't reserve them to BUSY.
        // We just verify they are still AVAILABLE.
        const status = await this.redisLibsService.hget(metadataKey, 'status');
        if (status !== 'AVAILABLE') {
          this.logger.debug(`Retail Driver ${candidate.driverId} is not AVAILABLE, skipping`);
          continue;
        }
      } else {
        // Wholesale drivers must be locked to BUSY to prevent multiple orders
        const reserved = await this.redisScriptService.eval(
          'RESERVE_DRIVER',
          [metadataKey],
          ['AVAILABLE', 'BUSY'],
        );

        if (reserved !== 1) {
          this.logger.debug(`Wholesale Driver ${candidate.driverId} was not AVAILABLE (atomic reserve failed), skipping`);
          continue;
        }
      }

      // Successfully reserved — proceed with dispatch
      const active = [
        {
          driverId: candidate.driverId,
          distanceKm: candidate.distanceKm,
        },
      ];

      request.offeredDriverId = candidate.driverId as Uuid;

      await this.markRequestDispatched(request);
      await this.emitDispatchEvent(request, active);

      this.logger.infoStructured(LogConstants.REQUEST.DISPATCH_SUCCESS, {
        requestId: request.id,
        driverCount: 1,
        driverId: candidate.driverId,
        score: candidate.score,
        debug: candidate.debug,
      });

      // Enqueue delayed timeout job (30s)
      await this.dispatchTimeoutQueue.add(
        'dispatch-timeout-job',
        { requestId: request.id, driverId: candidate.driverId },
        { delay: 30000, jobId: `dispatch-timeout-${request.id}-${candidate.driverId}` }
      );

      return active;
    }

    // All candidates were already BUSY — no driver could be reserved
    this.logger.warnStructured(LogConstants.REQUEST.NO_DRIVERS, {
      requestId: request.id,
      totalCandidates: scoredCandidates.length,
      reason: 'ALL_CANDIDATES_BUSY',
    });
    return [];
  }

  /**
   * Finds nearby driver candidates using Redis geospatial query.
   * @private
   */
  private async findNearbyDrivers(
    request: RequestResDto,
    radius: number = 15,
  ): Promise<[string, string][]> {
    try {
      return await this.redisLibsService.geoSearch(
        RedisConstants.KEYS.DRIVERS_GEO_INDEX,
        request.pickupLng,
        request.pickupLat,
        radius,
        RedisConstants.CMD.UNIT_KM,
      );
    } catch (error) {
      this.logger.warnStructured(LogConstants.DRIVER.FIND_NEARBY_FAILED, {
        requestId: request.id,
        error: error.message,
      });
      throw new AppException(ErrorMessageConstants.SYSTEM.REDIS_FAILURE, 500);
    }
  }

  /**
   * Marks the request as dispatched in the cache.
   * @private
   */
  private async markRequestDispatched(request: RequestResDto) {
    request.status = RequestStatusEnum.DISPATCHED;
    await this.requestService.updateRequest(request.id, request);
  }

  /**
   * Publishes the 'request.dispatched' event to RabbitMQ.
   * @private
   */
  private async emitDispatchEvent(
    request: RequestResDto,
    drivers: DriverLocationResDto[],
  ) {
    try {
      await this.amqpConnection.publish('requests', RabbitMqRoutingKey.DRIVER_OFFERED, {
        ...request,
        matchedDrivers: drivers,
        status: RequestStatusEnum.DISPATCHED,
      });
      this.logger.infoStructured(LogConstants.REQUEST.EVENT_EMITTED, {
        requestId: request.id,
      });
    } catch (error) {
      this.logger.errorStructured(LogConstants.REQUEST.EVENT_EMIT_FAILED, {
        requestId: request.id,
        error: error.message,
      });
    }
  }
  /**
   * Handles driver rejection/timeout and re-routes the order atomically.
   */
  async handleDispatchRejection(requestId: string, driverId: string) {
    const requestKey = `${RedisConstants.KEYS.REQUESTS_INDEX}:${requestId}`;

    const result = await this.redisScriptService.eval(
      'REJECT_REQUEST',
      [requestKey],
      [
        driverId,
        RequestStatusEnum.SEARCHING,
        RequestStatusEnum.DISPATCHED,
        RequestStatusEnum.LOCKED,
      ],
    );

    if (result === -1) {
      this.logger.warn(`Request ${requestId} not found in cache during rejection.`);
      return;
    }

    if (result === 0 || !result) {
      this.logger.warn(`Stale timeout detected for request ${requestId} and driver ${driverId}, aborting cascade.`);
      return;
    }

    let request: RequestResDto;
    if (typeof result === 'string') {
      request = JSON.parse(result) as RequestResDto;
    } else {
      request = await this.requestService.getRequestFromCache(requestId);
    }

    const attempts = request.dispatchAttempts || 1;
    this.logger.debug(`🔄 Re-triggering dispatchRequest for attempt #${attempts}`);

    // Cancel existing timeout if triggered via explicit reject
    await this.dispatchTimeoutQueue.remove(`dispatch-timeout-${requestId}-${driverId}`);

    this.logger.infoStructured(LogConstants.REQUEST.MARK_DISPATCHED, {
      requestId,
      message: 'Driver rejected/timed out, re-routing...',
      driverId,
      dispatchAttempts: attempts,
    });

    // Set driver back to AVAILABLE so they can receive new requests
    try {
      await this.driverMetadataService.updateMetadata(driverId, {
        status: 'AVAILABLE',
      });
    } catch (e) {
      this.logger.warn(`Failed to set driver ${driverId} back to AVAILABLE: ${e?.message}`);
    }

    // Re-trigger on-demand matching immediately for this request
    await this.continuousMatchingQueue.add(
      'match-request',
      { requestId },
      { delay: 0, jobId: `match-request-${requestId}-${Date.now()}` },
    );

    try {
      await this.amqpConnection.publish(
        RabbitMqExchange.REQUESTS,
        RabbitMqRoutingKey.REQUEST_CREATED,
        request,
      );
    } catch (e) {
      this.logger.error('Failed to re-publish REQUEST_CREATED event', e);
    }
    
    // We intentionally removed the direct await this.dispatchRequest(request) 
    // to allow the RequestCreatedConsumer to handle it natively, ensuring the 
    // exact same AMQP flow is maintained for tracking & dispatching.
  }

  async markRequestUnfulfilled(requestId: string) {
    const request = await this.requestService.getRequestFromCache(requestId);
    if (!request || (request.status !== RequestStatusEnum.SEARCHING && request.status !== RequestStatusEnum.DISPATCHED)) return;

    // If request was offered to a driver and timed out, treat as rejection and re-route
    if (request.status === RequestStatusEnum.DISPATCHED && request.offeredDriverId) {
      this.logger.log(`Request ${requestId} timed out while offered to driver ${request.offeredDriverId}. Treating as rejection.`);
      return this.handleDispatchRejection(requestId, request.offeredDriverId);
    }

    // Clear timeout if exists for the last offered driver
    if (request.offeredDriverId) {
      await this.dispatchTimeoutQueue.remove(`dispatch-timeout-${requestId}-${request.offeredDriverId}`);
    }

    try {
      // finalizeRequest properly updates Postgres, clears Redis active mappings, and emits the RabbitMQ event
      await this.requestService.finalizeRequest(requestId, RequestStatusEnum.EXPIRED, request.totalPrice);
    } catch (e) {
      this.logger.error('Failed to finalize UNFULFILLED request', e);
    }
  }

  /**
   * Accepts a dispatch offer on behalf of a driver.
   * Transitions request to ACCEPTED, assigns driver, and creates the associated Order.
   *
   * @param requestId - Request being accepted
   * @param userId - ID of the User (Driver) who is accepting
   * @returns Success confirmation
   * @throws {AppException} If driver or request not found, or request is no longer available
   */
  async acceptRequest(requestId: Uuid, userId: Uuid) {
    const driver = await this.driverRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (!driver) {
      this.logger.error(`${LogConstants.DRIVER.NOT_FOUND}: ${userId}`);
      throw new AppException(ErrorMessageConstants.DRIVER.NOT_FOUND, 404);
    }
    const driverId = driver.id;

    const requestKey = `${RedisConstants.KEYS.REQUESTS_INDEX}:${requestId}`;
    const driverActiveRequestKey = `requests:driver:${driverId}`;

    const result = await this.redisScriptService.eval(
      'ACCEPT_REQUEST',
      [requestKey, driverActiveRequestKey],
      [
        driverId,
        RequestStatusEnum.LOCKED,
        RequestStatusEnum.SEARCHING,
        RequestStatusEnum.DISPATCHED,
        '7200', // TTL: 2-hour safety window for the driver→request reverse index
      ],
    );

    if (result === -1) {
      throw new AppException(ErrorMessageConstants.REQUEST.NOT_FOUND, 404);
    }

    if (result === 0) {
      throw new AppException(ErrorMessageConstants.REQUEST.NOT_AVAILABLE, 400);
    }

    // Cancel pending timeout job
    await this.dispatchTimeoutQueue.remove(`dispatch-timeout-${requestId}-${driverId}`);

    // Success - fetch updated request for event emission
    const request = await this.requestService.getRequestFromCache(requestId);

    if (request) {
      // Inject the driver into the request payload so the customer receives the driver info
      request.driver = plainToInstance(DriverResDto, driver, {
        excludeExtraneousValues: true,
      });

      // Recalculate price if driver has a custom price per unit
      if (driver.defaultPrice && driver.defaultPrice > 0) {
        let calculatedTotal = 0;
        const isSpringTanker = request.type === 'TANKER' && request.tankerDetails?.waterType?.toLowerCase() === 'spring';
        
        if (isSpringTanker) {
          const requestedLiters = request.tankerDetails?.volume || 1000;
          calculatedTotal = (requestedLiters / 20) * driver.defaultPrice;
        } else if (request.type === 'BOTTLED' && request.bottledItems) {
          const items = Object.values(request.bottledItems) as any[];
          calculatedTotal = items.reduce((sum, item) => sum + ((item.qty || 1) * driver.defaultPrice), 0);
        }

        if (calculatedTotal > 0) {
          request.totalPrice = calculatedTotal;
        }
      }

      await this.requestService.updateRequest(requestId, {
        driver: request.driver,
        totalPrice: request.totalPrice,
      });
    }

    await this.amqpConnection.publish('requests', 'request.accepted', request);
    try {
      // The socket connects with userId — that's the driverMetadata key
      const driverUserId = driver.user?.id;
      if (driverUserId) {
        const meta = await this.driverMetadataService.getMetadata(driverUserId);
        const isRetail = meta && (meta.driverType === 'BOTTLED' || 
                        (meta.driverType === 'TANKER' && meta.waterType?.toLowerCase() === 'spring'));
                        
        if (isRetail) {
          await this.driverMetadataService.updateMetadata(driverUserId, {
            lastJobTimestamp: Date.now(),
          });
          this.logger.log(`Driver ${driverUserId} is retail, keeping AVAILABLE`);
        } else {
          await this.driverMetadataService.updateMetadata(driverUserId, {
            status: 'BUSY',
            lastJobTimestamp: Date.now(),
          });
          this.logger.log(`Wholesale Driver ${driverUserId} marked as BUSY in metadata`);
        }
      }
    } catch (e) {
      this.logger.warn(`Failed to update driver status: ${e?.message}`);
    }

    this.logger.infoStructured(LogConstants.REQUEST.ACCEPTED, {
      requestId,
      driverId,
    });

    return { success: true };
  }

  /**
   * Records a driver's explicit refusal of a dispatch offer.
   * Transitions request back to SEARCHING and adds driver to the refusal list.
   *
   * @param requestId - ID of the request being refused
   * @param userId - ID of the User (Driver) who is refusing
   * @returns Success confirmation
   * @throws {AppException} If driver or request not found, or request is not in a valid state
   */
  async refuseRequest(requestId: Uuid, userId: Uuid) {
    const driver = await this.driverRepo.findOne({
      where: { user: { id: userId } },
    });
    if (!driver) {
      throw new AppException(ErrorMessageConstants.DRIVER.NOT_FOUND, 404);
    }

    // Note: We intentionally skip the read-before-write check here because
    // handleDispatchRejection uses an atomic Lua script that safely ignores stale rejections.
    // If the order was already accepted or offered to someone else, this will just log a warning and return.

    // Use cascading dispatch rejection handler
    // We pass userId because candidates (and refusedDrivers) use userId for mapping
    await this.handleDispatchRejection(requestId, userId);

    // Emit event for potential tracking/logging consumers
    await this.amqpConnection.publish('requests', 'request.refused', {
      requestId,
      driverId: driver.id,
    });

    this.logger.log(`Driver ${driver.id} explicitly refused request ${requestId}`);

    return { success: true };
  }

  /**
   * Processes matching specifically for a single request on-demand (Event-Driven).
   * If no driver is currently available and request is still SEARCHING, re-enqueues
   * itself with a 10s delay.
   */
  async processSingleRequestMatching(requestId: string): Promise<void> {
    const request = await this.requestService.getRequestFromCache(requestId);

    // ── Early Exit / Stop Condition ──────────────────────────────────────────
    // If request does not exist or is not in SEARCHING status (e.g. ACCEPTED,
    // CANCELLED, EXPIRED, DELIVERED, or currently DISPATCHED to a driver),
    // immediately exit without scheduling any new jobs.
    if (!request || request.status !== RequestStatusEnum.SEARCHING) {
      return;
    }

    // Check overall request expiration TTL (3 minutes = 180,000 ms)
    const createdAt = new Date(request.createdAt).getTime();
    const elapsed = Date.now() - createdAt;
    if (elapsed >= 180000) {
      this.logger.warnStructured(LogConstants.REQUEST.NO_DRIVERS, {
        requestId: request.id,
        reason: 'TTL_EXPIRED',
      });
      await this.markRequestUnfulfilled(request.id);
      return;
    }

    // Search for nearby drivers using progressive ring expansion
    const candidates = await this.findNearbyDrivers(request);
    let matched = false;

    if (candidates.length > 0) {
      const scoredCandidates = await this.matchingService.findBestDrivers(
        request,
        candidates,
      );
      if (scoredCandidates.length > 0) {
        const dispatched = await this.reserveAndDispatchBestDriver(
          request,
          scoredCandidates,
        );
        if (dispatched.length > 0) {
          matched = true;
        }
      }
    }

    // ── Smart Internal Retry ────────────────────────────────────────────────
    // If no driver was reserved/dispatched, re-enqueue a delayed job (10s)
    // exclusively for this specific request.
    if (!matched) {
      this.logger.debug(
        `[DispatchService] No driver available for request ${requestId}. Retrying in 10s...`,
      );
      await this.continuousMatchingQueue.add(
        'match-request',
        { requestId },
        {
          delay: 10000,
          jobId: `match-request-${requestId}-${Date.now()}`,
        },
      );
    }
  }

  /**
   * Sweeps active requests on-demand (fallback helper).
   */
  async performContinuousMatching() {
    const activeSetKey = `${RedisConstants.KEYS.REQUESTS_INDEX}:active_set`;
    const activeCount = await this.redisLibsService.scard(activeSetKey);
    if (activeCount === 0) return;

    const requestIds = await this.redisLibsService.smembers(activeSetKey);
    for (const reqId of requestIds) {
      try {
        await this.processSingleRequestMatching(reqId);
      } catch (e) {
        this.logger.warn(`Failed to process matching for request ${reqId}: ${e?.message}`);
      }
    }
  }

  /**
   * Triggers an immediate matching evaluation when a specific driver comes online.
   */
  async triggerMatchingForDriver(driverId: string) {
    setTimeout(async () => {
      try {
        await this.performContinuousMatching();
      } catch (e) {
        this.logger.error(`Error triggering matching for driver ${driverId}`, e.stack);
      }
    }, 0);
  }
}
