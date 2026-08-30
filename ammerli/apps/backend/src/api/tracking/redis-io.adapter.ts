import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { ServerOptions } from 'socket.io';
import { getRedisConnectionOptions } from '../../utils/modules-set';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(
    private readonly app: INestApplicationContext,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const opts = getRedisConnectionOptions();

    const pubClient = new Redis(opts);
    const subClient = new Redis(opts); // Fresh connection, not duplicate — avoids ioredis duplicate() bugs

    pubClient.on('connect', () => console.log('[Redis IO Adapter] pubClient connected'));
    pubClient.on('error', (err) =>
      console.error('[Redis IO Adapter pubClient Error]', err.message, '| host:', opts.host)
    );

    subClient.on('connect', () => console.log('[Redis IO Adapter] subClient connected'));
    subClient.on('error', (err) =>
      console.error('[Redis IO Adapter subClient Error]', err.message, '| host:', opts.host)
    );

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}