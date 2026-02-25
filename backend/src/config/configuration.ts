export default () => ({
  api: {
    port: parseInt(process.env.API_PORT ?? '4000', 10),
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
    publicBaseUrl: process.env.API_PUBLIC_BASE_URL ?? 'http://localhost:4000',
  },
  auth: {
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '30d',
  },
  email: {
    from: process.env.EMAIL_FROM ?? 'no-reply@gothyxan.app',
    provider: process.env.EMAIL_PROVIDER ?? 'console',
    smtpHost: process.env.EMAIL_SMTP_HOST,
    smtpPort: parseInt(process.env.EMAIL_SMTP_PORT ?? '587', 10),
    smtpUser: process.env.EMAIL_SMTP_USER,
    smtpPass: process.env.EMAIL_SMTP_PASS,
  },
  weather: {
    apiKey: process.env.OPENWEATHER_API_KEY,
  },
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  monetization: {
    affiliateTag: process.env.AFFILIATE_TAG,
  },
  security: {
    forceHttps: process.env.FORCE_HTTPS === 'true',
    csrfEnabled: process.env.CSRF_PROTECTION_ENABLED !== 'false',
    abuseDetectionEnabled: process.env.ABUSE_DETECTION_ENABLED !== 'false',
    adminRouteSecret: process.env.ADMIN_ROUTE_SECRET,
    cookie: {
      enabled: process.env.AUTH_REFRESH_COOKIE_ENABLED === 'true',
      secure: process.env.AUTH_COOKIE_SECURE !== 'false',
      sameSite: process.env.AUTH_COOKIE_SAMESITE ?? 'strict',
      domain: process.env.AUTH_COOKIE_DOMAIN,
      maxAgeMs: parseInt(process.env.AUTH_COOKIE_MAX_AGE_MS ?? `${30 * 24 * 60 * 60 * 1000}`, 10),
    },
  },
});
