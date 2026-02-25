'use client';

import { create } from 'zustand';
import { api } from '@/lib/api';
import {
  getStoredTokens,
  getStoredUser,
  setStoredTokens,
  setStoredUser,
} from '@/lib/auth-storage';
import { AuthTokens, UserProfile } from '@/lib/types';

type SessionState = {
  isHydrated: boolean;
  loading: boolean;
  error: string | null;
  tokens: AuthTokens | null;
  user: UserProfile | null;
  hydrate: () => Promise<void>;
  setTokens: (tokens: AuthTokens | null) => void;
  setUser: (user: UserProfile | null) => void;
  fetchMe: () => Promise<UserProfile | null>;
  signOut: () => Promise<void>;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  isHydrated: false,
  loading: false,
  error: null,
  tokens: null,
  user: null,
  hydrate: async () => {
    const tokens = getStoredTokens();
    const user = getStoredUser();
    set({ tokens, user, isHydrated: true });

    if (tokens?.accessToken) {
      try {
        await get().fetchMe();
      } catch {
        set({ error: 'Session refresh required' });
      }
    }
  },
  setTokens: (tokens) => {
    setStoredTokens(tokens);
    set({ tokens });
  },
  setUser: (user) => {
    setStoredUser(user);
    set({ user });
  },
  fetchMe: async () => {
    const { tokens } = get();
    if (!tokens) {
      return null;
    }

    set({ loading: true, error: null });
    try {
      const user = await api.me(tokens.accessToken);
      get().setUser(user);
      set({ loading: false });
      return user;
    } catch {
      try {
        const refreshed = await api.refresh({ refreshToken: tokens.refreshToken });
        get().setTokens(refreshed);
        const user = await api.me(refreshed.accessToken);
        get().setUser(user);
        set({ loading: false, error: null });
        return user;
      } catch (error) {
        get().setTokens(null);
        get().setUser(null);
        set({ loading: false, error: error instanceof Error ? error.message : 'Session error' });
        return null;
      }
    }
  },
  signOut: async () => {
    const { tokens } = get();
    if (tokens) {
      try {
        await api.logout({ refreshToken: tokens.refreshToken }, tokens.accessToken);
      } catch {
        // ignore logout API errors and clear local session anyway
      }
    }
    get().setTokens(null);
    get().setUser(null);
  },
}));
