import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType<'http' | 'ws' | 'rpc'>() !== 'http') {
      return true;
    }
    return super.canActivate(context);
  }
}
