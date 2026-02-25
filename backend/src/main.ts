import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { createAbuseDetectionMiddleware } from './common/middleware/abuse-detection.middleware';
import { createCsrfProtectionMiddleware } from './common/middleware/csrf-protection.middleware';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const httpApp = app.getHttpAdapter().getInstance();
  httpApp.set('trust proxy', 1);
  httpApp.disable('x-powered-by');

  const corsOriginRaw = process.env.CORS_ORIGIN?.trim() ?? '*';
  const corsOrigins =
    corsOriginRaw === '*'
      ? true
      : corsOriginRaw
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean);
  const corsOriginList = corsOrigins === true ? [] : corsOrigins;
  const isProd = (process.env.NODE_ENV ?? '').toLowerCase() === 'production';
  const forceHttps = (process.env.FORCE_HTTPS ?? 'false') === 'true';
  const csrfEnabled = (process.env.CSRF_PROTECTION_ENABLED ?? 'true') === 'true';
  const csrfToken = process.env.CSRF_TOKEN_SECRET?.trim();
  const abuseEnabled = (process.env.ABUSE_DETECTION_ENABLED ?? 'true') === 'true';
  const cookieSameSite = process.env.COOKIE_SAMESITE ?? 'strict';

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  if (forceHttps) {
    app.use((req: Request, res: Response, next: NextFunction) => {
      const forwardedProto = req.headers['x-forwarded-proto']?.toString().split(',')[0]?.trim();
      const isHttps = forwardedProto === 'https' || req.secure;
      if (isHttps) {
        return next();
      }
      const host = req.headers.host;
      if (!host) {
        return next();
      }
      return res.redirect(301, `https://${host}${req.originalUrl}`);
    });
  }

  app.use(
    createAbuseDetectionMiddleware({
      enabled: abuseEnabled,
      threshold: Number(process.env.ABUSE_SCORE_THRESHOLD ?? '12'),
      blockDurationMs: Number(process.env.ABUSE_BLOCK_DURATION_MS ?? '300000'),
      windowMs: Number(process.env.ABUSE_WINDOW_MS ?? '60000'),
    }),
  );

  app.use(
    createCsrfProtectionMiddleware({
      enabled: csrfEnabled,
      allowedOrigins: corsOriginList,
      token: csrfToken,
      bypassPaths: [
        '/api/health',
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/verify-email',
        '/api/auth/password/request-reset',
        '/api/auth/password/reset',
        '/api/auth/telegram/login',
        '/api/monetization/affiliate/redirect',
      ],
    }),
  );

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", ...corsOriginList, 'https:', 'wss:', 'ws:'],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: isProd ? [] : null,
        },
      },
      hsts: isProd
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('x-cookie-security', `HttpOnly; Secure=${isProd}; SameSite=${cookieSameSite}`);
    next();
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
    const startedAt = Date.now();
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    res.on('finish', () => {
      const elapsedMs = Date.now() - startedAt;
      const user = (req as { user?: { sub?: string } }).user;
      const logEvent = {
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        elapsedMs,
        ip: req.ip,
        userId: user?.sub ?? null,
      };
      console.log(JSON.stringify(logEvent));
    });

    next();
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = config.get<number>('api.port') ?? 4000;
  await app.listen(port);
}

void bootstrap();
