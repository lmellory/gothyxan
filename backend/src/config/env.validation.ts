const requiredVars = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
];

export const validateEnv = (env: Record<string, string | undefined>) => {
  const missing = requiredVars.filter((key) => !env[key]);

  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  const weakSecrets: string[] = [];
  if ((env.JWT_ACCESS_SECRET?.length ?? 0) < 32) {
    weakSecrets.push('JWT_ACCESS_SECRET');
  }
  if ((env.JWT_REFRESH_SECRET?.length ?? 0) < 32) {
    weakSecrets.push('JWT_REFRESH_SECRET');
  }
  if (weakSecrets.length) {
    throw new Error(`Weak secret(s): ${weakSecrets.join(', ')} must be at least 32 chars`);
  }

  if (env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.length < 10) {
    throw new Error('ADMIN_PASSWORD must be at least 10 characters');
  }

  if (env.CSRF_TOKEN_SECRET && env.CSRF_TOKEN_SECRET.length < 24) {
    throw new Error('CSRF_TOKEN_SECRET must be at least 24 characters');
  }

  if (env.ADMIN_ROUTE_SECRET && env.ADMIN_ROUTE_SECRET.length < 16) {
    throw new Error('ADMIN_ROUTE_SECRET must be at least 16 characters');
  }

  return env;
};
