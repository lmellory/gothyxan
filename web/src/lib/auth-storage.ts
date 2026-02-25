import { AuthTokens, UserProfile } from './types';

const TOKENS_KEY = 'gothyxan_tokens';
const USER_KEY = 'gothyxan_user';

export function getStoredTokens(): AuthTokens | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(TOKENS_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
}

export function setStoredTokens(tokens: AuthTokens | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!tokens) {
    localStorage.removeItem(TOKENS_KEY);
    return;
  }

  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export function getStoredUser(): UserProfile | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserProfile | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!user) {
    localStorage.removeItem(USER_KEY);
    return;
  }

  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
