import { Injectable } from '@nestjs/common';
import {
  BRAND_KNOWLEDGE,
  COLOR_COMPATIBILITY_MATRIX,
  COLOR_FAMILY,
  LAYERING_CONSTRAINTS,
  MAXIMALIST_ACCESSORY_TARGET,
  MINIMALIST_ACCESSORY_TARGET,
  SEASON_RULES,
  SILHOUETTE_COMPATIBILITY,
  TIER_PRICE_DISTRIBUTION,
  TOP_BOTTOM_RATIO_RULES,
} from '../constants/fashion-knowledge';

type PieceLike = {
  brand?: string;
  tier?: number;
  price?: number;
  item: string;
  styleTags?: string[];
};

type FitType = 'oversize' | 'fitted' | 'relaxed';
type Season = 'winter' | 'spring' | 'summer' | 'autumn';

@Injectable()
export class FashionIntelligenceService {
  getBrandMetadata(brandName: string) {
    return (
      BRAND_KNOWLEDGE[brandName] ?? {
        tier: 1,
        prestigeWeight: 42,
        affiliatePriority: 60,
        styleAffinity: [],
      }
    );
  }

  scoreTopBottomRatio(topPrice: number, bottomPrice: number) {
    const ratio = topPrice / Math.max(1, bottomPrice);
    if (ratio < TOP_BOTTOM_RATIO_RULES.strictMin || ratio > TOP_BOTTOM_RATIO_RULES.strictMax) {
      return 25;
    }
    if (ratio >= TOP_BOTTOM_RATIO_RULES.idealMin && ratio <= TOP_BOTTOM_RATIO_RULES.idealMax) {
      return 95;
    }

    const idealCenter = (TOP_BOTTOM_RATIO_RULES.idealMin + TOP_BOTTOM_RATIO_RULES.idealMax) / 2;
    const distance = Math.abs(ratio - idealCenter);
    return this.clampToPercent(Math.round(92 - distance * 110));
  }

  scoreSilhouetteBalance(topName: string, bottomName: string, outerwearName: string) {
    const topFit = this.inferFit(topName);
    const bottomFit = this.inferFit(bottomName);
    const outerFit = this.inferFit(outerwearName);

    const topBottom = SILHOUETTE_COMPATIBILITY[topFit][bottomFit];
    const topOuter = SILHOUETTE_COMPATIBILITY[topFit][outerFit];
    const bottomOuter = SILHOUETTE_COMPATIBILITY[bottomFit][outerFit];
    const avg = Math.round((topBottom + topOuter + bottomOuter) / 3);

    return this.clampToPercent(avg);
  }

  evaluateColorHarmony(itemNames: string[]) {
    const text = itemNames.join(' ').toLowerCase();
    const colors = [...new Set(Object.keys(COLOR_FAMILY).filter((token) => text.includes(token)))];
    if (!colors.length) {
      return { score: 72, scheme: 'mixed' as const };
    }

    const families = colors.map((color) => COLOR_FAMILY[color]).filter(Boolean);
    const uniqueFamilies = [...new Set(families)];
    if (uniqueFamilies.length === 1) {
      return { score: 95, scheme: 'monochrome' as const };
    }

    let pairScoreTotal = 0;
    let pairCount = 0;
    for (let i = 0; i < uniqueFamilies.length; i += 1) {
      for (let j = i + 1; j < uniqueFamilies.length; j += 1) {
        const left = uniqueFamilies[i];
        const right = uniqueFamilies[j];
        pairScoreTotal += COLOR_COMPATIBILITY_MATRIX[left]?.[right] ?? 70;
        pairCount += 1;
      }
    }

    const avg = pairCount ? Math.round(pairScoreTotal / pairCount) : 75;
    const scheme =
      uniqueFamilies.every((family) => family.startsWith('neutral'))
        ? 'neutral'
        : uniqueFamilies.length <= 2
          ? 'analogous'
          : 'complementary';

    return {
      score: this.clampToPercent(avg - Math.max(0, uniqueFamilies.length - 3) * 7),
      scheme,
    };
  }

  validateLayering(topName: string, outerwearName: string) {
    const top = topName.toLowerCase();
    const outer = outerwearName.toLowerCase();
    const topHeavy = LAYERING_CONSTRAINTS.heavyTop.some((token) => top.includes(token));
    const outerHeavy = LAYERING_CONSTRAINTS.heavyOuterwear.some((token) => outer.includes(token));
    return !(topHeavy && outerHeavy);
  }

  validateSeasonality(itemNames: string[], weather: { isHot: boolean; isCold: boolean }) {
    const season = this.currentSeason();
    const rules = SEASON_RULES[season];
    const text = itemNames.join(' ').toLowerCase();
    const hasRequired = rules.mustIncludeAny.some((token) => text.includes(token));
    const hasForbidden = rules.avoidAny.some((token) => text.includes(token));

    if (weather.isHot && /(wool|heavy|puffer|parka)/.test(text)) {
      return false;
    }

    if (weather.isCold && !/(hoodie|sweater|knit|coat|jacket|wool|puffer)/.test(text)) {
      return false;
    }

    if (hasForbidden) {
      return false;
    }

    return hasRequired;
  }

  scoreBudgetCoherence(totalPrice: number, budgetMin: number, budgetMax: number, preference: 'cheaper' | 'premium' | 'balanced') {
    const span = Math.max(1, budgetMax - budgetMin);
    const inRange = totalPrice >= budgetMin && totalPrice <= budgetMax;
    if (!inRange) {
      const overflow =
        totalPrice < budgetMin ? budgetMin - totalPrice : totalPrice - budgetMax;
      return this.clampToPercent(Math.round(70 - (overflow / span) * 100));
    }

    const target =
      preference === 'cheaper' ? budgetMin + span * 0.35 :
      preference === 'premium' ? budgetMin + span * 0.82 :
      budgetMin + span * 0.58;
    const distance = Math.abs(totalPrice - target);
    return this.clampToPercent(Math.round(100 - (distance / span) * 100));
  }

  scoreBrandPrestige(pieces: PieceLike[], dynamicBrandWeights: Record<string, number>, monetizationBoost = 0) {
    if (!pieces.length) {
      return 40;
    }

    const score = pieces.reduce((sum, piece) => {
      const brand = piece.brand ?? '';
      const metadata = this.getBrandMetadata(brand);
      const trendWeight = dynamicBrandWeights[brand] ?? 1;
      const tierRange = TIER_PRICE_DISTRIBUTION[piece.tier ?? metadata.tier] ?? TIER_PRICE_DISTRIBUTION[1];
      const price = piece.price ?? tierRange.median;
      const tierConsistency =
        price >= tierRange.min && price <= tierRange.max ? 100 : 78;
      const composite =
        metadata.prestigeWeight * 0.55 +
        metadata.affiliatePriority * 0.15 +
        trendWeight * 22 +
        tierConsistency * 0.08;
      return sum + composite;
    }, 0) / pieces.length;

    return this.clampToPercent(Math.round(score + monetizationBoost * 8));
  }

  scoreVisualModel(input: {
    itemNames: string[];
    accessoryCount: number;
    colorHarmonyScore: number;
    silhouetteScore: number;
  }) {
    const aestheticsKeywords = /(layered|tailored|oversized|boxy|structured|textured|washed|distressed|minimal|statement)/gi;
    const keywordMatches = input.itemNames.join(' ').match(aestheticsKeywords)?.length ?? 0;
    const aestheticDensity = this.clampToPercent(Math.round(35 + keywordMatches * 9));

    const visualCoherence = this.clampToPercent(
      Math.round(input.colorHarmonyScore * 0.45 + input.silhouetteScore * 0.4 + aestheticDensity * 0.15),
    );

    const imageHarmony = this.clampToPercent(
      Math.round(input.colorHarmonyScore * 0.6 + visualCoherence * 0.4),
    );

    const minimalistDistance = Math.abs(input.accessoryCount - MINIMALIST_ACCESSORY_TARGET);
    const maximalistDistance = Math.abs(input.accessoryCount - MAXIMALIST_ACCESSORY_TARGET);
    const minimalistVsMaximalistFit = this.clampToPercent(
      100 - Math.min(minimalistDistance, maximalistDistance) * 28,
    );

    return {
      visualCoherence,
      imageHarmony,
      aestheticDensity,
      minimalistVsMaximalistFit,
    };
  }

  scoreTrendInfluence(styleTrendScore: number, seasonalShiftScore: number) {
    return this.clampToPercent(Math.round(styleTrendScore * 0.7 + seasonalShiftScore * 0.3));
  }

  scoreConversionLikelihood(input: {
    budgetCoherence: number;
    personalizationConfidence: number;
    trendInfluence: number;
    affiliatePriorityAvg: number;
  }) {
    return this.clampToPercent(
      Math.round(
        input.budgetCoherence * 0.3 +
          input.personalizationConfidence * 0.3 +
          input.trendInfluence * 0.2 +
          input.affiliatePriorityAvg * 0.2,
      ),
    );
  }

  scoreMarginPotential(pieces: PieceLike[], highMarginBoost = 0) {
    if (!pieces.length) {
      return 20;
    }

    const raw = pieces.reduce((sum, piece) => {
      const brandMetadata = this.getBrandMetadata(piece.brand ?? '');
      const tier = piece.tier ?? brandMetadata.tier;
      const base = tier === 3 ? 92 : tier === 2 ? 72 : 48;
      const affiliate = brandMetadata.affiliatePriority;
      return sum + base * 0.65 + affiliate * 0.35;
    }, 0) / pieces.length;

    return this.clampToPercent(Math.round(raw + highMarginBoost * 16));
  }

  averageAffiliatePriority(brands: string[]) {
    if (!brands.length) {
      return 60;
    }
    const avg =
      brands.reduce((sum, brand) => sum + this.getBrandMetadata(brand).affiliatePriority, 0) /
      brands.length;
    return this.clampToPercent(Math.round(avg));
  }

  private inferFit(itemName: string): FitType {
    const normalized = itemName.toLowerCase();
    if (/(oversize|baggy|wide)/.test(normalized)) {
      return 'oversize';
    }
    if (/(slim|skinny|tailored|fitted)/.test(normalized)) {
      return 'fitted';
    }
    return 'relaxed';
  }

  private currentSeason(): Season {
    const month = new Date().getMonth() + 1;
    if (month === 12 || month <= 2) {
      return 'winter';
    }
    if (month >= 3 && month <= 5) {
      return 'spring';
    }
    if (month >= 6 && month <= 8) {
      return 'summer';
    }
    return 'autumn';
  }

  private clampToPercent(value: number) {
    if (value < 0) {
      return 0;
    }
    if (value > 100) {
      return 100;
    }
    return Math.round(value);
  }
}

