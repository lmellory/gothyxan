'use client';

import { useEffect } from 'react';
import { useSessionStore } from '@/store/use-session-store';

export function SessionBootstrap() {
  const { isHydrated, hydrate } = useSessionStore();

  useEffect(() => {
    if (!isHydrated) {
      void hydrate();
    }
  }, [hydrate, isHydrated]);

  return null;
}
