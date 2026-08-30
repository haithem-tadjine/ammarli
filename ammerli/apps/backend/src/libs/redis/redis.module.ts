import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import Redlock from 'redlock';
import { DistributedLockService } from './distributed-lock.service';
import { RedisLibsService } from './redis-libs.service';
import { RedisScriptService } from './redis-script.service';

export const createRedisClient = () => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error('REDIS_URL is not defined in process.env!');
  }

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    tls: redisUrl.startsWith('rediss://')
      ? {
        rejectUnauthorized: false,
      }
      : undefined,
  });

  client.on('error', (err) => {
    console.error('[Redis Client Error]', err.message);
    if (client.options) {
      console.error(' -> Attempted to connect to:', client.options.host + ':' + client.options.port);
    }
  });

  return client;
};

export const redisProvider = {
  provide: 'REDIS_CLIENT',
  useFactory: () => {
    return createRedisClient();
  },
};

@Global()
@Module({
  providers: [
    redisProvider,
    RedisLibsService,
    RedisScriptService,
    DistributedLockService,
    {
      provide: 'REDLOCK_CLIENT',
      inject: ['REDIS_CLIENT'],
      useFactory: (client: Redis) => {
        return new Redlock([client], {
          driftFactor: 0.01,
          retryCount: 10,
          retryDelay: 200,
          retryJitter: 200,
        });
      },
    },
  ],
  exports: [
    RedisLibsService,
    RedisScriptService,
    DistributedLockService,
    'REDLOCK_CLIENT',
    'REDIS_CLIENT',
  ],
})
export class RedisLibModule { }