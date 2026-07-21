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
  ) {
    if (this.logger) {
      this.logger.setContext(TrackingGateway.name);
    }
  }

  async handleConnection(client: Socket): Promise<void> {
    const { driverId } = client.handshake.query as { driverId?: string };
    const token = client.handshake.auth?.token;

    // 1. Driver Connection
    if (driverId) {
      client.data.driverId = driverId;
      await client.join(`driver_${driverId}`); // Join driver room

      let driverType = undefined;
      let waterType = undefined;
      try {
        // NOTE: The app sends userProfile.id (= userId), not the driver table PK.
        // Use findByUserId to resolve the correct driver record.
        const driver = await this.driverService.findByUserId(driverId as any);
        driverType = driver.type;
        waterType = driver.waterType;
      } catch (e) {
        this.logger.warn(
          `Could not find driver details for userId ${driverId} during connection: ${e?.message}`,
        );
      }

      await this.trackingService.setDriverOnline(
        driverId,
        driverType,
        waterType,
      );
      this.logger.log(`${LogConstants.TRACKING.DRIVER_CONNECTED}: ${driverId}`);
      
      // Opportunistically trigger matching for the new online driver
      this.dispatchService.triggerMatchingForDriver(driverId);
      return;
    }

    // 2. User Connection (via JWT)
    if (token) {
      try {
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get('auth.secret'),
        });
        const userId = payload.id;
        client.data.userId = userId;
        await client.join(`user_${userId}`); // Join user room
        this.logger.log(`${LogConstants.TRACKING.USER_CONNECTED}: ${userId}`);
        return;
      } catch (error) {
        this.logger.warn(
          `${LogConstants.TRACKING.INVALID_TOKEN}: ${error.message}`,
        );
        client.disconnect();
        return;
      }
    }

    // 3. Unauthorized
    this.logger.warn(LogConstants.TRACKING.CONNECTION_REJECTED);
    client.disconnect();
  }

  handleDisconnect(client: Socket): void {
    const driverId = client.data?.driverId as string | undefined;
    if (driverId) {
      void this.trackingService.setDriverOffline(driverId);
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
        this.server.to(`user_${userId}`).emit(eventName, msg);
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
      // 1. Update location in Redis
      if (!this.trackingService) {
        throw new Error(ErrorMessageConstants.TRACKING.SERVICE_NOT_INITIALIZED);
      }

      const updated = await this.trackingService.updateDriverLocation(
        driverId,
        lat,
        lng,
      );

      client.emit('location_ack', {
        driverId,
        updated,
        timestamp: Date.now(),
      });

      // 2. Broadcast to users?
      // Real-time tracking of assigned driver:
      if (this.requestService) {
        const activeRequest = await this.requestService.findActiveRequestForDriver(driverId);
        if (activeRequest && activeRequest.user?.id) {
          this.server.to(`user_${activeRequest.user.id}`).emit('location_update', {
            lat,
            lng,
            bearing: parsedData?.bearing || 0,
          });
        }
      }

      // Opportunistically trigger matching with updated location
      this.dispatchService.triggerMatchingForDriver(driverId);
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
