import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminRouteSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedSecret = process.env.ADMIN_ROUTE_SECRET?.trim();
    if (!expectedSecret) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const provided = request.headers['x-admin-secret'];
    const normalized = Array.isArray(provided) ? provided[0] : provided;

    if (!normalized || normalized !== expectedSecret) {
      throw new UnauthorizedException('Missing or invalid admin route secret');
    }

    return true;
  }
}

