import { Injectable } from '@nestjs/common';
import { MediaUrlService } from '../../media/media-url.service';
import { OutfitResult, OutfitScores, PipelineContext } from '../types/outfit.types';
import { ProductCardResolverService } from '../services/product-card-resolver.service';
import { SelectedOutfit } from './outfit-composer.service';
import { FashionIntelligenceService } from './fashion-intelligence.service';

@Injectable()
export class ResponseFormatterService {
  constructor(
    private readonly productCardResolver: ProductCardResolverService,
    private readonly mediaUrlService: MediaUrlService,
    private readonly fashionIntelligence: FashionIntelligenceService,
  ) {}

  async format(context: PipelineContext, outfit: SelectedOutfit): Promise<OutfitResult> {
    const weatherContext = `${context.weather.locationLabel}, ${context.weather.temperatureC}C, ${context.weather.condition}`;
    const mapPiece = async (item: SelectedOutfit['top']) => {
      const resolved = await this.productCardResolver.resolve(item, context.input.style);
      const brand = resolved.resolvedBrand ?? item.brand.name;
      const metadata = this.fashionIntelligence.getBrandMetadata(brand);
      const tier = metadata.tier ?? item.tier;
      const resolvedPrice =
        typeof resolved.resolvedPrice === 'number' && resolved.resolvedPrice > 0
          ? resolved.resolvedPrice
          : null;
      const minAllowed = Math.floor(item.estimatedPrice * 0.45);
      const maxAllowed = Math.ceil(item.estimatedPrice * 1.25);
      const price =
        resolvedPrice !== null && resolvedPrice >= minAllowed && resolvedPrice <= maxAllowed
          ? resolvedPrice
          : item.estimatedPrice;
      const image = await this.mediaUrlService.buildMediaObject(resolved.imageUrl);

      return {
        brand,
        item: resolved.itemName,
        category: item.category,
        price,
        tier,
        reference_link: resolved.referenceLink,
        affiliate_link: this.buildAffiliateLink(resolved.referenceLink, {
          brand,
          item: resolved.itemName,
          userId: context.userId,
          price,
        }),
        image,
        image_url: image.medium,
        styleTags: item.styleTags,
      };
    };

    const [top, bottom, shoes, outerwear, accessories] = await Promise.all([
      mapPiece(outfit.top),
      mapPiece(outfit.bottom),
      mapPiece(outfit.shoes),
      mapPiece(outfit.outerwear),
      Promise.all(outfit.accessories.map(mapPiece)),
    ]);

    const totalPrice =
      top.price +
      bottom.price +
      shoes.price +
      outerwear.price +
      accessories.reduce((sum, item) => sum + item.price, 0);

    const response: OutfitResult = {
      top,
      bottom,
      shoes,
      outerwear,
      accessories,
      total_price: totalPrice,
      style: context.input.style,
      weather_context: weatherContext,
      budget_range: context.budget.budgetLabel,
      explanation: this.buildExplanation(context, weatherContext),
      scores: {
        top_bottom_ratio: 0,
        color_harmony: 0,
        trend_influence: 0,
        visual_coherence: 0,
        image_harmony: 0,
        aesthetic_density: 0,
        minimalist_maximalist_fit: 0,
        conversion_likelihood: 0,
        margin_score: 0,
        style_coherence: 0,
        budget_efficiency: 0,
        weather_compatibility: 0,
        brand_prestige: 0,
        personalization_confidence: 0,
        overall: 0,
      },
    };

    response.scores = this.calculateScores(context, response);
    return response;
  }

  private buildExplanation(context: PipelineContext, weatherContext: string) {
    const trendNote = context.trend?.trendInfluenceCoefficient
      ? ` Trend coeff ${context.trend.trendInfluenceCoefficient}/100 applied.`
      : '';
    const personalizationNote = context.personalization
      ? ` Adaptive index ${context.personalization.adaptiveIndex}/100 used.`
      : '';
    const monetizationNote = context.monetization?.luxuryBias
      ? ' Luxury bias mode active.'
      : context.monetization?.premiumOnly
        ? ' Premium-only generation active.'
        : '';

    return `Look for ${context.input.style} (${context.input.occasion}) under ${context.budget.budgetLabel}, adapted to ${weatherContext}.${trendNote}${personalizationNote}${monetizationNote}`.trim();
  }

  private buildAffiliateLink(
    referenceLink: string,
    meta: { brand: string; item: string; userId?: string; price: number },
  ) {
    const apiPublicBase = (process.env.API_PUBLIC_BASE_URL ?? 'http://localhost:4000').replace(/\/+$/, '');
    const url = new URL(`${apiPublicBase}/api/monetization/affiliate/redirect`);
    url.searchParams.set('target', referenceLink);
    url.searchParams.set('brand', meta.brand);
    url.searchParams.set('item', meta.item);
    url.searchParams.set('price', String(meta.price));
    if (meta.userId) {
      url.searchParams.set('uid', meta.userId);
    }
    return url.toString();
  }

  private calculateScores(context: PipelineContext, outfit: OutfitResult): OutfitScores {
    const coreItems = [outfit.top, outfit.bottom, outfit.shoes, outfit.outerwear];
    const colorHarmony = this.fashionIntelligence.evaluateColorHarmony([
      outfit.top.item,
      outfit.bottom.item,
      outfit.shoes.item,
      outfit.outerwear.item,
    ]);
    const topBottomRatio = this.fashionIntelligence.scoreTopBottomRatio(outfit.top.price, outfit.bottom.price);
    const silhouetteScore = this.fashionIntelligence.scoreSilhouetteBalance(
      outfit.top.item,
      outfit.bottom.item,
      outfit.outerwear.item,
    );
    const styleCoverage = this.styleCoverageScore(context, coreItems);
    const crossCompatibility = this.crossItemCompatibilityScore(outfit);
    const layering = this.fashionIntelligence.validateLayering(outfit.top.item, outfit.outerwear.item) ? 92 : 64;

    const styleCoherence = this.clampToPercent(
      Math.round(
        styleCoverage * 0.25 +
          crossCompatibility * 0.2 +
          colorHarmony.score * 0.17 +
          silhouetteScore * 0.16 +
          layering * 0.1 +
          topBottomRatio * 0.12,
      ),
    );

    const budgetEfficiency = this.fashionIntelligence.scoreBudgetCoherence(
      outfit.total_price,
      context.budget.min,
      context.budget.max,
      context.budget.preference,
    );
    const weatherCompatibility = this.weatherCompatibilityScore(context, outfit);
    const brandPrestige = this.fashionIntelligence.scoreBrandPrestige(
      [...coreItems, ...outfit.accessories],
      context.trend?.dynamicBrandWeights ?? {},
      context.monetization?.luxuryBias ? 0.8 : 0.35,
    );
    const personalizationConfidence = this.personalizationConfidenceScore(context, outfit);

    const trendInfluence = this.fashionIntelligence.scoreTrendInfluence(
      context.trend?.styleTrendScore ?? 58,
      context.trend?.seasonalShiftScore ?? 60,
    );

    const visual = this.fashionIntelligence.scoreVisualModel({
      itemNames: [outfit.top.item, outfit.bottom.item, outfit.shoes.item, outfit.outerwear.item],
      accessoryCount: outfit.accessories.length,
      colorHarmonyScore: colorHarmony.score,
      silhouetteScore,
    });

    const affiliatePriorityAvg = this.fashionIntelligence.averageAffiliatePriority(
      coreItems.map((piece) => piece.brand),
    );
    const conversionLikelihood = this.fashionIntelligence.scoreConversionLikelihood({
      budgetCoherence: budgetEfficiency,
      personalizationConfidence,
      trendInfluence,
      affiliatePriorityAvg,
    });
    const marginScore = this.fashionIntelligence.scoreMarginPotential(
      [...coreItems, ...outfit.accessories],
      context.monetization?.highMarginBoost ?? 0,
    );

    const overall = this.clampToPercent(
      Math.round(
        styleCoherence * 0.2 +
          budgetEfficiency * 0.12 +
          weatherCompatibility * 0.11 +
          brandPrestige * 0.11 +
          personalizationConfidence * 0.1 +
          trendInfluence * 0.09 +
          visual.visualCoherence * 0.1 +
          conversionLikelihood * 0.09 +
          marginScore * 0.08,
      ),
    );

    return {
      top_bottom_ratio: topBottomRatio,
      color_harmony: colorHarmony.score,
      trend_influence: trendInfluence,
      visual_coherence: visual.visualCoherence,
      image_harmony: visual.imageHarmony,
      aesthetic_density: visual.aestheticDensity,
      minimalist_maximalist_fit: visual.minimalistVsMaximalistFit,
      conversion_likelihood: conversionLikelihood,
      margin_score: marginScore,
      style_coherence: styleCoherence,
      budget_efficiency: budgetEfficiency,
      weather_compatibility: weatherCompatibility,
      brand_prestige: brandPrestige,
      personalization_confidence: personalizationConfidence,
      overall,
    };
  }

  private styleCoverageScore(
    context: PipelineContext,
    coreItems: Array<{ styleTags: string[] }>,
  ) {
    const targetStyle = context.input.style.toLowerCase();
    const matches = coreItems.filter((item) =>
      item.styleTags.map((tag) => tag.toLowerCase()).includes(targetStyle),
    ).length;
    return this.clampToPercent(Math.round((matches / coreItems.length) * 100));
  }

  private crossItemCompatibilityScore(outfit: OutfitResult) {
    const coreItems = [outfit.top, outfit.bottom, outfit.shoes, outfit.outerwear];
    const pairs: number[] = [];
    for (let i = 0; i < coreItems.length; i += 1) {
      for (let j = i + 1; j < coreItems.length; j += 1) {
        const left = new Set(coreItems[i].styleTags.map((tag) => tag.toLowerCase()));
        const right = new Set(coreItems[j].styleTags.map((tag) => tag.toLowerCase()));
        const inter = [...left].filter((tag) => right.has(tag)).length;
        const union = new Set([...left, ...right]).size;
        const jaccard = union ? inter / union : 0;
        pairs.push(jaccard);
      }
    }
    if (!pairs.length) {
      return 52;
    }
    const avg = pairs.reduce((sum, value) => sum + value, 0) / pairs.length;
    return this.clampToPercent(Math.round(avg * 100));
  }

  private weatherCompatibilityScore(context: PipelineContext, outfit: OutfitResult) {
    let score = 100;
    const combined = `${outfit.top.item} ${outfit.outerwear.item}`.toLowerCase();
    const shoes = outfit.shoes.item.toLowerCase();
    if (context.weather.isCold && !/(coat|jacket|hoodie|sweater|knit|puffer|wool)/.test(combined)) {
      score -= 28;
    }
    if (context.weather.isHot && /(wool|puffer|parka|heavy)/.test(combined)) {
      score -= 24;
    }
    if (context.weather.isRainy && /(suede|canvas)/.test(shoes)) {
      score -= 16;
    }
    if (!this.fashionIntelligence.validateSeasonality([outfit.top.item, outfit.outerwear.item], {
      isCold: context.weather.isCold,
      isHot: context.weather.isHot,
    })) {
      score -= 14;
    }
    return this.clampToPercent(score);
  }

  private personalizationConfidenceScore(context: PipelineContext, outfit: OutfitResult) {
    const profile = context.personalization;
    if (!profile) {
      return 35;
    }

    const styleHistoryScore = profile.lastStyle?.toLowerCase() === context.input.style.toLowerCase() ? 96 : 66;
    const favorite = new Set(profile.favoriteBrands.map((brand) => brand.toLowerCase()));
    const coreBrands = [outfit.top.brand, outfit.bottom.brand, outfit.shoes.brand, outfit.outerwear.brand];
    const favoriteHits = coreBrands.filter((brand) => favorite.has(brand.toLowerCase())).length;
    const favoriteScore = this.clampToPercent(Math.round((favoriteHits / coreBrands.length) * 100));
    const dataVolumeScore = this.clampToPercent(Math.round(Math.min(100, profile.generationCount * 3.4)));
    const adaptiveScore = profile.adaptiveIndex;

    return this.clampToPercent(
      Math.round(
        styleHistoryScore * 0.28 +
          favoriteScore * 0.24 +
          dataVolumeScore * 0.2 +
          adaptiveScore * 0.2 +
          (profile.avgRating > 0 ? (profile.avgRating / 5) * 100 : 48) * 0.08,
      ),
    );
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

