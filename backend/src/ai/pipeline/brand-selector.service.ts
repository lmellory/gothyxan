import { Injectable } from '@nestjs/common';
import { Brand, BrandItem } from '@prisma/client';
import { BrandsService } from '../../brands/brands.service';
import { PipelineContext } from '../types/outfit.types';
import { FashionIntelligenceService } from './fashion-intelligence.service';

export type BrandItemWithBrand = BrandItem & { brand: Brand };
export type CandidateMap = {
  top: BrandItemWithBrand[];
  bottom: BrandItemWithBrand[];
  shoes: BrandItemWithBrand[];
  outerwear: BrandItemWithBrand[];
  accessories: BrandItemWithBrand[];
};

@Injectable()
export class BrandSelectorService {
  constructor(
    private readonly brandsService: BrandsService,
    private readonly fashionIntelligence: FashionIntelligenceService,
  ) {}

  async select(context: PipelineContext): Promise<CandidateMap> {
    const { minPrice, maxPrice } = this.itemBudgetWindow(context.budget.min, context.budget.max);
    const baseFilter = {
      style: context.input.style,
      occasion: context.input.occasion,
      minPrice,
      maxPrice,
      tiers: context.budget.tiers,
    };

    const top = await this.withFallback('top', baseFilter);
    const bottom = await this.withFallback('bottom', baseFilter);
    const shoes = await this.withFallback('shoes', baseFilter);
    const outerwear = await this.withFallback('outerwear', baseFilter);
    const accessories = await this.withFallback('accessory', baseFilter);

    return {
      top: this.rankCandidates(top, context),
      bottom: this.rankCandidates(bottom, context),
      shoes: this.rankCandidates(shoes, context),
      outerwear: this.rankCandidates(outerwear, context),
      accessories: this.rankCandidates(accessories, context),
    };
  }

  private async withFallback(
    category: string,
    baseFilter: {
      style: string;
      occasion: string;
      minPrice: number;
      maxPrice: number;
      tiers: number[];
    },
  ) {
    const relaxedMinPrice = Math.max(10, Math.floor(baseFilter.minPrice * 0.5));
    const relaxedMaxPrice = Math.max(baseFilter.maxPrice, Math.ceil(baseFilter.maxPrice * 1.25));

    const strict = await this.brandsService.findItemsForOutfit({
      ...baseFilter,
      category,
    });

    if (strict.length) {
      return strict;
    }

    const withoutOccasion = await this.brandsService.findItemsForOutfit({
      style: baseFilter.style,
      category,
      minPrice: baseFilter.minPrice,
      maxPrice: baseFilter.maxPrice,
      tiers: baseFilter.tiers,
    });

    if (withoutOccasion.length) {
      return withoutOccasion;
    }

    const relaxedTier = await this.brandsService.findItemsForOutfit({
      category,
      style: baseFilter.style,
      minPrice: relaxedMinPrice,
      maxPrice: relaxedMaxPrice,
      tiers: [1, 2, 3],
    });

    if (relaxedTier.length) {
      return relaxedTier;
    }

    return [];
  }

  private itemBudgetWindow(totalMin: number, totalMax: number) {
    const mandatoryPieces = 4;
    const minPrice = Math.max(10, Math.floor(totalMin / mandatoryPieces));
    const maxPrice = Math.max(minPrice, Math.floor(totalMax / mandatoryPieces));
    return {
      minPrice,
      maxPrice,
    };
  }

  private rankCandidates(items: BrandItemWithBrand[], context: PipelineContext) {
    if (!items.length) {
      return items;
    }

    const trendBrandWeights = context.trend?.dynamicBrandWeights ?? {};
    const style = context.input.style.toLowerCase();
    const affinity = context.personalization?.brandAffinity ?? {};
    const favoriteBrands = new Set(
      (context.personalization?.favoriteBrands ?? []).map((entry) => entry.toLowerCase()),
    );

    return [...items].sort((left, right) => {
      const leftScore = this.rankScore(left, {
        style,
        trendBrandWeights,
        affinity,
        favoriteBrands,
        context,
      });
      const rightScore = this.rankScore(right, {
        style,
        trendBrandWeights,
        affinity,
        favoriteBrands,
        context,
      });
      return rightScore - leftScore;
    });
  }

  private rankScore(
    item: BrandItemWithBrand,
    input: {
      style: string;
      trendBrandWeights: Record<string, number>;
      affinity: Record<string, number>;
      favoriteBrands: Set<string>;
      context: PipelineContext;
    },
  ) {
    const metadata = this.fashionIntelligence.getBrandMetadata(item.brand.name);
    const styleMatch = item.styleTags.includes(input.style) ? 1 : 0;
    const trendWeight = input.trendBrandWeights[item.brand.name] ?? 0.5;
    const affinityWeight = input.affinity[item.brand.name] ?? 0;
    const favoriteBoost = input.favoriteBrands.has(item.brand.name.toLowerCase()) ? 0.22 : 0;
    const prestigeWeight = metadata.prestigeWeight / 100;
    const affiliateWeight = metadata.affiliatePriority / 100;
    const luxuryBoost = input.context.monetization?.luxuryBias && item.tier >= 2 ? 0.2 : 0;
    const premiumOnlyBoost = input.context.monetization?.premiumOnly && item.tier >= 2 ? 0.15 : 0;
    const highMarginBoost = (input.context.monetization?.highMarginBoost ?? 0) * (item.tier >= 2 ? 0.16 : 0.06);
    const trendInfluence = (input.context.trend?.trendInfluenceCoefficient ?? 60) / 100;

    const priceCenter = (input.context.budget.min + input.context.budget.max) / 2;
    const priceDistance = Math.abs(item.estimatedPrice - priceCenter) / Math.max(1, priceCenter);
    const budgetFit = Math.max(0, 1 - priceDistance);

    return (
      styleMatch * 1.2 +
      trendWeight * 0.95 * trendInfluence +
      affinityWeight * 0.75 +
      favoriteBoost +
      prestigeWeight * 0.45 +
      affiliateWeight * 0.25 +
      budgetFit * 0.7 +
      luxuryBoost +
      premiumOnlyBoost +
      highMarginBoost
    );
  }
}
