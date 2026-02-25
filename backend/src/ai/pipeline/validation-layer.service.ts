import { Injectable } from '@nestjs/common';
import { PipelineContext } from '../types/outfit.types';
import { FashionIntelligenceService } from './fashion-intelligence.service';
import { SelectedOutfit } from './outfit-composer.service';

@Injectable()
export class ValidationLayerService {
  constructor(private readonly fashionIntelligence: FashionIntelligenceService) {}

  validate(context: PipelineContext, outfit: SelectedOutfit) {
    const reasons: string[] = [];
    const total = outfit.totalPrice;

    if (total < context.budget.min || total > context.budget.max) {
      reasons.push('Budget constraints violated');
    }

    const allItems = [
      outfit.top,
      outfit.bottom,
      outfit.shoes,
      outfit.outerwear,
      ...outfit.accessories,
    ];

    const nonBranded = allItems.some((item) => !item.brand?.name);
    if (nonBranded) {
      reasons.push('Detected non-branded item');
    }

    const invalidTier = allItems.some((item) => !context.budget.tiers.includes(item.tier));
    if (invalidTier) {
      reasons.push('Tier out of allowed budget range');
    }

    if ((context.weather.isCold || context.weather.isRainy) && !outfit.outerwear) {
      reasons.push('Missing weather-compatible outerwear');
    }

    const coreItems = [outfit.top, outfit.bottom, outfit.shoes, outfit.outerwear];
    const coreStyleAlignedCount = coreItems.filter((item) =>
      item.styleTags.includes(context.input.style),
    ).length;
    const accessoriesStyleAlignedCount = outfit.accessories.filter((item) =>
      item.styleTags.includes(context.input.style),
    ).length;
    const minCoreStyleAligned = 4;
    if (coreStyleAlignedCount < minCoreStyleAligned) {
      reasons.push('Style coherence too low');
    }

    if (outfit.accessories.length > 0 && accessoriesStyleAlignedCount === 0) {
      reasons.push('Accessory does not match selected style');
    }

    const colorHarmony = this.fashionIntelligence.evaluateColorHarmony([
      outfit.top.name,
      outfit.bottom.name,
      outfit.shoes.name,
      outfit.outerwear.name,
    ]);
    if (colorHarmony.score < 68) {
      reasons.push('Color harmony mismatch');
    }

    if (!this.hasValidLayering(outfit)) {
      reasons.push('Layering validation failed');
    }

    if (!this.hasSilhouetteBalance(outfit)) {
      reasons.push('Silhouette balance too weak');
    }

    if (!this.meetsSeasonalConstraints(context, outfit)) {
      reasons.push('Seasonal constraints violated');
    }

    const styleMismatch = this.hasAestheticMismatch(context, outfit);
    if (styleMismatch) {
      reasons.push('Mismatched aesthetics');
    }

    if ((context.weather.isHot || context.weather.isCold || context.weather.isRainy) && !this.isWeatherCompatible(context, outfit)) {
      reasons.push('Weather incompatibility detected');
    }

    return {
      isValid: reasons.length === 0,
      reasons,
    };
  }

  private hasValidLayering(outfit: SelectedOutfit) {
    return this.fashionIntelligence.validateLayering(outfit.top.name, outfit.outerwear.name);
  }

  private hasSilhouetteBalance(outfit: SelectedOutfit) {
    const score = this.fashionIntelligence.scoreSilhouetteBalance(
      outfit.top.name,
      outfit.bottom.name,
      outfit.outerwear.name,
    );
    return score >= 70;
  }

  private meetsSeasonalConstraints(context: PipelineContext, outfit: SelectedOutfit) {
    return this.fashionIntelligence.validateSeasonality(
      [outfit.top.name, outfit.bottom.name, outfit.shoes.name, outfit.outerwear.name],
      {
        isCold: context.weather.isCold,
        isHot: context.weather.isHot,
      },
    );
  }

  private hasAestheticMismatch(context: PipelineContext, outfit: SelectedOutfit) {
    const style = context.input.style.toLowerCase();
    const core = [outfit.top, outfit.bottom, outfit.shoes, outfit.outerwear];
    const styleAligned = core.filter((piece) => piece.styleTags.includes(style)).length;
    return styleAligned < 3;
  }

  private isWeatherCompatible(context: PipelineContext, outfit: SelectedOutfit) {
    const outer = outfit.outerwear.name.toLowerCase();
    const shoes = outfit.shoes.name.toLowerCase();

    if (context.weather.isCold && !/(coat|jacket|puffer|parka|hoodie|wool)/.test(outer)) {
      return false;
    }
    if (context.weather.isHot && /(wool|puffer|parka|heavy)/.test(outer)) {
      return false;
    }
    if (context.weather.isRainy && /(suede|canvas)/.test(shoes)) {
      return false;
    }
    return true;
  }
}
