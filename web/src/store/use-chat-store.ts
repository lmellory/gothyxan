'use client';

import { create } from 'zustand';
import { api } from '@/lib/api';
import { OutfitInput, OutfitResult } from '@/lib/types';
import { useSessionStore } from './use-session-store';

type ChatMessage =
  | {
      id: string;
      role: 'user';
      text: string;
      createdAt: string;
    }
  | {
      id: string;
      role: 'assistant';
      text: string;
      outfit: OutfitResult;
      createdAt: string;
    };

type ChatState = {
  generating: boolean;
  error: string | null;
  messages: ChatMessage[];
  generate: (input: OutfitInput) => Promise<void>;
};

function toUserSummary(input: OutfitInput) {
  const parts = [
    `Style: ${input.style}`,
    `Occasion: ${input.occasion ?? 'casual'}`,
    `Budget: ${input.budgetMode ?? 'cheaper'}${
      input.budgetMode === 'custom' ? ` (${input.budgetMin}-${input.budgetMax})` : ''
    }`,
    `City: ${input.city ?? 'auto'}`,
  ];
  return parts.join(' | ');
}

export const useChatStore = create<ChatState>((set, get) => ({
  generating: false,
  error: null,
  messages: [],
  generate: async (input) => {
    const tokens = useSessionStore.getState().tokens;
    if (!tokens) {
      set({ error: 'Login required' });
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: toUserSummary(input),
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      generating: true,
      error: null,
    }));

    try {
      const outfit = await api.generateOutfit(input, tokens.accessToken);

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: outfit.explanation,
        outfit,
        createdAt: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        generating: false,
      }));
    } catch (error) {
      set({
        generating: false,
        error: error instanceof Error ? error.message : 'Generation failed',
      });
    }
  },
}));
