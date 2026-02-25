import { BudgetModeInput } from '../../common/enums/budget-mode.enum';
import { WeatherContext } from '../../weather/weather.types';

export type BrandedPiece = {
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

export type AdaptivePersonalizationInput = {
  adaptiveIndex: number;
  generationCount: number;
  avgRating: number;
  saveRate: number;
  regenerateRate: number;
  favoriteBrands: string[];
  preferredStyles: string[];
  brandAffinity: Record<string, number>;
  budgetSensitivity: number;
  styleBiasScore: number;
  lastStyle?: string | null;
};

export type TrendContextSnapshot = {
  trendingStyles: string[];
  highConfidenceStyles: string[];
  styleTrendScore: number;
  seasonalShiftScore: number;
  trendInfluenceCoefficient: number;
  dynamicBrandWeights: Record<string, number>;
};

export type MonetizationSignals = {
  affiliateAware: boolean;
  luxuryBias: boolean;
  premiumOnly: boolean;
  highMarginBoost: number;
  conversionBoost: number;
};

export type OutfitResult = {
  top: BrandedPiece;
  bottom: BrandedPiece;
  shoes: BrandedPiece;
  outerwear: BrandedPiece;
  accessories: BrandedPiece[];
  total_price: number;
  style: string;
  weather_context: string;
  budget_range: string;
  explanation: string;
  scores?: OutfitScores;
};

export type BudgetDecision = {
  mode: BudgetModeInput;
  min: number;
  max: number;
  tiers: number[];
  budgetLabel: string;
  preference: 'cheaper' | 'premium' | 'balanced';
};

export type NormalizedInput = {
  styleInput: string;
  style: string;
  occasion: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  budgetMode: BudgetModeInput;
  budgetMin?: number;
  budgetMax?: number;
  fitPreference?: 'oversize' | 'fitted' | 'relaxed';
  luxuryOnly?: boolean;
  premiumOnly?: boolean;
};

export type PipelineContext = {
  userId?: string;
  personalization?: AdaptivePersonalizationInput;
  trend?: TrendContextSnapshot;
  monetization?: MonetizationSignals;
  input: NormalizedInput;
  weather: WeatherContext;
  budget: BudgetDecision;
  prompt: string;
};
