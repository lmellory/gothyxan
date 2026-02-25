export type HarmonyType = 'complementary' | 'analogous' | 'monochrome' | 'neutral' | 'mixed';

export type BrandKnowledge = {
  tier: number;
  prestigeWeight: number;
  affiliatePriority: number;
  styleAffinity: string[];
};

export const BRAND_KNOWLEDGE: Record<string, BrandKnowledge> = {
  Nike: { tier: 1, prestigeWeight: 45, affiliatePriority: 78, styleAffinity: ['streetwear', 'y2k', 'sport'] },
  Adidas: { tier: 1, prestigeWeight: 44, affiliatePriority: 76, styleAffinity: ['streetwear', 'casual', 'sport'] },
  Uniqlo: { tier: 1, prestigeWeight: 40, affiliatePriority: 72, styleAffinity: ['minimal', 'smart casual'] },
  COS: { tier: 1, prestigeWeight: 48, affiliatePriority: 69, styleAffinity: ['minimal', 'old money'] },
  Arket: { tier: 1, prestigeWeight: 46, affiliatePriority: 65, styleAffinity: ['minimal', 'smart casual'] },
  "Levi's": { tier: 1, prestigeWeight: 47, affiliatePriority: 74, styleAffinity: ['vintage', 'streetwear'] },
  'Acne Studios': { tier: 2, prestigeWeight: 64, affiliatePriority: 59, styleAffinity: ['minimal', 'avant-garde'] },
  'A.P.C.': { tier: 2, prestigeWeight: 61, affiliatePriority: 56, styleAffinity: ['minimal', 'old money'] },
  'Off-White': { tier: 2, prestigeWeight: 70, affiliatePriority: 64, styleAffinity: ['streetwear', 'luxury'] },
  Jacquemus: { tier: 2, prestigeWeight: 67, affiliatePriority: 58, styleAffinity: ['luxury', 'minimal'] },
  'Ami Paris': { tier: 2, prestigeWeight: 63, affiliatePriority: 55, styleAffinity: ['smart casual', 'old money'] },
  Represent: { tier: 2, prestigeWeight: 62, affiliatePriority: 63, styleAffinity: ['streetwear', 'goth'] },
  Balenciaga: { tier: 3, prestigeWeight: 91, affiliatePriority: 52, styleAffinity: ['luxury', 'streetwear'] },
  Prada: { tier: 3, prestigeWeight: 94, affiliatePriority: 50, styleAffinity: ['luxury', 'minimal'] },
  'Saint Laurent': { tier: 3, prestigeWeight: 90, affiliatePriority: 51, styleAffinity: ['luxury', 'goth'] },
  Dior: { tier: 3, prestigeWeight: 93, affiliatePriority: 49, styleAffinity: ['luxury', 'business'] },
  Gucci: { tier: 3, prestigeWeight: 92, affiliatePriority: 54, styleAffinity: ['luxury', 'vintage'] },
  'Bottega Veneta': { tier: 3, prestigeWeight: 89, affiliatePriority: 48, styleAffinity: ['luxury', 'minimal'] },
};

export const TIER_PRICE_DISTRIBUTION: Record<number, { min: number; median: number; max: number }> = {
  1: { min: 35, median: 140, max: 320 },
  2: { min: 140, median: 450, max: 1250 },
  3: { min: 380, median: 1450, max: 4800 },
};

export const COLOR_FAMILY: Record<string, string> = {
  black: 'neutral-dark',
  white: 'neutral-light',
  grey: 'neutral-mid',
  gray: 'neutral-mid',
  stone: 'neutral-mid',
  beige: 'earth',
  cream: 'earth',
  brown: 'earth',
  olive: 'earth',
  khaki: 'earth',
  navy: 'cool-dark',
  blue: 'cool',
  red: 'warm',
  green: 'cool',
  purple: 'cool',
  yellow: 'warm',
  orange: 'warm',
  pink: 'warm',
  silver: 'metallic',
  charcoal: 'neutral-dark',
  oxblood: 'warm-dark',
};

export const COLOR_COMPATIBILITY_MATRIX: Record<string, Record<string, number>> = {
  'neutral-dark': {
    'neutral-dark': 95,
    'neutral-mid': 93,
    'neutral-light': 96,
    earth: 88,
    cool: 86,
    'cool-dark': 90,
    warm: 80,
    metallic: 82,
    'warm-dark': 86,
  },
  'neutral-mid': {
    'neutral-dark': 93,
    'neutral-mid': 92,
    'neutral-light': 94,
    earth: 86,
    cool: 84,
    'cool-dark': 86,
    warm: 79,
    metallic: 80,
    'warm-dark': 82,
  },
  'neutral-light': {
    'neutral-dark': 96,
    'neutral-mid': 94,
    'neutral-light': 91,
    earth: 89,
    cool: 84,
    'cool-dark': 87,
    warm: 82,
    metallic: 78,
    'warm-dark': 84,
  },
  earth: {
    'neutral-dark': 88,
    'neutral-mid': 86,
    'neutral-light': 89,
    earth: 90,
    cool: 75,
    'cool-dark': 80,
    warm: 85,
    metallic: 70,
    'warm-dark': 88,
  },
  cool: {
    'neutral-dark': 86,
    'neutral-mid': 84,
    'neutral-light': 84,
    earth: 75,
    cool: 88,
    'cool-dark': 91,
    warm: 74,
    metallic: 78,
    'warm-dark': 70,
  },
  'cool-dark': {
    'neutral-dark': 90,
    'neutral-mid': 86,
    'neutral-light': 87,
    earth: 80,
    cool: 91,
    'cool-dark': 89,
    warm: 76,
    metallic: 80,
    'warm-dark': 75,
  },
  warm: {
    'neutral-dark': 80,
    'neutral-mid': 79,
    'neutral-light': 82,
    earth: 85,
    cool: 74,
    'cool-dark': 76,
    warm: 84,
    metallic: 76,
    'warm-dark': 85,
  },
  metallic: {
    'neutral-dark': 82,
    'neutral-mid': 80,
    'neutral-light': 78,
    earth: 70,
    cool: 78,
    'cool-dark': 80,
    warm: 76,
    metallic: 88,
    'warm-dark': 74,
  },
  'warm-dark': {
    'neutral-dark': 86,
    'neutral-mid': 82,
    'neutral-light': 84,
    earth: 88,
    cool: 70,
    'cool-dark': 75,
    warm: 85,
    metallic: 74,
    'warm-dark': 87,
  },
};

export const SEASON_RULES = {
  winter: {
    mustIncludeAny: ['hoodie', 'sweater', 'knit', 'coat', 'jacket', 'puffer', 'wool'],
    avoidAny: ['linen shorts', 'mesh tank'],
  },
  spring: {
    mustIncludeAny: ['jacket', 'overshirt', 'shirt', 'lightweight'],
    avoidAny: ['heavy puffer'],
  },
  summer: {
    mustIncludeAny: ['tee', 'shirt', 'lightweight', 'shorts'],
    avoidAny: ['wool', 'heavy', 'puffer', 'parka'],
  },
  autumn: {
    mustIncludeAny: ['jacket', 'hoodie', 'knit', 'trench', 'bomber'],
    avoidAny: ['mesh tank'],
  },
} as const;

export const LAYERING_CONSTRAINTS = {
  heavyTop: ['hoodie', 'sweater', 'knit', 'heavyweight', 'wool'],
  heavyOuterwear: ['coat', 'puffer', 'parka', 'wool'],
  invalidPairs: [
    ['heavy-top', 'heavy-outerwear'],
  ],
};

export const SILHOUETTE_COMPATIBILITY: Record<string, Record<string, number>> = {
  oversize: { oversize: 74, relaxed: 88, fitted: 92 },
  relaxed: { oversize: 88, relaxed: 90, fitted: 84 },
  fitted: { oversize: 92, relaxed: 84, fitted: 80 },
};

export const TOP_BOTTOM_RATIO_RULES = {
  idealMin: 0.72,
  idealMax: 1.38,
  strictMin: 0.55,
  strictMax: 1.7,
};

export const MINIMALIST_ACCESSORY_TARGET = 1;
export const MAXIMALIST_ACCESSORY_TARGET = 3;

