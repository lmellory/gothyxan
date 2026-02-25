'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { useChatStore } from '@/store/use-chat-store';
import { useSessionStore } from '@/store/use-session-store';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { OutfitCard } from './outfit-card';
import { OutfitSummaryPanel } from './outfit-summary-panel';

const styleOptions = [
  'streetwear',
  'minimal',
  'old money',
  'luxury',
  'techwear',
  'business',
  'vintage',
  'y2k',
  'smart casual',
  'goth',
  'avant-garde',
];

export function ChatShell() {
  const session = useSessionStore();
  const chat = useChatStore();

  const [style, setStyle] = useState('streetwear');
  const [occasion, setOccasion] = useState('casual');
  const [city, setCity] = useState('New York');
  const [fitPreference, setFitPreference] = useState<'oversize' | 'fitted' | 'relaxed'>('oversize');
  const [budgetMode, setBudgetMode] = useState<'cheaper' | 'premium' | 'custom'>('cheaper');
  const [budgetMin, setBudgetMin] = useState(200);
  const [budgetMax, setBudgetMax] = useState(800);
  const [luxuryOnly, setLuxuryOnly] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session.isHydrated) {
      void session.hydrate();
    }
  }, [session.isHydrated, session.hydrate]);

  useEffect(() => {
    const lastAssistant = [...chat.messages].reverse().find((message) => 'outfit' in message);
    if (!lastAssistant || !('outfit' in lastAssistant)) {
      return;
    }
    const pieces = [
      lastAssistant.outfit.top,
      lastAssistant.outfit.bottom,
      lastAssistant.outfit.shoes,
      lastAssistant.outfit.outerwear,
      ...lastAssistant.outfit.accessories,
    ];
    for (const piece of pieces) {
      const src = piece.image?.high_res ?? piece.image?.medium ?? piece.image_url;
      if (!src) {
        continue;
      }
      const img = new Image();
      img.src = src;
    }
  }, [chat.messages]);

  const isReady = useMemo(
    () => Boolean(session.tokens?.accessToken && session.user?.isEmailVerified),
    [session.tokens?.accessToken, session.user?.isEmailVerified],
  );

  async function onGenerate(e: FormEvent) {
    e.preventDefault();
    if (!isReady) {
      return;
    }

    await chat.generate({
      style,
      occasion,
      city,
      fitPreference,
      budgetMode,
      budgetMin: budgetMode === 'custom' ? budgetMin : undefined,
      budgetMax: budgetMode === 'custom' ? budgetMax : undefined,
      luxuryOnly,
    });
  }

  async function onSave(outfit: Record<string, unknown>) {
    if (!session.tokens?.accessToken) {
      return;
    }

    try {
      await api.saveOutfit({ channel: 'WEB', outfit }, session.tokens.accessToken);
      setSaveMessage('Outfit saved to your profile');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Save failed');
    }
  }

  if (!session.isHydrated) {
    return <p className="text-sm text-[var(--ink-muted)]">Loading session...</p>;
  }

  if (!isReady) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session required</CardTitle>
          <CardDescription>Sign in and verify email to generate branded outfits.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => (window.location.href = '/auth')}>Go to auth</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader>
          <Badge>Outfit Prompt</Badge>
          <CardTitle className="mt-2 text-xl">Generate branded fit</CardTitle>
          <CardDescription>Only branded items. Budget, weather, occasion and style aware.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onGenerate}>
            <div>
              <Label>Style</Label>
              <Select value={style} onChange={(e) => setStyle(e.target.value)}>
                {styleOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Occasion</Label>
              <Input value={occasion} onChange={(e) => setOccasion(e.target.value)} />
            </div>

            <div>
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>

            <div>
              <Label>Fit preference</Label>
              <Select value={fitPreference} onChange={(e) => setFitPreference(e.target.value as 'oversize' | 'fitted' | 'relaxed')}>
                <option value="oversize">oversize</option>
                <option value="relaxed">relaxed</option>
                <option value="fitted">fitted</option>
              </Select>
            </div>

            <div>
              <Label>Budget mode</Label>
              <Select value={budgetMode} onChange={(e) => setBudgetMode(e.target.value as 'cheaper' | 'premium' | 'custom')}>
                <option value="cheaper">cheaper</option>
                <option value="premium">premium</option>
                <option value="custom">custom</option>
              </Select>
            </div>

            {budgetMode === 'custom' ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Min</Label>
                  <Input type="number" value={budgetMin} onChange={(e) => setBudgetMin(Number(e.target.value))} min={50} />
                </div>
                <div>
                  <Label>Max</Label>
                  <Input type="number" value={budgetMax} onChange={(e) => setBudgetMax(Number(e.target.value))} min={100} />
                </div>
              </div>
            ) : null}

            <label className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-xs text-[var(--ink-muted)]">
              <input type="checkbox" checked={luxuryOnly} onChange={(e) => setLuxuryOnly(e.target.checked)} />
              Luxury-only mode (premium required)
            </label>

            <Button className="w-full" disabled={chat.generating}>
              {chat.generating ? 'Generating...' : 'Generate outfit'}
            </Button>

            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => session.signOut()}>
                Logout
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>GOTHYXAN Chat</CardTitle>
          <CardDescription>Premium outfit intelligence with strict JSON output and luxury media cards.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {chat.error ? <p className="rounded-md bg-[#3a1c1f] p-3 text-sm text-[#f7b9be]">{chat.error}</p> : null}
          {saveMessage ? <p className="rounded-md bg-[#1f3428] p-3 text-sm text-[#b7f5ca]">{saveMessage}</p> : null}

          <div className="max-h-[620px] space-y-4 overflow-y-auto pr-1">
            {chat.messages.length === 0 ? (
              <p className="rounded-md border border-dashed border-[var(--line)] p-4 text-sm text-[var(--ink-muted)]">
                Submit your first style request. Result will include top, bottom, shoes, outerwear and accessories.
              </p>
            ) : null}

            {chat.messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl p-4 ${
                  message.role === 'user'
                    ? 'ml-auto max-w-[92%] border border-[var(--line)] bg-[var(--panel-soft)]'
                    : 'mr-auto max-w-[98%] border border-[var(--line)] bg-[#140f21]'
                }`}
              >
                <p className="mb-2 text-xs uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                  {message.role === 'user' ? 'You' : 'GOTHYXAN AI'}
                </p>
                <p className="text-sm leading-relaxed text-[var(--ink-white)]">{message.text}</p>

                {'outfit' in message ? (
                  <div className="mt-4 space-y-3">
                    <OutfitSummaryPanel outfit={message.outfit} />

                    <motion.div
                      initial="hidden"
                      animate="show"
                      variants={{
                        hidden: { opacity: 0 },
                        show: { opacity: 1, transition: { staggerChildren: 0.06 } },
                      }}
                      className="grid gap-3 sm:grid-cols-2"
                    >
                      {[
                        { label: 'Top', piece: message.outfit.top },
                        { label: 'Bottom', piece: message.outfit.bottom },
                        { label: 'Shoes', piece: message.outfit.shoes },
                        { label: 'Outerwear', piece: message.outfit.outerwear },
                        ...message.outfit.accessories.slice(0, 2).map((piece, index) => ({
                          label: `Accessory ${index + 1}`,
                          piece,
                        })),
                      ].map(({ label, piece }) => (
                        <OutfitCard
                          key={`${message.id}-${label}-${piece.item}`}
                          label={label}
                          piece={piece}
                          onSave={() => onSave(message.outfit as unknown as Record<string, unknown>)}
                        />
                      ))}
                    </motion.div>
                  </div>
                ) : null}
              </motion.div>
            ))}

            {chat.generating ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="h-72 animate-pulse rounded-2xl border border-[var(--line)] bg-[linear-gradient(120deg,#111827,#1f2937,#111827)]"
                  />
                ))}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

