import {
  ClassSerializerInterceptor,
  HttpStatus,
  RequestMethod,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import compression from 'compression';
import helmet from 'helmet';
import { i18nValidationErrorFactory } from 'nestjs-i18n';
import { Logger } from 'nestjs-pino';
import Redis from 'ioredis';
import { AuthService } from './api/auth/auth.service';
import { RedisIoAdapter } from './api/tracking/redis-io.adapter';
import { AppModule } from './app.module';
import { type AllConfigType } from './config/config.type';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import setupSwagger from './utils/setup-swagger';

// منع انهيار التطبيق بسبب أي خطأ شبكي غير معالج في ioredis
process.on('unhandledRejection', (reason: any) => {
  if (reason?.name === 'MaxRetriesPerRequestError' || reason?.message?.includes('max retries per request')) {
    console.warn('⚠️ Caught ioredis retry limit error, ignoring to prevent crash.');
    return;
  }
});
const originalCtor = Redis.prototype.constructor;
(Redis.prototype as any).initialize = function (...args: any[]) {
  if (this.options && this.options.maxRetriesPerRequest === undefined) {
    this.options.maxRetriesPerRequest = null;
  }
  return originalCtor.apply(this, args);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  // Setup security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
          'style-src': ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
          'img-src': ["'self'", 'data:', 'cdn.jsdelivr.net'],
        },
      },
    }),
  );

  const configService = app.get(ConfigService<AllConfigType>);
  const reflector = app.get(Reflector);
  const isDevelopment =
    configService.getOrThrow('app.nodeEnv', { infer: true }) === 'development';
  const corsOrigin = configService.getOrThrow('app.corsOrigin', {
    infer: true,
  });

  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders:
      'Content-Type, Accept, Authorization, x-lang, Accept-Language',
    credentials: true,
  });
  console.info('CORS Origin:', corsOrigin);

  const redisIoAdapter = new RedisIoAdapter(app, configService);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // Use global prefix if you don't have subdomain
  app.setGlobalPrefix(
    configService.getOrThrow('app.apiPrefix', { infer: true }),
    {
      exclude: [
        { method: RequestMethod.GET, path: '/' },
        { method: RequestMethod.GET, path: 'health' },
      ],
    },
  );

  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.useGlobalGuards(
    new AuthGuard(reflector, app.get(AuthService)),
    new RolesGuard(reflector),
  );
  app.useGlobalFilters(new GlobalExceptionFilter(configService));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      exceptionFactory: i18nValidationErrorFactory,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  if (isDevelopment) {
    setupSwagger(
      app,
      configService.getOrThrow('app.apiPrefix', { infer: true }),
    );
  }

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.info(`Server running on ${await app.getUrl()}`);

  return app;
}

void bootstrap();