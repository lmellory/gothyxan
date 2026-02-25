import {
  AdminAnalytics,
  AuthTokens,
  OutfitInput,
  OutfitResult,
  SavedOutfitRecord,
  UserProfile,
} from '../types/api';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  accessToken?: string;
};

function normalizeErrorMessage(payload: unknown, status: number) {
  if (!payload) {
    return `Request failed with ${status}`;
  }

  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload) as unknown;
      return normalizeErrorMessage(parsed, status);
    } catch {
      return payload;
    }
  }

  if (typeof payload !== 'object') {
    return `Request failed with ${status}`;
  }

  const data = payload as {
    message?: string | string[];
    reasons?: string[];
  };

  const reasons = Array.isArray(data.reasons) ? data.reasons : [];
  const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;

  if (reasons.includes('Budget constraints violated')) {
    return 'Could not build outfit for this budget. Try premium mode or increase custom range.';
  }
  if (reasons.includes('Style coherence too low')) {
    return 'Could not keep style coherence in this budget. Try another style or higher budget.';
  }
  if (reasons.includes('No branded items available in requested budget')) {
    return 'No branded items available in this budget range. Increase max budget or switch budget mode.';
  }
  if (typeof message === 'string') {
    const trimmed = message.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return normalizeErrorMessage(parsed, status);
      } catch {
        // keep original message if it is not valid JSON
      }
    }
  }
  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  return `Request failed with ${status}`;
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${API_URL}/api${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.accessToken
        ? {
            Authorization: `Bearer ${options.accessToken}`,
          }
        : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? '';
    let payload: unknown = null;

    if (contentType.includes('application/json')) {
      payload = await response.json();
    } else {
      payload = await response.text();
    }

    throw new Error(normalizeErrorMessage(payload, response.status));
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export const api = {
  register(input: { email: string; password: string; name?: string }) {
    return request<{ message: string; expiresInMinutes: number }>('/auth/register', {
      method: 'POST',
      body: input,
    });
  },
  verifyEmail(input: { email: string; code: string }) {
    return request<AuthTokens>('/auth/verify-email', {
      method: 'POST',
      body: input,
    });
  },
  login(input: { email: string; password: string }) {
    return request<AuthTokens>('/auth/login', {
      method: 'POST',
      body: input,
    });
  },
  refresh(input: { refreshToken: string }) {
    return request<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: input,
    });
  },
  me(accessToken: string) {
    return request<UserProfile>('/auth/me', { accessToken });
  },
  requestPasswordReset(input: { email: string }) {
    return request<{ message: string }>('/auth/password/request-reset', {
      method: 'POST',
      body: input,
    });
  },
  resetPassword(input: { email: string; code: string; newPassword: string }) {
    return request<{ message: string }>('/auth/password/reset', {
      method: 'POST',
      body: input,
    });
  },
  logout(input: { refreshToken: string }, accessToken: string) {
    return request('/auth/logout', {
      method: 'POST',
      body: input,
      accessToken,
    });
  },
  generateOutfit(input: OutfitInput, accessToken: string) {
    return request<OutfitResult>('/outfits/generate', {
      method: 'POST',
      body: input,
      accessToken,
    });
  },
  saveOutfit(outfit: OutfitResult, accessToken: string) {
    return request('/outfits/save', {
      method: 'POST',
      body: {
        channel: 'MOBILE',
        outfit,
      },
      accessToken,
    });
  },
  listSaved(accessToken: string) {
    return request<SavedOutfitRecord[]>('/outfits/saved', {
      accessToken,
    });
  },
  styleProfile(accessToken: string) {
    return request('/outfits/style-profile', { accessToken });
  },
  adminAnalytics(accessToken: string) {
    return request<AdminAnalytics>('/admin/analytics', { accessToken });
  },
};
