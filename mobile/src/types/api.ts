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
  budgetMode?: 'cheaper' | 'premium' | 'custom';
  budgetMin?: number;
  budgetMax?: number;
  fitPreference?: 'oversize' | 'fitted' | 'relaxed';
  luxuryOnly?: boolean;
  premiumOnly?: boolean;
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
  top_bottom_ratio: number;
  color_harmony: number;
  trend_influence: number;
  visual_coherence: number;
  image_harmony: number;
  aesthetic_density: number;
  minimalist_maximalist_fit: number;
  conversion_likelihood: number;
  margin_score: number;
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

export type SavedOutfitRecord = {
  id: string;
  channel: 'WEB' | 'MOBILE' | 'TELEGRAM';
  outfitJson: OutfitResult;
  createdAt: string;
};
