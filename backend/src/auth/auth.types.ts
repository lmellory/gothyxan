export type SessionMeta = {
  userAgent?: string;
  ipAddress?: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
};
