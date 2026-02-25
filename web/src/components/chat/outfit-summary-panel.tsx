'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { OutfitResult } from '@/lib/types';

function parseBudgetRange(range: string) {
  const match = range.match(/\$(\d+)\-\$(\d+)/);
  if (!match) {
    return { min: 0, max: 1 };
  }
  return { min: Number(match[1]), max: Number(match[2]) };
}

function weatherGlyph(input: string) {
  const value = input.toLowerCase();
  if (value.includes('rain') || value.includes('drizzle') || value.includes('storm')) {
    return '🌧';
  }
  if (value.includes('snow')) {
    return '❄️';
  }
  if (value.includes('cloud')) {
    return '☁️';
  }
  if (value.includes('clear') || value.includes('sun')) {
    return '☀️';
  }
  return '🌤';
}

export function OutfitSummaryPanel({ outfit }: { outfit: OutfitResult }) {
  const [animatedTotal, setAnimatedTotal] = useState(0);
  const budget = useMemo(() => parseBudgetRange(outfit.budget_range), [outfit.budget_range]);
  const meter = Math.max(0, Math.min(100, ((outfit.total_price - budget.min) / Math.max(1, budget.max - budget.min)) * 100));

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const to = outfit.total_price;
    const duration = 700;

    let raf = 0;
    const frame = (now: number) => {
      const elapsed = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setAnimatedTotal(Math.round(from + (to - from) * eased));
      if (elapsed < 1) {
        raf = requestAnimationFrame(frame);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [outfit.total_price]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-[var(--line)] bg-[linear-gradient(145deg,#0e1220,#181225)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
    >
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-xs tracking-[0.14em] text-[var(--ink-muted)]">OUTFIT SUMMARY</p>
          <p className="text-2xl font-semibold text-[var(--ink-white)]">${animatedTotal}</p>
          <p className="text-sm text-[var(--ink-muted)]">
            Budget {outfit.budget_range} · Style score {outfit.scores?.style_coherence ?? 0}/100
          </p>
        </div>
        <div className="text-3xl">{weatherGlyph(outfit.weather_context)}</div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-xs text-[var(--ink-muted)]">
          <span>Budget meter</span>
          <span>{Math.round(meter)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-[linear-gradient(90deg,#9fe870,#4ecdc4)]"
            initial={{ width: 0 }}
            animate={{ width: `${meter}%` }}
            transition={{ duration: 0.55 }}
          />
        </div>
      </div>
    </motion.section>
  );
}

