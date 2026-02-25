import { create } from 'zustand';
import { api } from '../lib/api';
import { OutfitInput, OutfitResult, SavedOutfitRecord } from '../types/api';
import { useSessionStore } from './use-session-store';

type ChatMessage =
  | {
      id: string;
      role: 'user';
      text: string;
    }
  | {
      id: string;
      role: 'assistant';
      text: string;
      outfit: OutfitResult;
    };

type ChatState = {
  loading: boolean;
  error: string | null;
  messages: ChatMessage[];
  saved: SavedOutfitRecord[];
  generate: (input: OutfitInput) => Promise<void>;
  saveOutfit: (outfit: OutfitResult) => Promise<void>;
  fetchSaved: () => Promise<void>;
};

function summary(input: OutfitInput) {
  return `style=${input.style} | occasion=${input.occasion ?? 'casual'} | budget=${input.budgetMode ?? 'cheaper'} | city=${input.city ?? 'auto'}`;
}

export const useChatStore = create<ChatState>((set, get) => ({
  loading: false,
  error: null,
  messages: [],
  saved: [],
  generate: async (input) => {
    const tokens = useSessionStore.getState().tokens;
    if (!tokens?.accessToken) {
      set({ error: 'Login required' });
      return;
    }

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: summary(input),
    };

    set((state) => ({
      loading: true,
      error: null,
      messages: [...state.messages, userMessage],
    }));

    try {
      const outfit = await api.generateOutfit(input, tokens.accessToken);
      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        text: outfit.explanation,
        outfit,
      };

      set((state) => ({
        loading: false,
        messages: [...state.messages, assistantMessage],
      }));
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Generation failed',
      });
    }
  },
  saveOutfit: async (outfit) => {
    const tokens = useSessionStore.getState().tokens;
    if (!tokens?.accessToken) {
      set({ error: 'Login required to save outfit' });
      return;
    }
    await api.saveOutfit(outfit, tokens.accessToken);
    await get().fetchSaved();
  },
  fetchSaved: async () => {
    const tokens = useSessionStore.getState().tokens;
    if (!tokens?.accessToken) {
      set({ saved: [] });
      return;
    }
    try {
      const saved = await api.listSaved(tokens.accessToken);
      set({ saved });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load saved outfits' });
    }
  },
}));
