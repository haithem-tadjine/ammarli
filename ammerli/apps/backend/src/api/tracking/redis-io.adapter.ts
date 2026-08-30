import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(
    private readonly app: INestApplicationContext,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const redisUrl =
      this.configService.get<string>('redis.url') || process.env.REDIS_URL;

    let pubClient: Redis;

    if (redisUrl) {
      pubClient = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        tls: redisUrl.startsWith('rediss://')
          ? { rejectUnauthorized: false }
          : undefined,
      });
    } else {
      const redisHost = this.configService.get<string>('redis.host') || 'localhost';
      const redisPort = this.configService.get<number>('redis.port') || 6379;
      const redisPassword = this.configService.get<string>('redis.password');

      pubClient = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        maxRetriesPerRequest: null,
      });
    }

    pubClient.on('error', (err) => {
      console.error('[Redis IO Adapter PubClient Error]', err.message);
      if (pubClient.options) {
        console.error(' -> Attempted to connect to:', pubClient.options.host + ':' + pubClient.options.port);
      }
    });

    const subClient = pubClient.duplicate();

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}