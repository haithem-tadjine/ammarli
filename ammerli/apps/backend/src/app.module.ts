import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppThrottlerGuard } from './guards/app-throttler.guard';
import { LoggerModule } from './logger/logger.module';
import generateModulesSet from './utils/modules-set';

@Module({
  imports: [...generateModulesSet(), LoggerModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
