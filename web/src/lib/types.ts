export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
};

export type UserProfile = {
  id: string;
  email: string;
  name?: string | null;
  role: 'USER' | 'ADMIN';
  isEmailVerified: boolean;
};

export type OutfitInput = {
  style: string;
  occasion?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  budgetMode?: 'cheaper' | 'premium' | 'custom';
  budgetMin?: number;
  budgetMax?: number;
  fitPreference?: 'oversize' | 'fitted' | 'relaxed';
  luxuryOnly?: boolean;
};

export type OutfitPiece = {
  brand: string;
  item: string;
  category: string;
  price: number;
  tier: number;
  reference_link: string;
  affiliate_link?: string;
  image: {
    thumbnail: string;
    medium: string;
    high_res: string;
    source: 'validated' | 'placeholder';
    validated: boolean;
  };
  image_url: string;
  styleTags: string[];
};

export type OutfitScores = {
  budget_efficiency: number;
  style_coherence: number;
  weather_compatibility: number;
  brand_prestige: number;
  personalization_confidence: number;
  overall: number;
};

export type OutfitResult = {
  top: OutfitPiece;
  bottom: OutfitPiece;
  shoes: OutfitPiece;
  outerwear: OutfitPiece;
  accessories: OutfitPiece[];
  total_price: number;
  style: string;
  weather_context: string;
  budget_range: string;
  explanation: string;
  scores?: OutfitScores;
};

export type AdminAnalytics = {
  usersTotal: number;
  verifiedUsers: number;
  generationsTotal: number;
  activeBrands: number;
  avgOutfitPrice: number;
  topStyles: { style: string; _count: { style: number } }[];
  generationsLast24h?: number;
  generationsLast7d?: number;
  activeUsers7d?: number;
  budgetModeBreakdown?: { budgetMode: 'CHEAPER' | 'PREMIUM' | 'CUSTOM'; _count: { budgetMode: number } }[];
  channelBreakdown?: { channel: 'WEB' | 'MOBILE' | 'TELEGRAM'; _count: { channel: number } }[];
  trendingStyles7d?: { style: string; _count: { style: number } }[];
  topBrands7d?: { brand: string; count: number }[];
  imageSuccessRate?: number;
};

export type BrandItem = {
  id: string;
  name: string;
  category: string;
  estimatedPrice: number;
  tier: number;
  styleTags: string[];
  occasionTags: string[];
  referenceLink: string;
  isActive: boolean;
};

export type BrandRecord = {
  id: string;
  name: string;
  tier: number;
  isActive: boolean;
  categories: string[];
  styleTags: string[];
  items: BrandItem[];
};
