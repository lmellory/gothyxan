import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { BootstrapModule } from './bootstrap/bootstrap.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { RedisModule } from './common/infra/redis.module';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './database/prisma.module';
import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';
import { MonetizationModule } from './monetization/monetization.module';
import { OutfitsModule } from './outfits/outfits.module';
import { BrandsModule } from './brands/brands.module';
import { UsersModule } from './users/users.module';
import { WeatherModule } from './weather/weather.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60_000,
          limit: 120,
        },
        {
          name: 'auth',
          ttl: 60_000,
          limit: 12,
        },
        {
          name: 'generate',
          ttl: 60_000,
          limit: 10,
        },
      ],
      getTracker: (req) =>
        req.headers?.['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
        req.ip ??
        req.socket?.remoteAddress ??
        'anonymous',
    }),
    RedisModule,
    PrismaModule,
    BootstrapModule,
    HealthModule,
    MailModule,
    MonetizationModule,
    UsersModule,
    AuthModule,
    BrandsModule,
    WeatherModule,
    MediaModule,
    AiModule,
    OutfitsModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
