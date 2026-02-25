'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { OutfitPiece } from '@/lib/types';
import { Button } from '../ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function mediaPlaceholder() {
  return `${API_URL}/api/media/placeholder?variant=medium`;
}

function mediaSource(piece: OutfitPiece) {
  if (piece.image?.medium) {
    return piece.image.medium;
  }
  return piece.image_url;
}

export function OutfitCard({
  label,
  piece,
  onSave,
}: {
  label: string;
  piece: OutfitPiece;
  onSave?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const src = useMemo(() => (failed ? mediaPlaceholder() : mediaSource(piece)), [failed, piece]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="group relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[linear-gradient(145deg,#0b1427,#100f1a)] shadow-[0_10px_35px_rgba(0,0,0,0.35)]"
    >
      <div className="relative h-56 overflow-hidden bg-[#080f1c]">
        {!loaded ? <div className="absolute inset-0 animate-pulse bg-[linear-gradient(90deg,rgba(255,255,255,0.04),rgba(255,255,255,0.08),rgba(255,255,255,0.04))]" /> : null}
        <img
          src={src}
          alt={`${piece.brand} ${piece.item}`}
          className={`h-full w-full object-cover transition-all duration-500 ${loaded ? 'scale-100 opacity-100 blur-0' : 'scale-105 opacity-70 blur-sm'} group-hover:scale-[1.03]`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setFailed(true);
            setLoaded(true);
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-white/80 backdrop-blur">
          {label.toUpperCase()}
        </div>
        <div className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white/85 backdrop-blur">
          Tier {piece.tier}
        </div>
      </div>

      <div className="space-y-1 px-4 pb-4 pt-3">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-[var(--ink-muted)]">{piece.brand.toUpperCase()}</p>
        <p className="line-clamp-2 text-sm font-medium text-[var(--ink-white)]">{piece.item}</p>
        <p className="text-sm font-semibold text-[#9fe870]">${piece.price}</p>
      </div>

      <div className="absolute inset-x-3 bottom-3 translate-y-4 rounded-xl border border-white/15 bg-black/60 p-2 opacity-0 backdrop-blur transition-all duration-250 group-hover:translate-y-0 group-hover:opacity-100">
        <div className="grid grid-cols-3 gap-2">
          <Link href={piece.reference_link} target="_blank" rel="noreferrer" className="text-center">
            <Button size="sm" variant="secondary" className="w-full">
              View
            </Button>
          </Link>
          <Button size="sm" variant="secondary" onClick={onSave} className="w-full">
            Save
          </Button>
          <Link href={piece.affiliate_link ?? piece.reference_link} target="_blank" rel="noreferrer" className="text-center">
            <Button size="sm" className="w-full">
              Buy
            </Button>
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

