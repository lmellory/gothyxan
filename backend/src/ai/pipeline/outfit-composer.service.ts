import { BadRequestException, Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import { BudgetModeInput } from '../../common/enums/budget-mode.enum';
import { BudgetDecision, PipelineContext } from '../types/outfit.types';
import { BrandItemWithBrand } from './brand-selector.service';
import { FashionIntelligenceService } from './fashion-intelligence.service';
import { WeatherAdaptedPlan } from './weather-adapter.service';

export type SelectedOutfit = {
  top: BrandItemWithBrand;
  bottom: BrandItemWithBrand;
  shoes: BrandItemWithBrand;
  outerwear: BrandItemWithBrand;
  accessories: BrandItemWithBrand[];
  totalPrice: number;
};

@Injectable()
export class OutfitComposerService {
  private readonly lastSignatureByKey = new Map<string, string>();

  constructor(private readonly fashionIntelligence: FashionIntelligenceService) {}

  compose(context: PipelineContext, adaptedPlan: WeatherAdaptedPlan): SelectedOutfit {
    const preferences = this.preferenceFallbackOrder(context.budget.preference);
    const accessoryCounts = Array.from(new Set([adaptedPlan.accessoryCount, 1, 0]));
    const routeKey = this.contextKey(context);
    const previousSignature = this.lastSignatureByKey.get(routeKey);
    const attemptLimit = 24;

    let best: SelectedOutfit | null = null;
    let bestPenalty = Number.POSITIVE_INFINITY;

    for (const preference of preferences) {
      for (const accessoryCount of accessoryCounts) {
        for (let attempt = 0; attempt < attemptLimit; attempt += 1) {
          const candidate = this.composeOnce(context, adaptedPlan, preference, accessoryCount);
          const signature = this.signature(candidate);
          const isRepeat = signature === previousSignature;
          const penalty = this.budgetPenalty(candidate.totalPrice, context.budget.min, context.budget.max);
          const stylePenalty = this.stylePenalty(context, candidate);

          if (!isRepeat && penalty === 0 && stylePenalty === 0) {
            this.lastSignatureByKey.set(routeKey, signature);
            return candidate;
          }

          const candidateScore = penalty + stylePenalty + (isRepeat ? 5000 : 0);
          if (candidateScore < bestPenalty) {
            best = candidate;
            bestPenalty = candidateScore;
          }
        }
      }
    }

    if (!best) {
      throw new BadRequestException('No branded outfit combinations available');
    }

    this.lastSignatureByKey.set(routeKey, this.signature(best));
    return best;
  }

  composeDeterministic(context: PipelineContext, adaptedPlan: WeatherAdaptedPlan): SelectedOutfit {
    const top = this.pickDeterministic(adaptedPlan.candidates.top, context, 'top');
    const bottom = this.pickDeterministic(adaptedPlan.candidates.bottom, context, 'bottom');
    const shoes = this.pickDeterministic(adaptedPlan.candidates.shoes, context, 'shoes');
    const outerwear = this.pickDeterministic(adaptedPlan.candidates.outerwear, context, 'outerwear');

    const accessoriesPool = [...adaptedPlan.candidates.accessories]
      .filter((item) => item.styleTags.includes(context.input.style))
      .sort((a, b) => a.estimatedPrice - b.estimatedPrice);
    const accessories: BrandItemWithBrand[] = accessoriesPool.slice(0, Math.min(1, accessoriesPool.length));

    const totalPrice = this.calculateTotal(top, bottom, shoes, outerwear, accessories);
    return {
      top,
      bottom,
      shoes,
      outerwear,
      accessories,
      totalPrice,
    };
  }

  private composeOnce(
    context: PipelineContext,
    adaptedPlan: WeatherAdaptedPlan,
    preference: 'cheaper' | 'premium' | 'balanced',
    accessoryCount: number,
  ): SelectedOutfit {
    const enforceBrandDiversity =
      preference !== 'cheaper' && context.budget.mode !== BudgetModeInput.CHEAPER;
    const usedBrandIds = enforceBrandDiversity ? new Set<string>() : undefined;
    const top = this.pickItem(
      adaptedPlan.candidates.top,
      context.budget,
      'top',
      preference,
      usedBrandIds,
      [],
      context.input.fitPreference,
    );
    const bottom = this.pickItem(
      adaptedPlan.candidates.bottom,
      context.budget,
      'bottom',
      preference,
      usedBrandIds,
      [top],
      context.input.fitPreference,
    );
    const shoes = this.pickItem(
      adaptedPlan.candidates.shoes,
      context.budget,
      'shoes',
      preference,
      usedBrandIds,
      [top, bottom],
      context.input.fitPreference,
    );
    const outerwear = this.pickItem(
      adaptedPlan.candidates.outerwear,
      context.budget,
      'outerwear',
      adaptedPlan.includeOuterwear ? preference : 'cheaper',
      usedBrandIds,
      [top, bottom, shoes],
      context.input.fitPreference,
    );
    const accessories = this.pickAccessories(
      adaptedPlan.candidates.accessories,
      accessoryCount,
      preference,
      usedBrandIds,
    );

    const totalPrice = this.calculateTotal(top, bottom, shoes, outerwear, accessories);

    return {
      top,
      bottom,
      shoes,
      outerwear,
      accessories,
      totalPrice,
    };
  }

  private pickItem(
    items: BrandItemWithBrand[],
    budget: BudgetDecision,
    category: string,
    forcePreference?: 'cheaper' | 'premium' | 'balanced',
    usedBrandIds?: Set<string>,
    pairedItems: BrandItemWithBrand[] = [],
    fitPreference?: 'oversize' | 'fitted' | 'relaxed',
  ) {
    if (!items.length) {
      throw new BadRequestException(`No branded items available for category: ${category}`);
    }

    const sorted = [...items].sort((a, b) => a.estimatedPrice - b.estimatedPrice);
    const preference = forcePreference ?? budget.preference;
    const ranked = this.rankItems(sorted, preference);
    const preferredPool = usedBrandIds
      ? ranked.filter((item) => !usedBrandIds.has(item.brandId))
      : ranked;
    const candidatePool = preferredPool.length ? preferredPool : ranked;
    const selectionWindow = Math.min(candidatePool.length, this.windowSizeForPreference(preference));
    const window = candidatePool.slice(0, selectionWindow);
    const compatibilityRanked = [...window].sort((a, b) => {
      const scoreA =
        this.compatibilityWithSelected(a, pairedItems) +
        this.fitPreferenceScore(a.name, fitPreference);
      const scoreB =
        this.compatibilityWithSelected(b, pairedItems) +
        this.fitPreferenceScore(b.name, fitPreference);
      return scoreB - scoreA;
    });
    const selected = this.pickRandom(compatibilityRanked.slice(0, Math.min(3, compatibilityRanked.length)));

    if (!selected) {
      throw new BadRequestException(`No branded items available for category: ${category}`);
    }

    if (usedBrandIds) {
      usedBrandIds.add(selected.brandId);
    }

    return selected;
  }

  private pickDeterministic(items: BrandItemWithBrand[], context: PipelineContext, category: string) {
    if (!items.length) {
      throw new BadRequestException(`No branded items available for category: ${category}`);
    }

    const styleMatched = items.filter((item) => item.styleTags.includes(context.input.style));
    const tierMatched = styleMatched.filter((item) => context.budget.tiers.includes(item.tier));
    const budgetMatched = tierMatched.filter(
      (item) => item.estimatedPrice >= Math.floor(context.budget.min / 4) && item.estimatedPrice <= Math.ceil(context.budget.max / 4),
    );
    const pool = budgetMatched.length
      ? budgetMatched
      : tierMatched.length
        ? tierMatched
        : styleMatched.length
          ? styleMatched
          : items;

    const fitPreference = context.input.fitPreference;
    const fitMatched =
      fitPreference
        ? pool.filter((item) => this.inferFit(item.name) === fitPreference)
        : [];
    const finalPool = fitMatched.length ? fitMatched : pool;

    return [...finalPool].sort((a, b) => a.estimatedPrice - b.estimatedPrice)[0];
  }

  private pickAccessories(
    items: BrandItemWithBrand[],
    count: number,
    preference: 'cheaper' | 'premium' | 'balanced',
    usedBrandIds?: Set<string>,
  ) {
    if (!items.length) {
      return [];
    }

    const sorted = [...items].sort((a, b) => a.estimatedPrice - b.estimatedPrice);
    const ranked = this.rankItems(sorted, preference);
    const shuffled = this.shuffle(ranked);
    const selected: BrandItemWithBrand[] = [];

    for (const item of shuffled) {
      if (selected.length >= count) {
        break;
      }
      if (usedBrandIds && usedBrandIds.has(item.brandId)) {
        continue;
      }
      selected.push(item);
      usedBrandIds?.add(item.brandId);
    }

    if (selected.length < count) {
      for (const item of shuffled) {
        if (selected.length >= count) {
          break;
        }
        if (selected.some((current) => current.id === item.id)) {
          continue;
        }
        selected.push(item);
        usedBrandIds?.add(item.brandId);
      }
    }

    return selected;
  }

  private rankItems(
    sorted: BrandItemWithBrand[],
    preference: 'cheaper' | 'premium' | 'balanced',
  ) {
    if (!sorted.length) {
      return [];
    }

    if (preference === 'cheaper') {
      return sorted;
    }

    if (preference === 'premium') {
      const pivot = Math.max(0, Math.floor(sorted.length * 0.75));
      return [...sorted.slice(pivot).reverse(), ...sorted.slice(0, pivot).reverse()];
    }

    const middle = Math.floor(sorted.length / 2);
    return [...sorted.slice(middle), ...sorted.slice(0, middle)];
  }

  private windowSizeForPreference(preference: 'cheaper' | 'premium' | 'balanced') {
    if (preference === 'cheaper') {
      return 4;
    }
    if (preference === 'premium') {
      return 5;
    }
    return 6;
  }

  private pickRandom<T>(items: T[]) {
    if (!items.length) {
      return null;
    }
    return items[randomInt(0, items.length)];
  }

  private shuffle<T>(items: T[]) {
    const next = [...items];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(0, index + 1);
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
    return next;
  }

  private calculateTotal(
    top: BrandItemWithBrand,
    bottom: BrandItemWithBrand,
    shoes: BrandItemWithBrand,
    outerwear: BrandItemWithBrand,
    accessories: BrandItemWithBrand[],
  ) {
    return (
      top.estimatedPrice +
      bottom.estimatedPrice +
      shoes.estimatedPrice +
      outerwear.estimatedPrice +
      accessories.reduce((sum, item) => sum + item.estimatedPrice, 0)
    );
  }

  private contextKey(context: PipelineContext) {
    return [
      context.input.style,
      context.input.occasion,
      context.budget.budgetLabel,
      context.weather.locationLabel,
      context.weather.temperatureC,
      context.weather.condition,
    ].join('|');
  }

  private signature(outfit: SelectedOutfit) {
    return [
      outfit.top.id,
      outfit.bottom.id,
      outfit.shoes.id,
      outfit.outerwear.id,
      ...outfit.accessories.map((item) => item.id),
    ].join('|');
  }

  private budgetPenalty(total: number, min: number, max: number) {
    if (total < min) {
      return min - total;
    }
    if (total > max) {
      return total - max;
    }
    return 0;
  }

  private preferenceFallbackOrder(preference: 'cheaper' | 'premium' | 'balanced') {
    if (preference === 'cheaper') {
      return ['cheaper', 'balanced', 'premium'] as const;
    }
    if (preference === 'premium') {
      return ['premium', 'balanced', 'cheaper'] as const;
    }
    return ['balanced', 'cheaper', 'premium'] as const;
  }

  private stylePenalty(context: PipelineContext, outfit: SelectedOutfit) {
    const coreItems = [outfit.top, outfit.bottom, outfit.shoes, outfit.outerwear];
    const style = context.input.style;
    const styleHits = coreItems.filter((item) => item.styleTags.includes(style)).length;
    const missingStylePenalty = Math.max(0, 4 - styleHits) * 80;
    const fitPenalty = this.fitPreferencePenalty(context.input.fitPreference, coreItems);
    const ratioScore = this.fashionIntelligence.scoreTopBottomRatio(
      outfit.top.estimatedPrice,
      outfit.bottom.estimatedPrice,
    );
    const ratioPenalty = Math.max(0, 90 - ratioScore) * 1.4;
    const silhouetteScore = this.fashionIntelligence.scoreSilhouetteBalance(
      outfit.top.name,
      outfit.bottom.name,
      outfit.outerwear.name,
    );
    const silhouettePenalty = Math.max(0, 88 - silhouetteScore) * 1.2;

    const sharedTags = coreItems.reduce<string[]>((shared, item, index) => {
      const tags = item.styleTags.map((tag) => tag.toLowerCase());
      if (index === 0) {
        return tags;
      }
      return shared.filter((tag) => tags.includes(tag));
    }, []);

    const weakSharedPenalty = sharedTags.length > 0 ? 0 : 40;
    return missingStylePenalty + weakSharedPenalty + fitPenalty + ratioPenalty + silhouettePenalty;
  }

  private compatibilityWithSelected(candidate: BrandItemWithBrand, selected: BrandItemWithBrand[]) {
    if (!selected.length) {
      return 100;
    }

    let score = 0;
    for (const item of selected) {
      const sharedTags = candidate.styleTags.filter((tag) => item.styleTags.includes(tag)).length;
      const tagScore = Math.min(40, sharedTags * 8);
      const tierScore = 30 - Math.min(20, Math.abs(candidate.tier - item.tier) * 10);
      const fitScore = this.fitCompatibility(candidate.name, item.name);
      score += tagScore + tierScore + fitScore;
    }
    return score / selected.length;
  }

  private fitCompatibility(aName: string, bName: string) {
    const fitA = this.inferFit(aName);
    const fitB = this.inferFit(bName);
    if (fitA === fitB && fitA === 'oversize') {
      return 20;
    }
    if (fitA === fitB) {
      return 14;
    }
    return 25;
  }

  private fitPreferenceScore(
    itemName: string,
    fitPreference?: 'oversize' | 'fitted' | 'relaxed',
  ) {
    if (!fitPreference) {
      return 0;
    }
    return this.inferFit(itemName) === fitPreference ? 18 : 0;
  }

  private fitPreferencePenalty(
    fitPreference: 'oversize' | 'fitted' | 'relaxed' | undefined,
    items: BrandItemWithBrand[],
  ) {
    if (!fitPreference) {
      return 0;
    }
    const matches = items.filter((item) => this.inferFit(item.name) === fitPreference).length;
    if (matches >= 2) {
      return 0;
    }
    if (matches === 1) {
      return 30;
    }
    return 70;
  }

  private inferFit(itemName: string) {
    const normalized = itemName.toLowerCase();
    if (/(oversize|baggy|wide)/.test(normalized)) {
      return 'oversize';
    }
    if (/(slim|skinny|tailored|fitted)/.test(normalized)) {
      return 'fitted';
    }
    return 'relaxed';
  }
}
