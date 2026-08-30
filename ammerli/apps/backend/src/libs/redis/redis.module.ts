import { RedisModule, RedisService } from '@liaoliaots/nestjs-redis';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redlock from 'redlock';
import { DistributedLockService } from './distributed-lock.service';
import { RedisLibsService } from './redis-libs.service';
import { RedisScriptService } from './redis-script.service';

@Global()
@Module({
  imports: [
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => {
        const url = process.env.REDIS_URL;
        if (!url) {
          throw new Error('REDIS_URL is missing in environment variables!');
        }

        return {
          config: {
            url,
            tls: { rejectUnauthorized: false },
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            retryStrategy: (times) => Math.min(times * 50, 2000),
          },
        };
      },
    }),
  ],
  providers: [
    RedisLibsService,
    RedisScriptService,
    DistributedLockService,
    {
      provide: 'REDLOCK_CLIENT',
      inject: [RedisService],
      useFactory: (redisService: RedisService) => {
        // Extract the raw ioredis client from the library
        const client = redisService.getOrThrow();

        // Initialize Redlock with that client
        return new Redlock([client], {
          driftFactor: 0.01,
          retryCount: 10,
          retryDelay: 200,
          retryJitter: 200,
        });
      },
    },
    // 2. RAW CLIENT ALIAS (Compatibility Layer)
    // Allows you to use @Inject('REDIS_CLIENT') in your TrackingService
    // instead of refactoring it to use RedisLibsService.
    {
      provide: 'REDIS_CLIENT',
      inject: [RedisService],
      useFactory: (redisService: RedisService) => {
        return redisService.getOrThrow();
      },
    },
  ],
  exports: [
    RedisModule,
    RedisLibsService,
    RedisScriptService,
    DistributedLockService,
    'REDLOCK_CLIENT',
    'REDIS_CLIENT', // Export the alias
  ],
})
export class RedisLibModule { }