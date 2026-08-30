import { ApiModule } from '@/api/api.module';
import authConfig from '@/api/auth/config/auth.config';
import { BackgroundModule } from '@/background/background.module';
import appConfig from '@/config/app.config';
import { AllConfigType } from '@/config/config.type';
import { Environment } from '@/constants/app.constant';
import databaseConfig from '@/database/config/database.config';
import { TypeOrmConfigService } from '@/database/typeorm-config.service';
import { RabbitMqLibModule } from '@/libs/rabbitMq/rabbitMq.module';
import redisConfig from '@/libs/redis/config/redis.config';
import { RedisLibModule } from '@/libs/redis/redis.module';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { ModuleMetadata } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { redisStore } from 'cache-manager-ioredis-yet';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import { LoggerModule } from 'nestjs-pino';
import path from 'path';
import Redis from 'ioredis';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { DataSource, DataSourceOptions } from 'typeorm';
import loggerFactory from './logger-factory';

export const createRedisClient = () => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error('REDIS_URL is not defined in process.env!');
  }

  const parsed = new URL(redisUrl);
  const options = {
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'rediss:' ? 6379 : 6379),
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    maxRetriesPerRequest: null,
    tls: parsed.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
  };

  const client = new Redis(options);

  client.on('error', (err) => {
    console.error('[Redis Client Error]', err.message);
    if (client.options) {
      console.error(' -> Attempted to connect to:', client.options.host + ':' + client.options.port);
    }
  });

  return client;
};

function generateModulesSet() {
  const imports: ModuleMetadata['imports'] = [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, authConfig],
      envFilePath: ['.env'],
    }),
  ];
  let customModules: ModuleMetadata['imports'] = [];

  const dbModule = TypeOrmModule.forRootAsync({
    useClass: TypeOrmConfigService,
    dataSourceFactory: async (options: DataSourceOptions) => {
      if (!options) {
        throw new Error('Invalid options passed');
      }

      return new DataSource(options).initialize();
    },
  });

  const bullModule = BullModule.forRootAsync({
    imports: [ConfigModule],
    useFactory: (configService: ConfigService<AllConfigType>) => {
      return {
        connection: createRedisClient(),
        defaultJobOptions: {
          removeOnComplete: { count: 0 },
          removeOnFail: { count: 100 },
        },
      };
    },
    inject: [ConfigService],
  });

  const i18nModule = I18nModule.forRootAsync({
    resolvers: [
      { use: QueryResolver, options: ['lang'] },
      AcceptLanguageResolver,
      new HeaderResolver(['x-lang', 'Accept-Language']),
    ],
    useFactory: (configService: ConfigService<AllConfigType>) => {
      const env = configService.get('app.nodeEnv', { infer: true });
      const isLocal = env === Environment.LOCAL;
      const isDevelopment = env === Environment.DEVELOPMENT;
      const i18nPath = path.join(
        process.cwd(),
        process.env.NODE_ENV === 'production' ? 'dist/i18n' : 'src/i18n',
      );
      const fallback = configService.getOrThrow('app.fallbackLanguage', {
        infer: true,
      });
      return {
        fallbackLanguage: fallback,
        loaderOptions: {
          path: i18nPath,
          watch: isLocal,
        },
        typesOutputPath: path.join(
          __dirname,
          '../../src/generated/i18n.generated.ts',
        ),
        logging: isLocal || isDevelopment,
      };
    },
    inject: [ConfigService],
  });

  const loggerModule = LoggerModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: loggerFactory,
  });

  const cacheModule = CacheModule.registerAsync({
    imports: [ConfigModule],
    useFactory: async (configService: ConfigService<AllConfigType>) => {
      return {
        store: await redisStore(createRedisClient() as any),
      };
    },
    isGlobal: true,
    inject: [ConfigService],
  });

  const throttlerModule = ThrottlerModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService<AllConfigType>) => ({
      throttlers: [
        {
          name: 'default',
          ttl: 60000,
          limit: 20,
        },
        {
          name: 'auth',
          ttl: 60000,
          limit: 3,
        },
      ],
      storage: new ThrottlerStorageRedisService(createRedisClient()),
    }),
  });

  const modulesSet = process.env.MODULES_SET || 'monolith';

  switch (modulesSet) {
    case 'monolith':
      customModules = [
        ApiModule,
        bullModule,
        BackgroundModule,
        cacheModule,
        throttlerModule,
        dbModule,
        i18nModule,
        loggerModule,
        RedisLibModule,
        RabbitMqLibModule,
      ];
      break;
    case 'api':
      customModules = [
        ApiModule,
        bullModule,
        cacheModule,
        throttlerModule,
        dbModule,
        i18nModule,
        loggerModule,
        RedisLibModule,
        RabbitMqLibModule,
      ];
      break;
    case 'background':
      customModules = [
        bullModule,
        BackgroundModule,
        cacheModule,
        dbModule,
        i18nModule,
        loggerModule,
        RedisLibModule,
        RabbitMqLibModule,
      ];
      break;
    default:
      console.error(`Unsupported modules set: ${modulesSet}`);
      break;
  }

  return imports.concat(customModules);
}

export default generateModulesSet;