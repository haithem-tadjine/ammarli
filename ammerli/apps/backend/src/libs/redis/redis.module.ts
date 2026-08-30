import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import Redlock from 'redlock';
import { DistributedLockService } from './distributed-lock.service';
import { RedisLibsService } from './redis-libs.service';
import { RedisScriptService } from './redis-script.service';
import { getRedisClient } from '../../utils/modules-set';

export const redisProvider = {
  provide: 'REDIS_CLIENT',
  useFactory: () => {
    return getRedisClient();
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