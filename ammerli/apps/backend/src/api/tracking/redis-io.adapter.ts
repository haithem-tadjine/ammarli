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
      const parsed = new URL(redisUrl);
      const options = {
        host: parsed.hostname,
        port: parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'rediss:' ? 6379 : 6379),
        password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
        username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
        maxRetriesPerRequest: null,
        tls: parsed.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
      };
      pubClient = new Redis(options);
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