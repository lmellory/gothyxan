import { create } from 'zustand';
import { api } from '../lib/api';
import {
  getStoredTokens,
  getStoredUser,
  setStoredTokens,
  setStoredUser,
} from '../lib/session-storage';
import { AuthTokens, UserProfile } from '../types/api';

type SessionState = {
  ready: boolean;
  loading: boolean;
  error: string | null;
  tokens: AuthTokens | null;
  user: UserProfile | null;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; name?: string }) => Promise<string>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  requestReset: (email: string) => Promise<string>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<string>;
  fetchMe: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  ready: false,
  loading: false,
  error: null,
  tokens: null,
  user: null,
  hydrate: async () => {
    const [tokens, user] = await Promise.all([getStoredTokens(), getStoredUser()]);
    set({ tokens, user, ready: true });

    if (tokens?.accessToken) {
      try {
        await get().fetchMe();
      } catch {
        // ignore hydrate refresh errors
      }
    }
  },
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const tokens = await api.login({ email, password });
      await setStoredTokens(tokens);
      set({ tokens });
      await get().fetchMe();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Login failed' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  register: async (input) => {
    set({ loading: true, error: null });
    try {
      const response = await api.register(input);
      return response.message;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Register failed' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  verifyEmail: async (email, code) => {
    set({ loading: true, error: null });
    try {
      const tokens = await api.verifyEmail({ email, code });
      await setStoredTokens(tokens);
      set({ tokens });
      await get().fetchMe();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Verification failed' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  requestReset: async (email) => {
    set({ loading: true, error: null });
    try {
      const response = await api.requestPasswordReset({ email });
      return response.message;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Reset request failed' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  resetPassword: async (email, code, newPassword) => {
    set({ loading: true, error: null });
    try {
      const response = await api.resetPassword({ email, code, newPassword });
      return response.message;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Reset failed' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  fetchMe: async () => {
    const tokens = get().tokens;
    if (!tokens) {
      set({ user: null });
      return;
    }

    try {
      const user = await api.me(tokens.accessToken);
      await setStoredUser(user);
      set({ user, error: null });
    } catch {
      const refreshed = await api.refresh({ refreshToken: tokens.refreshToken });
      await setStoredTokens(refreshed);
      const user = await api.me(refreshed.accessToken);
      await setStoredUser(user);
      set({ tokens: refreshed, user, error: null });
    }
  },
  logout: async () => {
    const tokens = get().tokens;
    if (tokens) {
      try {
        await api.logout({ refreshToken: tokens.refreshToken }, tokens.accessToken);
      } catch {
        // ignore remote logout failure
      }
    }

    await Promise.all([setStoredTokens(null), setStoredUser(null)]);
    set({ tokens: null, user: null, error: null });
  },
}));
