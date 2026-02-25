import { NextFunction, Request, Response } from 'express';

type CsrfOptions = {
  enabled: boolean;
  allowedOrigins: string[];
  token?: string;
  bypassPaths?: string[];
};

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function createCsrfProtectionMiddleware(options: CsrfOptions) {
  const bypass = options.bypassPaths ?? [];
  const allowed = new Set(options.allowedOrigins.map((origin) => origin.trim()).filter(Boolean));

  return (req: Request, res: Response, next: NextFunction) => {
    if (!options.enabled || SAFE_METHODS.has(req.method)) {
      return next();
    }

    const path = req.path ?? req.originalUrl ?? '';
    if (bypass.some((entry) => path.startsWith(entry))) {
      return next();
    }

    const origin = req.headers.origin?.toString();
    if (origin && allowed.size > 0 && !allowed.has(origin)) {
      return res.status(403).json({ message: 'CSRF blocked: origin not allowed' });
    }

    if (origin && options.token) {
      const csrfToken = req.headers['x-csrf-token']?.toString();
      if (!csrfToken || csrfToken !== options.token) {
        return res.status(403).json({ message: 'CSRF blocked: token mismatch' });
      }
    }

    return next();
  };
}

