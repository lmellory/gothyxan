import { NextFunction, Request, Response } from 'express';

type AbuseOptions = {
  enabled: boolean;
  threshold: number;
  blockDurationMs: number;
  windowMs: number;
};

type AbuseState = {
  points: number;
  requests: number;
  firstSeenAt: number;
  blockedUntil?: number;
};

const SENSITIVE_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/password/request-reset',
  '/api/auth/password/reset',
  '/api/outfits/generate',
  '/api/outfits/regenerate',
];

export function createAbuseDetectionMiddleware(options: AbuseOptions) {
  const state = new Map<string, AbuseState>();
  const isSensitivePath = (path: string) => SENSITIVE_PATHS.some((entry) => path.startsWith(entry));

  return (req: Request, res: Response, next: NextFunction) => {
    if (!options.enabled) {
      return next();
    }

    const path = req.path ?? req.originalUrl ?? '';
    if (!isSensitivePath(path)) {
      return next();
    }

    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const now = Date.now();
    const current = state.get(ip);

    if (current?.blockedUntil && current.blockedUntil > now) {
      const waitSec = Math.ceil((current.blockedUntil - now) / 1000);
      res.setHeader('retry-after', String(waitSec));
      return res.status(429).json({
        message: 'Too many suspicious requests. Try again later.',
        retryAfterSec: waitSec,
      });
    }

    const record = thisWindowState(current, now, options.windowMs);
    record.requests += 1;
    if (record.requests > 80) {
      record.blockedUntil = now + options.blockDurationMs;
      state.set(ip, record);
      res.setHeader('retry-after', String(Math.ceil(options.blockDurationMs / 1000)));
      return res.status(429).json({ message: 'Request burst blocked by abuse detection' });
    }
    state.set(ip, record);

    res.on('finish', () => {
      const latest = state.get(ip) ?? thisWindowState(undefined, Date.now(), options.windowMs);
      const failed = res.statusCode >= 400;
      const authPath = path.startsWith('/api/auth/');
      const pointsDelta = failed ? (authPath ? 3 : 2) : -1;
      latest.points = Math.max(0, latest.points + pointsDelta);

      if (latest.points >= options.threshold) {
        latest.blockedUntil = Date.now() + options.blockDurationMs;
      }

      state.set(ip, latest);
    });

    return next();
  };
}

function thisWindowState(
  current: AbuseState | undefined,
  now: number,
  windowMs: number,
): AbuseState {
  if (!current || now - current.firstSeenAt > windowMs) {
    return {
      points: 0,
      requests: 0,
      firstSeenAt: now,
    };
  }
  return current;
}

