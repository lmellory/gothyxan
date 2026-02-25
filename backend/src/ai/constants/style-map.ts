type StyleProfile = {
  canonical: string;
  aliases: string[];
  preferredTiers: number[];
  paletteHint: string;
};

export const STYLE_PROFILES: StyleProfile[] = [
  {
    canonical: 'streetwear',
    aliases: ['streetwear', 'urban', 'oversize', 'hype'],
    preferredTiers: [1, 2, 3],
    paletteHint: 'neutrals + accent color',
  },
  {
    canonical: 'minimal',
    aliases: ['minimal', 'minimalist', 'clean'],
    preferredTiers: [1, 2, 3],
    paletteHint: 'black, white, gray, beige',
  },
  {
    canonical: 'old money',
    aliases: ['old money', 'quiet luxury', 'classic luxury'],
    preferredTiers: [1, 2, 3],
    paletteHint: 'navy, cream, camel, olive',
  },
  {
    canonical: 'luxury',
    aliases: ['luxury', 'designer', 'premium luxury'],
    preferredTiers: [2, 3],
    paletteHint: 'monochrome with rich textures',
  },
  {
    canonical: 'techwear',
    aliases: ['techwear', 'technical', 'gorpcore'],
    preferredTiers: [1, 2, 3],
    paletteHint: 'graphite, black, utility tones',
  },
  {
    canonical: 'business',
    aliases: ['business', 'office', 'formal'],
    preferredTiers: [1, 2, 3],
    paletteHint: 'navy, gray, black',
  },
  {
    canonical: 'vintage',
    aliases: ['vintage', 'retro'],
    preferredTiers: [1, 2, 3],
    paletteHint: 'washed denim, brown, muted tones',
  },
  {
    canonical: 'y2k',
    aliases: ['y2k', '2000s'],
    preferredTiers: [1, 2, 3],
    paletteHint: 'silver, black, bold contrast',
  },
  {
    canonical: 'smart casual',
    aliases: ['smart casual', 'smart-casual'],
    preferredTiers: [1, 2, 3],
    paletteHint: 'earth tones + clean neutrals',
  },
  {
    canonical: 'goth',
    aliases: ['goth', 'dark', 'gothic'],
    preferredTiers: [2, 3],
    paletteHint: 'black, charcoal, oxblood',
  },
  {
    canonical: 'avant-garde',
    aliases: ['avant-garde', 'avantgarde', 'experimental'],
    preferredTiers: [2, 3],
    paletteHint: 'mono tones + sculptural accents',
  },
];

export const normalizeStyleName = (input: string) => {
  const normalized = input.trim().toLowerCase();
  const found = STYLE_PROFILES.find((profile) => profile.aliases.includes(normalized));
  return found ?? STYLE_PROFILES.find((profile) => profile.canonical === 'minimal')!;
};
