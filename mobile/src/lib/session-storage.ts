import * as SecureStore from 'expo-secure-store';
import { AuthTokens, UserProfile } from '../types/api';

const TOKENS_KEY = 'gothyxan_mobile_tokens';
const USER_KEY = 'gothyxan_mobile_user';

export async function getStoredTokens(): Promise<AuthTokens | null> {
  const raw = await SecureStore.getItemAsync(TOKENS_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
}

export async function setStoredTokens(tokens: AuthTokens | null) {
  if (!tokens) {
    await SecureStore.deleteItemAsync(TOKENS_KEY);
    return;
  }

  await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
}

export async function getStoredUser(): Promise<UserProfile | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export async function setStoredUser(user: UserProfile | null) {
  if (!user) {
    await SecureStore.deleteItemAsync(USER_KEY);
    return;
  }

  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}
