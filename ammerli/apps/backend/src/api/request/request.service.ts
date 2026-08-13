import { Injectable, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { Uuid } from '@/common/types/common.type';
import { ErrorMessageConstants } from '@/constants/error-code.constant';
import { LogConstants } from '@/constants/log.constant';
import { RedisConstants } from '@/constants/redis.constants';
import {
  RabbitMqExchange,
  RabbitMqRoutingKey,
} from '@/libs/rabbitMq/domain-events';
import { RedisScriptService } from '@/libs/redis/redis-script.service';
import { paginate } from '@/utils/offset-pagination';
import { applyFiltersToQueryBuilder } from '@/utils/query-filter.util';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { plainToInstance } from 'class-transformer';
import { AppLogger } from 'src/logger/logger.service';
import { UserResDto } from '../user/dto/user.res.dto';
import { CreateRequestDto } from './dto/create-request.dto';
import { ListRequestReqDto } from './dto/list-request.req.dto';
import { RequestResDto } from './dto/request.res.dto';
import { RequestStatusEnum } from './enums/request-status.enum';
import { RequestCacheRepository } from './request-cache.repository';

import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, DataSource } from 'typeorm';
import { RequestEntity } from './entities/request.entity';
import { RatingEntity } from '../rating/entities/rating.entity';

import { DriverMetadataService } from '../driver/driver-metadata.service';
import { UserService } from '../user/user.service';
import { GeocodingService } from '@/libs/geocoding/geocoding.service';
import { SettingService } from '../setting/setting.service';

/**
 * Service managing the lifecycle of customer requests.
 * Handles temporary storage in Redis for live requests and persistent storage in Postgres
 * for finalized requests. Orchestrates event-driven communication via RabbitMQ.
 *
 * @class RequestService
 */
@Injectable()
export class RequestService {
  constructor(
    private readonly amqpConnection: AmqpConnection,
    private readonly cacheRepo: RequestCacheRepository,
    @InjectRepository(RequestEntity)
    private readonly requestRepo: Repository<RequestEntity>,
    private readonly redisScriptService: RedisScriptService,
    private readonly logger: AppLogger,
    private readonly userService: UserService,
    private readonly driverMetadataService: DriverMetadataService,
    private readonly geocodingService: GeocodingService,
    private readonly dataSource: DataSource,
    private readonly settingService: SettingService,
  ) {
    this.logger.setContext(RequestService.name);
  }

  /**
   * Initializes a new customer request in the system.
   * Caches the request in Redis for immediate availability and publishes creation events.
   *
   * @param dto - Request details (pickup coordinates, quantity, product)
   * @param user - Authenticated user creating the request
   * @returns Initialized request payload
   *
   * @example
   * const request = await requestService.createRequest(createDto, currentUser);
   */
  async createRequest(
    userId: string,
    dto: CreateRequestDto,
    user: UserResDto,
  ): Promise<RequestResDto> {
    // Fetch full user details from DB since token payload (user) is minimal
    let fullUser = user;
    try {
      fullUser = await this.userService.findOne(userId as Uuid);
    } catch (e) {
      this.logger.warn(`Failed to fetch full user details for request: ${e.message}`);
    }
    
    this.logger.log(`Full User fetched for request: ${JSON.stringify(fullUser)}`);

    const requestId = uuidv4() as Uuid;
    const payload = plainToInstance(RequestResDto, {
      id: requestId,
      status: RequestStatusEnum.SEARCHING,
      user: fullUser,
      driverId: null,
      createdAt: new Date().toISOString(),
      ...dto,
    });

    const result = await this.redisScriptService.eval(
      'CREATE_REQUEST',
      [
        this.cacheRepo['getKey'](requestId), // Accessing private for demo or move getKey to public
        `${RedisConstants.KEYS.REQUESTS_INDEX}:user:${userId}`,
      ],
      [requestId, JSON.stringify(payload), 60, userId], // 1 minute
    );

    const finalPayload = plainToInstance(RequestResDto, JSON.parse(result));

    if (finalPayload.id !== requestId) {
      this.logger.log(
        `Returning active request for user ${userId}: ${finalPayload.id}`,
      );
      return finalPayload;
    }

    this.logger.log(`${LogConstants.REQUEST.RECEIVED}: ${finalPayload.id}`);

    await this.amqpConnection.publish(
      RabbitMqExchange.REQUESTS,
      RabbitMqRoutingKey.REQUEST_CREATED,
      finalPayload,
    );

    return finalPayload;
  }

  /**
   * Retrieves a paginated list of persisted requests.
   * Note: Active requests stored only in Redis cache won't appear here until persisted or synced.
   */
  async findAll(
    reqDto: ListRequestReqDto,
  ): Promise<OffsetPaginatedDto<RequestResDto>> {
    const query = this.requestRepo
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'user')
      .leftJoinAndSelect('request.driver', 'driver')
      .orderBy('request.createdAt', 'DESC');

    if ((reqDto as any).driverUserId) {
      const driverResult = await this.dataSource.query(
        `SELECT id FROM drivers WHERE user_id = $1 LIMIT 1`,
        [(reqDto as any).driverUserId]
      );
      if (driverResult && driverResult.length > 0) {
        query.andWhere('request.driverId = :driverId', { driverId: driverResult[0].id });
      } else {
        query.andWhere('1 = 0');
      }
    }

    applyFiltersToQueryBuilder(query, reqDto, {
      searchColumns: [
        'user.firstName',
        'user.lastName',
        'user.email',
        'driver.firstName',
        'driver.lastName',
      ],
    });

    const [requests, metaDto] = await paginate<RequestEntity>(query, reqDto, {
      skipCount: false,
      takeAll: false,
    });

    return new OffsetPaginatedDto(
      plainToInstance(RequestResDto, requests),
      metaDto,
    );
  }

  /**
   * Retrieves a live request from the Redis cache.
   *
   * @param requestId - Unique request identifier
   * @returns Request payload if active, otherwise null
   */
  async getRequestFromCache(requestId: string): Promise<RequestResDto | null> {
    let request = await this.cacheRepo.get(requestId);
    if (!request) {
      this.logger.warn(`Request ${requestId} missing from cache. Falling back to DB.`);
      const entity = await this.requestRepo.findOne({
        where: { id: requestId as Uuid },
        relations: ['user', 'driver', 'driver.user'],
      });
      if (entity) {
        request = plainToInstance(RequestResDto, entity, { excludeExtraneousValues: true });
        const isTerminal = [
          RequestStatusEnum.DELIVERED,
          RequestStatusEnum.CANCELLED,
          RequestStatusEnum.EXPIRED,
        ].includes(entity.status as any);
        
        const ttl = isTerminal ? 60 : 14400;
        await this.setRequestInCache(request, ttl);
      }
    }
    return request;
  }

  /**
   * Sets or refreshes a request in the Redis cache.
   *
   * @param request - Request payload to persist
   * @param ttlSeconds - Time-to-live in seconds (default: 300)
   */
  async setRequestInCache(
    request: RequestResDto,
    ttlSeconds = 60,
  ): Promise<void> {
    await this.cacheRepo.set(request, ttlSeconds);
  }

  /**
   * Updates an active request in the cache.
   * Merges provided updates with existing cached data.
   *
   * @param requestId - Target request identifier
   * @param updates - Partial fields to update
   * @returns Fully updated request payload
   * @throws {Error} If request is not found in cache
   */
  async updateRequest(
    requestId: string,
    updates: Partial<RequestResDto>,
  ): Promise<RequestResDto> {
    const existing = await this.getRequestFromCache(requestId);

    if (!existing) {
      throw new Error(ErrorMessageConstants.REQUEST.ID_NOT_FOUND);
    }

    const updated = plainToInstance(RequestResDto, { ...existing, ...updates });

    await this.setRequestInCache(updated, 300);

    return updated;
  }

  /**
   * Explicitly removes a request from the Redis cache.
   *
   * @param requestId - Request identifier to purge
   */
  async deleteRequestFromCache(requestId: string): Promise<void> {
    await this.cacheRepo.delete(requestId);
  }

  /**
   * Transition a request to a terminal state and persists it to permanent storage.
   * Also orchestrates associated Order status updates and publishes final domain events.
   *
   * @param requestId - Request identifier
   * @param status - Final status (COMPLETED, CANCELLED, EXPIRED)
   * @returns The finalized request data
   * @throws {Error} If request not found in cache
   */
  async finalizeRequest(requestId: string, status: RequestStatusEnum, price?: number) {
    const request = await this.getRequestFromCache(requestId);
    if (!request) {
      throw new Error(ErrorMessageConstants.REQUEST.NOT_FOUND);
    }

    request.status = status;
    if (price !== undefined) {
      const settings = await this.settingService.getSettings();
      let markup = 0;
      const reqTypeStr = String(request.type).toUpperCase();
      
      if (reqTypeStr === 'BOTTLED') {
        markup = (request.quantity || 1) * 3; // 3 DZD per fardou
      } else if (reqTypeStr === 'TANKER') {
        const volume = request.tankerDetails?.volume || request.quantity || 1;
        const waterType = (request.tankerDetails?.waterType || '').toLowerCase();
        
        if (waterType === 'spring' || waterType === 'مياه ينابيع') {
          markup = (volume / 20) * 5; // 5 DZD per 20L bucket
        } else {
          // For well water or fallback
          markup = Math.ceil(volume / 1500) * 50; // 50 DZD per 1500 L
        }
      }
      
      request.subtotal = price;
      request.deliveryFee = markup;
      request.totalPrice = price + markup;
    }

    const isTerminal = [
      RequestStatusEnum.DELIVERED,
      RequestStatusEnum.CANCELLED,
      RequestStatusEnum.EXPIRED,
    ].includes(status as any);

    const ttl = isTerminal ? 60 : 14400; // 60s if terminal, 4 hours if active ride
    await this.setRequestInCache(request, ttl);

    // If cancelled or expired BEFORE any driver accepted it, DO NOT save to PostgreSQL
    if ((status === RequestStatusEnum.CANCELLED || status === RequestStatusEnum.EXPIRED) && !request.driverId) {
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let wilaya = 'Unknown Wilaya';
    let commune = 'Unknown Commune';

    if (request.pickupLat && request.pickupLng) {
      const geoResult = await this.geocodingService.reverseGeocode(request.pickupLat, request.pickupLng);
      if (geoResult) {
        wilaya = geoResult.wilaya;
        commune = geoResult.commune;
      }
    }

    try {
      const requestEntity = this.requestRepo.create({
        id: request.id as Uuid,
        status: status,
        userId: request.user?.id as Uuid,
        driverId: request.driverId ? (request.driverId as Uuid) : null,
        volume: request.tankerDetails?.volume || request.quantity,
        pickupLat: request.pickupLat,
        pickupLng: request.pickupLng,
        deliveryAddress: request.deliveryAddress,
        type: request.type,
        tankerDetails: request.tankerDetails,
        bottledItems: request.bottledItems,
        isScheduled: request.isScheduled || false,
        scheduledDate: request.scheduledDate,
        scheduledTime: request.scheduledTime,
        subtotal: request.subtotal,
        deliveryFee: request.deliveryFee,
        totalPrice: request.totalPrice,
        productId: request.productId ? (request.productId as Uuid) : null,
        wilaya,
        commune,
      });

      await queryRunner.manager.save(requestEntity);

      if (status === RequestStatusEnum.DELIVERED) {
        await queryRunner.manager.query(
          `UPDATE "orders" SET status = 'DELIVERED' WHERE "requestId" = $1`,
          [request.id]
        );

        if (request.driverId) {
          const finalPrice = request.totalPrice || 0;
          
          const driver = await queryRunner.manager.findOne('DriverEntity', {
            where: [{ id: request.driverId }, { user: { id: request.driverId } }],
            relations: ['user']
          }) as any;

          if (driver) {
            const settings = await this.settingService.getSettings();
            
            let commission = 0;
            const reqTypeStr = String(request.type).toUpperCase();
            
            if (reqTypeStr === 'BOTTLED') {
              commission = (request.quantity || 1) * 6; // 3 for customer + 3 for driver
            } else if (reqTypeStr === 'TANKER') {
              const volume = request.tankerDetails?.volume || request.quantity || 0;
              const waterType = (request.tankerDetails?.waterType || driver.waterType || '').toLowerCase();
              
              if (waterType === 'spring' || waterType === 'مياه ينابيع') {
                commission = (volume / 20) * 7; // 5 for customer + 2 for driver per 20L bucket
              } else {
                // For well water or fallback
                commission = Math.ceil(volume / 1500) * 100; // 50 for customer + 50 for driver per 1500 L
              }
            }

            let currentBalance = Number(driver.walletBalance || 0);
            let newDebt = Number(driver.appCommissionDebt || 0);

            if (currentBalance >= commission) {
              currentBalance -= commission;
            } else {
              const remainingCommission = commission - currentBalance;
              currentBalance = 0;
              newDebt += remainingCommission;
            }

            const isSuspended = settings.enableAutoSuspend ? newDebt >= Number(settings.maxDebtAllowed) : false;

            await queryRunner.manager.query(
              `UPDATE "drivers" SET "totalJobs" = "totalJobs" + 1, "totalEarnings" = "totalEarnings" + $1, "app_commission_debt" = $2, "walletBalance" = $3, "is_suspended" = $4 WHERE "id" = $5 OR "user_id" = $5`,
              [finalPrice, newDebt, currentBalance, isSuspended, request.driverId]
            );

            if (commission > 0) {
              const { v4: uuidv4 } = require('uuid');
              await queryRunner.manager.query(
                `INSERT INTO "wallet_transactions" ("id", "receiver_id", "amount", "type", "created_at", "updated_at") VALUES ($1, $2, $3, $4, NOW(), NOW())`,
                [uuidv4(), driver.user?.id || driver.id, commission, 'COMMISSION']
              );
            }
            
            // Sync to Redis Metadata so Radar knows instantly
            try {
              const targetMetadataId = request.driver?.user?.id || request.driverId;
              await this.driverMetadataService.updateMetadata(targetMetadataId as string, {
                isSuspended: isSuspended,
              });
            } catch (error: any) {
              this.logger.error(`Failed to sync isSuspended to metadata: ${error.message}`);
            }
          }
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to save finalized request to database: ${(error as Error).message}`);
    } finally {
      await queryRunner.release();
    }

    const routingKeyMap: Partial<Record<RequestStatusEnum, string>> = {
      [RequestStatusEnum.ACCEPTED]: RabbitMqRoutingKey.REQUEST_ACCEPTED,
      [RequestStatusEnum.ARRIVED]: RabbitMqRoutingKey.DRIVER_ARRIVED,
      [RequestStatusEnum.DELIVERING]: RabbitMqRoutingKey.RIDE_STARTED,
      [RequestStatusEnum.DELIVERED]: RabbitMqRoutingKey.RIDE_COMPLETED,
      [RequestStatusEnum.CANCELLED]: RabbitMqRoutingKey.REQUEST_CANCELLED,
      [RequestStatusEnum.EXPIRED]: RabbitMqRoutingKey.REQUEST_CANCELLED,
    };

    const routingKey = routingKeyMap[status];

    if (routingKey) {
      await this.amqpConnection.publish(
        RabbitMqExchange.REQUESTS,
        routingKey,
        request,
      );
    }

    if (
      status === RequestStatusEnum.DELIVERED ||
      status === RequestStatusEnum.CANCELLED ||
      status === RequestStatusEnum.EXPIRED
    ) {
      // FIX 3: Safe extraction of userId
      const uId = (request as any).userId || request.user?.id;
      
      if (uId) {
        // FIX 1: Safety block for Redis cleanup
        try {
          // FIX 2: Check method existence and execute
          if (typeof this.cacheRepo.removeUserActiveRequest === 'function') {
            await this.cacheRepo.removeUserActiveRequest(uId as string);
          } else {
            this.logger.warn(`removeUserActiveRequest method missing on cacheRepo for user ${uId}`);
          }
        } catch (error: any) {
          this.logger.error(`Failed to clean up active request for user ${uId}: ${error.message}`);
        }
      }

      if (request.driverId) {
        try {
          const targetMetadataId = request.driver?.user?.id || request.driverId;
          await this.driverMetadataService.updateMetadata(targetMetadataId as string, {
            status: 'AVAILABLE',
          });
        } catch (error: any) {
          this.logger.error(`Failed to update driver status: ${error.message}`);
        }
      }
    }

    return request;
  }

  /**
   * Finds the currently active request for a specific user.
   * Checks Redis for transient states (SEARCHING) and Postgres for active states (ACCEPTED, etc.).
   *
   * @param userId - Target user identifier
   * @returns Active request payload or null if none found
   */
  async findActiveRequest(userId: Uuid): Promise<RequestResDto | null> {
    const cachedRequestId = await this.cacheRepo.getUserActiveRequest(userId);
    if (cachedRequestId) {
      const cachedRequest = await this.getRequestFromCache(cachedRequestId);
      if (cachedRequest) return cachedRequest;
    }

    const activeStatus = [
      RequestStatusEnum.ACCEPTED,
      RequestStatusEnum.ARRIVED,
      RequestStatusEnum.DELIVERING,
    ];

    const request = await this.requestRepo.findOne({
      where: {
        userId,
        status: In(activeStatus),
      },
      relations: ['driver', 'user'],
    });

    if (!request) return null;

    return {
      id: request.id,
      status: request.status,
      user: request.user ? { ...request.user } : null,
      driverId: request.driverId,
      driver: request.driver ? { ...request.driver } : undefined,
      quantity: request.volume,
      type: request.type,
      tankerDetails: request.tankerDetails,
      bottledItems: request.bottledItems,
      pickupLat: request.pickupLat || 0,
      pickupLng: request.pickupLng || 0,
      deliveryAddress: request.deliveryAddress,
      productId: request.productId,
      totalPrice: request.totalPrice,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    } as unknown as RequestResDto;
  }

  /**
   * Finds the currently active request for a specific driver.
   * Checks Postgres for active states (ACCEPTED, ARRIVED, DELIVERING).
   *
   * @param driverId - Target driver identifier
   * @returns Active request payload or null if none found
   */
  async findActiveRequestForDriver(driverId: string): Promise<RequestResDto | null> {
    const activeStatus = [
      RequestStatusEnum.ACCEPTED,
      RequestStatusEnum.ARRIVED,
      RequestStatusEnum.DELIVERING,
    ];

    const request = await this.requestRepo.findOne({
      where: {
        driverId: driverId as Uuid,
        status: In(activeStatus),
      },
      relations: ['user'],
    });

    if (!request) return null;

    return {
      id: request.id,
      status: request.status,
      userId: request.userId,
      user: request.user ? { ...request.user } : null,
      driverId: request.driverId,
    } as unknown as RequestResDto;
  }

  /**
   * Rate a completed request.
   * Calculates the new average rating and updates the target (Driver or Customer).
   *
   * @param requestId - Request identifier
   * @param dto - Rating details
   * @param reviewerId - ID of the user submitting the rating
   */
  async rateRequest(requestId: string, dto: import('./dto/rate-request.dto').RateRequestDto, reviewerId: string) {
    const request = await this.requestRepo.findOne({
      where: { id: requestId as Uuid },
    });

    if (!request) {
      throw new Error(ErrorMessageConstants.REQUEST.NOT_FOUND);
    }

    if (request.status !== RequestStatusEnum.DELIVERED) {
      throw new Error('Request is not completed yet');
    }

    const isDriverRatingCustomer = request.driverId === reviewerId;
    const isCustomerRatingDriver = request.userId === reviewerId;

    if (!isDriverRatingCustomer && !isCustomerRatingDriver) {
      throw new Error('Unauthorized to rate this request');
    }

    let actualTargetId = dto.targetId;
    if (!actualTargetId || actualTargetId === 'unknown') {
      actualTargetId = isCustomerRatingDriver ? (request.driverId as string) : (request.userId as string);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Insert Rating Record
      await queryRunner.manager.insert(RatingEntity, {
        id: uuidv4() as any,
        rating: dto.rating,
        comment: dto.comment || null,
        reviewerId: reviewerId as any,
        targetId: actualTargetId as any,
        requestId: requestId as any,
      });

      // 2. Calculate New Average
      const result = await queryRunner.manager
        .createQueryBuilder(RatingEntity, 'rating')
        .select('AVG(rating.rating)', 'avg_rating')
        .where('rating.targetId = :targetId', { targetId: actualTargetId })
        .getRawOne();
      
      const newAvg = result?.avg_rating ? parseFloat(result.avg_rating) : dto.rating;

      // 3. Update Target Entity
      if (isCustomerRatingDriver) {
        await queryRunner.manager.query(
          `UPDATE "drivers" SET "rating" = $1 WHERE "user_id" = $2 OR "id" = $2`,
          [newAvg, actualTargetId]
        );
        // Also update Redis Metadata
        await this.driverMetadataService.updateMetadata(actualTargetId, {
          rating: newAvg,
        });
      } else {
        await queryRunner.manager.query(
          `UPDATE "users" SET "rating" = $1 WHERE "id" = $2`,
          [newAvg, actualTargetId]
        );
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Rating created for request ${requestId} by ${reviewerId}`);
      
      return { success: true, newRating: newAvg };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to create rating', err);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
  /**
   * Unified, transactional Cancellation flow for both Customer and Driver.
   */
  async cancelRequest(requestId: string, initiatorId: string, reason?: string) {
    // Validation: Fetch the request from Postgres.
    const requestEntity = await this.requestRepo.findOne({
      where: { id: requestId as Uuid },
      relations: ['user', 'driver', 'driver.user'],
    });

    const cachedRequest = await this.getRequestFromCache(requestId);

    if (!requestEntity) {
      if (cachedRequest && cachedRequest.status === RequestStatusEnum.SEARCHING) {
        if (cachedRequest.user?.id !== initiatorId && cachedRequest.user?.id !== (initiatorId as any).id) {
          throw new BadRequestException('Only the customer can cancel a searching request.');
        }

        // Persist the cancellation to DB & update Redis cache
        await this.finalizeRequest(requestId, RequestStatusEnum.CANCELLED);
        
        const payload = plainToInstance(RequestResDto, { ...cachedRequest, status: RequestStatusEnum.CANCELLED }, { excludeExtraneousValues: true });
        
        try {
          await this.amqpConnection.publish('requests', 'request.cancelled', {
            ...payload,
            reason: reason || 'تم إلغاء الطلب من قبل الزبون',
            canceledBy: initiatorId,
            requeued: false,
            alertTitle: 'تنبيه',
            alertMessage: 'تم إلغاء الطلب بنجاح.',
            action: 'GO_HOME',
          });
        } catch (e) {
          this.logger.error('Failed to publish request event', e);
        }

        return payload;
      }

      throw new Error(ErrorMessageConstants.REQUEST.NOT_FOUND);
    }

    const terminalStatuses = [
      RequestStatusEnum.CANCELLED,
      RequestStatusEnum.DELIVERED,
      RequestStatusEnum.EXPIRED,
    ];

    if (terminalStatuses.includes(requestEntity.status)) {
      throw new BadRequestException('Request is already finalized.');
    }

    // Since the database does not have driverId populated until terminal state,

    let driverUserId = requestEntity.driver?.user?.id;
    let cachedDriverId = requestEntity.driverId;

    if (cachedRequest && cachedRequest.driver && cachedRequest.driver.user) {
      driverUserId = cachedRequest.driver.user.id as any;
      cachedDriverId = cachedRequest.driverId as any;
    }

    const isDriverInitiator = driverUserId === initiatorId;
    const oldDriverId = cachedDriverId;
    const oldStatus = requestEntity.status;

    this.logger.log(`cancelRequest debugging - initiatorId: ${initiatorId}`);
    this.logger.log(`cancelRequest debugging - driverUserId: ${driverUserId}`);
    this.logger.log(`cancelRequest debugging - isDriverInitiator: ${isDriverInitiator}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (isDriverInitiator) {
        this.logger.log('[DEBUG] Driver initiated cancellation. Checking socket emit to Customer...');
        if ([RequestStatusEnum.ACCEPTED, RequestStatusEnum.ARRIVED, RequestStatusEnum.DELIVERING].includes(oldStatus as any)) {
          requestEntity.status = RequestStatusEnum.CANCELLED;
          if (reason) {
            requestEntity.cancelReason = reason;
          }
        } else {
          requestEntity.status = RequestStatusEnum.SEARCHING;
          requestEntity.driverId = null;
          requestEntity.driver = null as any;
        }
      } else {
        requestEntity.status = RequestStatusEnum.CANCELLED;
        if (reason) {
          requestEntity.cancelReason = reason;
        }
      }

      await queryRunner.manager.save(RequestEntity, requestEntity);

      // CRITICAL: Prevent dead orders by cancelling the associated OrderEntity 
      // regardless of who cancelled, if the driver was previously assigned.
      if (oldDriverId) {
        // Need to import OrderEntity and OrderStatusEnum at top or use string equivalents.
        // Assuming OrderEntity is already imported, or we use string 'orders' table
        // Actually, we can just do an update query to avoid missing imports.
        await queryRunner.manager.query(
          `UPDATE "orders" SET status = 'CANCELLED' WHERE "requestId" = $1 AND status NOT IN ('CANCELLED', 'DELIVERED')`,
          [requestEntity.id]
        );
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    if (requestEntity.status === RequestStatusEnum.CANCELLED) {
      const uId = requestEntity.userId || requestEntity.user?.id;
      if (uId) {
        await this.cacheRepo.removeUserActiveRequest(uId as string);
      }
    }

    // Post-Commit Cleanup
    if (isDriverInitiator && requestEntity.status === RequestStatusEnum.SEARCHING) {
      // Preserve existing refused drivers from cache and add the current driver
      const existingRefused = cachedRequest?.refusedDrivers || [];
      const newRefusedDrivers = [...new Set([...existingRefused, initiatorId as any])];

      // Re-queue in Redis
      const payloadDto = plainToInstance(RequestResDto, {
        ...requestEntity,
        driverId: null,
        driver: undefined,
        refusedDrivers: newRefusedDrivers,
      }, { excludeExtraneousValues: true });
      await this.redisScriptService.eval(
        'CREATE_REQUEST',
        [
          this.cacheRepo['getKey'](requestId),
          `${RedisConstants.KEYS.REQUESTS_INDEX}:user:${requestEntity.userId}`,
        ],
        [requestId, JSON.stringify(payloadDto), 60, requestEntity.userId],
      );
    } else {
      await this.deleteRequestFromCache(requestId);
      if (requestEntity.userId) {
        await this.cacheRepo.removeUserActiveRequest(requestEntity.userId);
      }
    }

    if (driverUserId) {
      await this.driverMetadataService.updateMetadata(driverUserId as string, {
        status: 'AVAILABLE',
      });
    }

    // Targeted Notification
    const payload = plainToInstance(RequestResDto, requestEntity, { excludeExtraneousValues: true });
    
    const isRequeued = isDriverInitiator && requestEntity.status === RequestStatusEnum.SEARCHING;

    const alertMessage = isDriverInitiator 
      ? (isRequeued 
          ? 'لقد اعتذر السائق عن التوصيل. جاري البحث عن سائق آخر فوراً...' 
          : 'نعتذر، لقد قام السائق بإلغاء الطلبية. يرجى إعادة الطلب.')
      : (reason || 'تم إلغاء الطلبية من الطرف الآخر.');

    const eventPayload = {
      ...payload,
      reason: reason || 'تم إلغاء الطلب من قبل السائق',
      canceledBy: initiatorId,
      requeued: isRequeued,
      alertTitle: 'تنبيه',
      alertMessage,
      action: isRequeued ? 'RE_ROUTING' : 'GO_HOME',
    };

    try {
      await this.amqpConnection.publish(
        'requests',
        isRequeued ? 'request.requeued' : 'request.cancelled',
        eventPayload
      );
    } catch (e) {
      this.logger.error('Failed to publish request event', e);
    }

    return payload;
  }
}
