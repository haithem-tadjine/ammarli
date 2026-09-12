import { ErrorMessageConstants } from '@/constants/error-code.constant';
import { LogConstants } from '@/constants/log.constant';
import { RabbitMqExchange, RabbitMqRoutingKey } from '@/libs/rabbitMq/domain-events';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer, // Import WebSocketServer
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io'; // Import Server
import { AppLogger } from 'src/logger/logger.service';
import { DriverService } from '../driver/driver.service';
import { TrackingService } from './tracking.service';
import { RequestService } from '../request/request.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { forwardRef, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Uuid } from '@/common/types/common.type';
import { NotificationService } from '../notification/notification.service';
import { GeocodingService } from '@/libs/geocoding/geocoding.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WilayaEntity } from '../wilaya/entities/wilaya.entity';
import { RedisLibsService } from '@/libs/redis/redis-libs.service';
import { SimulationService } from '../simulation/simulation.service';

/**
 * WebSocket Gateway for driver location updates and alerts.
 */
@WebSocketGateway({ namespace: '/tracking', cors: true })
@Injectable()
export class TrackingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  /**
   * In-memory throttle registry.
   * Prevents expensive operations (DB queries, Nominatim HTTP, wilaya lookup)
   * from running on every single location pulse.
   * Key: driverId, Value: timestamp of last full evaluation (ms).
   * Operations are skipped unless 60s have elapsed OR driver status changes.
   */
  private readonly _heavyOpsThrottle = new Map<string, number>();
  private readonly HEAVY_OPS_INTERVAL_MS = 60_000; // 60 seconds

  constructor(
    private readonly trackingService: TrackingService,
    private readonly logger: AppLogger,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly driverService: DriverService,
    @Inject(forwardRef(() => DispatchService))
    private readonly dispatchService: DispatchService,
    @Inject(forwardRef(() => RequestService))
    private readonly requestService: RequestService,
    @Inject(forwardRef(() => SimulationService))
    private readonly simulationService: SimulationService,
    private readonly notificationService: NotificationService,
    private readonly geocodingService: GeocodingService,
    @InjectRepository(WilayaEntity)
    private readonly wilayaRepo: Repository<WilayaEntity>,
    @Inject(CACHE_MANAGER) 
    private readonly cacheManager: Cache,
    private readonly redisLibsService: RedisLibsService,
  ) {
    if (this.logger) {
      this.logger.setContext(TrackingGateway.name);
    }
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      this.logger.warn(LogConstants.TRACKING.CONNECTION_REJECTED + ' - No token provided');
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('auth.secret'),
      });
      
      const userId = payload.id;
      client.data.user = payload;
      
      // Determine if connecting as driver or user.
      // We check if it's a driver connecting based on their intent (e.g. from query or simply by checking role if it was in payload).
      // Since frontend sends query: { driverId: userId }, we can use that to distinguish the connection type.
      // Crucially, we NEVER trust the driverId from the query itself for identity, we ONLY use the verified userId.
      const isDriverConnection = client.handshake.query?.driverId !== undefined;
      
      if (isDriverConnection) {
        const driverId = userId; // Securely force identity to the token's ID
        client.data.driverId = driverId;
        await client.join(`driver_${driverId}`); // Join driver room

        let driverType = undefined;
        let waterType = undefined;
        let isSuspended = undefined;
        try {
          const cacheKey = `ws_auth:driver:${driverId}`;
          const cachedDriver: any = await this.cacheManager.get(cacheKey);

          if (cachedDriver) {
            driverType = cachedDriver.type;
            waterType = cachedDriver.waterType;
            isSuspended = cachedDriver.isSuspended;
            client.data.phone = cachedDriver.phone;
            this.logger.debug(`[Cache Hit] Driver ${driverId} authenticated from Redis`);
          } else {
            // Cache Miss: Query Database
            const driver = await this.driverService.findByUserId(driverId as any);
            driverType = driver.type;
            waterType = driver.waterType;
            isSuspended = driver.isSuspended;
            client.data.phone = driver.user?.phone;
            
            await this.cacheManager.set(cacheKey, {
              type: driverType,
              waterType: waterType,
              isSuspended: isSuspended,
              phone: client.data.phone,
            }, 86400 * 1000); 
            this.logger.debug(`[Cache Miss] Driver ${driverId} authenticated from DB and cached`);
          }
        } catch (e) {
          this.logger.warn(
            `Could not find driver details for userId ${driverId} during connection: ${e?.message}`,
          );
        }

        await this.trackingService.setDriverOnline(
          driverId,
          driverType,
          waterType,
          isSuspended,
        );
        this.logger.log(`${LogConstants.TRACKING.DRIVER_CONNECTED}: ${driverId}`);

        // Phase 4: Driver Review Flow Interception
        const reviewDriverPhone = this.configService.get<string>('REVIEW_DRIVER_PHONE');
        if (reviewDriverPhone && client.data.phone === reviewDriverPhone) {
          this.logger.log(`[Review Environment] Review Driver ${driverId} connected. Bypassing production Geo Pool and injecting mock offer.`);
          client.data.isReviewDriver = true;
          
          // Ensure idempotency for the session by checking for an active request
          const activeRequest = await this.requestService.findActiveRequest(driverId as Uuid);
          
          if (!activeRequest) {
            await this.simulationService.injectMockOffer(driverId, driverId);
          } else {
            this.logger.log(`[Review Environment] Review Driver ${driverId} already has an active request (${activeRequest.id}). Skipping injection.`);
          }
        }
      } else {
        // User Connection
        client.data.userId = userId;
        await client.join(`user_${userId}`); // Join user room
        this.logger.log(`${LogConstants.TRACKING.USER_CONNECTED}: ${userId}`);
      }
    } catch (error) {
      this.logger.warn(
        `${LogConstants.TRACKING.INVALID_TOKEN}: ${error.message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const driverId = client.data?.driverId as string | undefined;
    if (driverId) {
      void this.trackingService.setDriverOffline(driverId);
      // Clean up throttle entry to prevent memory accumulation over long uptimes
      this._heavyOpsThrottle.delete(driverId);
      this.logger.log(
        `${LogConstants.TRACKING.DRIVER_DISCONNECTED}: ${driverId}`,
      );
    }

    const userId = client.data?.userId as string | undefined;
    if (userId) {
      this.logger.log(`${LogConstants.TRACKING.USER_DISCONNECTED}: ${userId}`);
    }
  }

  /**
   * Listen to Request events from RabbitMQ and forward to relevant sockets.
   */
  @RabbitSubscribe({
    exchange: RabbitMqExchange.REQUESTS,
    routingKey: ['request.#', 'ride.#'],
    queue: 'tracking_updates_queue_v2', // Durable queue for tracking service
  })
  async handleRequestEvents(msg: any) {
    // msg is the RequestResDto payload

    const userId = msg.user?.id || msg.userId;
    const driverId = msg.driverId;
    const status = msg.status;

    this.logger.log(
      `${LogConstants.TRACKING.PROCESSING_EVENT} ${msg.id}: ${status}`,
    );

    // Forward to User
    if (userId) {
      const eventMap: Record<string, string> = {
        ACCEPTED: 'request_accepted',
        LOCKED: 'request_accepted',
        ARRIVED: 'driver_arrived',
        DELIVERED: 'request_completed',
        CANCELLED: 'request_cancelled',
        EXPIRED: 'request_cancelled',
        DELIVERING: 'ride_started',
        SEARCHING: 'request_searching',
      };

      const eventName = eventMap[status];
      if (eventName) {
        // Broadcast to all instances
        if (msg.status === 'LOCKED') msg.status = 'ACCEPTED';
        this.server.to(`user_${userId}`).emit(eventName, msg);

        // ── Push Notification للزبون (يعمل حتى في الخلفية) ──────────────────
        // Socket.io يعمل فقط عندما يكون التطبيق مفتوحاً. Push Notification
        // يضمن وصول الإشعار حتى لو خرج الزبون من التطبيق.
        const customerPushMap: Record<string, { title: string; body: string }> = {
          request_accepted: {
            title: '🚚 تم قبول طلبيتك!',
            body: 'سائق قبل طلبيتك وهو في طريقه إليك. اضغط لتتبع الموقع.',
          },
          driver_arrived: {
            title: '📍 السائق عند الباب!',
            body: 'سائقك وصل وينتظرك بالخارج. الرجاء استلام الطلبية.',
          },
          request_completed: {
            title: '✅ تمت التوصيلة!',
            body: 'تم تسليم طلبيتك بنجاح. شكراً لاستخدامك أمرلي.',
          },
          request_cancelled: {
            title: '❌ تم إلغاء الطلبية',
            body: msg.alertMessage || 'تم إلغاء طلبيتك. اضغط لمعرفة التفاصيل.',
          },
        };

        const pushPayload = customerPushMap[eventName];
        if (pushPayload) {
          this.notificationService.sendPushNotification(
            userId,
            pushPayload.title,
            pushPayload.body,
            {
              type: eventName,
              orderId: String(msg.id || ''),
            },
          ).catch((err) =>
            this.logger.warn(`[Push] Failed to send customer push (${eventName}): ${err?.message}`),
          );
        }
        // ────────────────────────────────────────────────────────────────────
      }
    }

    // Forward to Driver (if needed for cancellations)
    let targetDriverUserId = msg.driver?.user?.id || msg.driver?.userId;
    let targetDriverPk = driverId || msg.offeredDriverId;

    // Fallback 1: Attempt to fetch from Redis if unknown
    if (!targetDriverUserId && msg.id) {
      try {
        const cachedRequest = await this.requestService.getRequestFromCache(msg.id);
        if (cachedRequest) {
          targetDriverUserId = targetDriverUserId || cachedRequest.driver?.user?.id || (cachedRequest.driver as any)?.userId;
          targetDriverPk = targetDriverPk || cachedRequest.driverId || cachedRequest.offeredDriverId;
          if (targetDriverUserId) {
            this.logger.log(`[Cancel Event] Recovered driver user ID from Redis cache: ${targetDriverUserId}`);
          }
        }
      } catch (e) {
        this.logger.warn(`[Cancel Event] Failed to read from Redis cache for Request ${msg.id}: ${e.message}`);
      }
    }

    // Fallback 2: If AMQP payload or Redis lost the driver user relation, fetch from DB
    if (!targetDriverUserId && targetDriverPk) {
      try {
        const driver = await this.driverService.findOne(targetDriverPk as any);
        if (driver?.user?.id) {
          targetDriverUserId = driver.user.id;
          this.logger.log(`[Cancel Event] Recovered driver user ID from DB: ${targetDriverUserId}`);
        }
      } catch (e) {
        this.logger.warn(`[Cancel Event] Failed to recover driver user ID for PK ${targetDriverPk}: ${e.message}`);
      }
    }

    const driverEventMap: Record<string, string> = {
      CANCELLED: 'request_cancelled',
      EXPIRED: 'request_cancelled',
    };
    const dEvent = driverEventMap[status];
    if (dEvent) {
      this.logger.log(`[Cancel Event] Requesting ${dEvent} for Request ${msg.id}`);
      this.logger.log(`[Cancel Event] targetDriverUserId: ${targetDriverUserId}, targetDriverPk: ${targetDriverPk}`);
      
      if (targetDriverUserId || targetDriverPk) {
        if (targetDriverUserId) {
          this.logger.log(`📡 Emitting ${dEvent} to socket room: driver_${targetDriverUserId}`);
          this.server.to(`driver_${targetDriverUserId}`).emit(dEvent, msg);
        }
        if (targetDriverPk && targetDriverPk !== targetDriverUserId) {
          this.logger.log(`📡 Emitting ${dEvent} to socket room: driver_${targetDriverPk}`);
          this.server.to(`driver_${targetDriverPk}`).emit(dEvent, msg);
        }
      } else {
        this.logger.warn(`[Cancel Event] Aborted ${dEvent} for Request ${msg.id}: No target driver ID could be resolved. Global broadcast prevented to protect privacy and performance.`);
      }
    }
  }

  /**
   * Listen to explicit DRIVER_OFFERED events to securely decouple websocket logic
   * from internal status mutations.
   */
  @RabbitSubscribe({
    exchange: RabbitMqExchange.REQUESTS,
    routingKey: RabbitMqRoutingKey.DRIVER_OFFERED,
    queue: 'tracking_driver_offered_queue_v2',
  })
  async handleDriverOffered(msg: any) {
    this.logger.log(`Received DRIVER_OFFERED event. User inside msg: ${JSON.stringify(msg.user)}`);
    if (msg.status === 'DISPATCHED' && msg.matchedDrivers) {
      msg.matchedDrivers.forEach((match: any) => {
        const dId = match.driverId;
        if (dId) {
          this.logger.log(`📡 Emitting dispatch_offer to socket room: driver_${dId}`);
          this.server.to(`driver_${dId}`).emit('dispatch_offer', msg);

          // Send high-priority data notification for Full-Screen Intent (Lock Screen Bypass)
          this.notificationService.sendDataNotification(dId, {
            type: 'dispatch_offer',
            orderId: String(msg.id || ''),
            payload: JSON.stringify(msg),
          });
        }
      });
    }
  }


  /**
   * Event: 'go_offline'
   */
  @SubscribeMessage('go_offline')
  async handleGoOffline(@ConnectedSocket() client: Socket) {
    const driverId = client.data?.driverId as string | undefined;
    if (driverId) {
      await this.trackingService.setDriverOffline(driverId);
      this.logger.log(
        `[TrackingGateway] Driver went offline explicitly: ${driverId}`,
      );
    }
  }

  /**
   * Event: 'update_location'
   */
  @SubscribeMessage('update_location')
  async handleLocationUpdate(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    const driverId = client.data?.driverId as string | undefined;
    if (!driverId) {
      client.emit('error', {
        message: ErrorMessageConstants.TRACKING.NOT_IDENTIFIED,
      });
      return;
    }

    // Handle clients like Postman that send stringified JSON
    let parsedData = payload;
    if (typeof payload === 'string') {
      try {
        parsedData = JSON.parse(payload);
      } catch (e) {
        // Leave as is, let validation fail
      }
    }

    const { lat, lng } = parsedData ?? {};
    if (lat == null || lng == null) {
      client.emit('error', {
        message: ErrorMessageConstants.TRACKING.INVALID_PAYLOAD,
      });
      return;
    }

    try {
      // 1. Update geospatial index in Redis — runs on every pulse (cheap Lua script)
      if (!this.trackingService) {
        throw new Error(ErrorMessageConstants.TRACKING.SERVICE_NOT_INITIALIZED);
      }

      let updated: number | boolean = 0;
      if (!client.data.isReviewDriver) {
        updated = await this.trackingService.updateDriverLocation(
          driverId,
          lat,
          lng,
        );
      }

      client.emit('location_ack', {
        driverId,
        updated,
        timestamp: Date.now(),
      });

      // 2. Forward driver position to the assigned customer.
      //    Uses the driver→request reverse index (written by accept_request.lua) for O(1) Redis lookup.
      //    No PostgreSQL query is made here — zero DB cost per GPS pulse.
      if (this.requestService) {
        const fullRequestKey = await this.redisLibsService.get(`requests:driver:${driverId}`);
        if (fullRequestKey) {
          // fullRequestKey = 'requests:{requestId}' — strip prefix to get the bare ID
          const requestId = fullRequestKey.replace(/^requests:/, '');
          const activeRequest = await this.requestService.getRequestFromCache(requestId);
          if (activeRequest?.user?.id) {
            this.server.to(`user_${activeRequest.user.id}`).emit('location_update', {
              lat,
              lng,
              bearing: parsedData?.bearing || 0,
            });
          }
        }
      }

      // 3. Heavy ops: Nominatim geocoding + wilaya DB lookup + suspension sync.
      //    Throttled to once per 60 seconds per driver to prevent Redis/DB/HTTP exhaustion.
      //    Matching is handled exclusively by the BullMQ sweep (every 10s) — no per-pulse trigger.
      const now = Date.now();
      const lastHeavyOps = this._heavyOpsThrottle.get(driverId) ?? 0;
      const shouldRunHeavyOps = (now - lastHeavyOps) >= this.HEAVY_OPS_INTERVAL_MS;

      if (shouldRunHeavyOps && !client.data.isReviewDriver) {
        this._heavyOpsThrottle.set(driverId, now);

        const geoResult = await this.geocodingService.reverseGeocode(lat, lng);
        if (geoResult?.wilaya) {
          const geoalgeria = require('geoalgeria');
          const reqWilayaLower = geoResult.wilaya.trim().toLowerCase();
          const matchedGeoWilaya = geoalgeria.wilayas.find((w: any) =>
            w.name_fr.toLowerCase() === reqWilayaLower ||
            w.name_ar === reqWilayaLower ||
            reqWilayaLower.includes(w.name_fr.toLowerCase()) ||
            reqWilayaLower.includes(w.name_ar) ||
            String(w.code) === reqWilayaLower ||
            String(w.code).padStart(2, '0') === reqWilayaLower
          );
          const searchCode = matchedGeoWilaya
            ? String(matchedGeoWilaya.code).padStart(2, '0')
            : geoResult.wilaya;

          const wilayaRecord = await this.wilayaRepo
            .createQueryBuilder('w')
            .where(':reqWilaya ILIKE \'%\' || w.name || \'%\'', { reqWilaya: geoResult.wilaya })
            .orWhere('w.code = :searchCode', { searchCode })
            .getOne();

          if (wilayaRecord && wilayaRecord.isDebtCeilingEnabled === false) {
            client.emit('sync_suspension', { isSuspended: false });
          } else {
            const driver = await this.driverService.findByUserId(driverId as Uuid);
            if (driver && driver.isSuspended) {
              client.emit('sync_suspension', { isSuspended: true });
            }
          }
        }
      }
      // NOTE: triggerMatchingForDriver deliberately removed.
      // Matching is handled exclusively by the BullMQ continuous-matching sweep (every 10s).
      // Running a full SCAN-based matching sweep on every location pulse was the
      // primary cause of Redis memory exhaustion.
    } catch (error) {
      if (this.logger) {
        this.logger.error(
          `${ErrorMessageConstants.TRACKING.UPDATE_FAILED} for driver ${driverId}`,
          error?.stack,
        );
      }
      client.emit('error', {
        driverId,
        message: ErrorMessageConstants.TRACKING.UPDATE_FAILED,
        debug: error?.message || String(error),
      });
    }
  }

  async sendAlert(driverId: string, payload: unknown): Promise<void> {
    try {
      this.server.to(`driver_${driverId}`).emit('new_alert', payload);
    } catch (error) {
      if (this.logger) {
        this.logger.error(
          `${LogConstants.DRIVER.STALE_REMOVE_FAILED} ${driverId}`,
          error?.stack,
        );
      }
    }
  }

  /**
   * Event: 'dispatch_rejected'
   * Emitted when a driver explicitly clicks the Reject button.
   */
  @SubscribeMessage('dispatch_rejected')
  async handleDispatchRejected(
    @MessageBody() payload: { requestId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const driverId = client.data?.driverId as string | undefined;
    const { requestId } = payload;
    if (driverId && requestId) {
      this.logger.log(`[TrackingGateway] Driver ${driverId} explicitly rejected request ${requestId}`);
      await this.dispatchService.handleDispatchRejection(requestId, driverId);
    }
  }

  /**
   * Event: 'dispatch_timeout'
   * Emitted automatically by the driver app if 15s timer expires.
   */
  @SubscribeMessage('dispatch_timeout')
  async handleDispatchTimeout(
    @MessageBody() payload: { requestId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const driverId = client.data?.driverId as string | undefined;
    const { requestId } = payload;
    if (driverId && requestId) {
      this.logger.log(`[TrackingGateway] Driver ${driverId} timed out on request ${requestId}`);
      await this.dispatchService.handleDispatchRejection(requestId, driverId);
    }
  }
}
