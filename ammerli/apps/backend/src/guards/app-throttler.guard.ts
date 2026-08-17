import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const type = context.getType();
    
    // Bypass rate limiting for WebSockets and RMQ microservices
    if (type !== 'http') {
      return true;
    }

    // Process HTTP rate limiting normally
    return super.canActivate(context);
  }
}
