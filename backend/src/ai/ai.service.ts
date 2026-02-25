import { BadRequestException, Injectable } from '@nestjs/common';
import { GenerateOutfitDto } from './dto/generate-outfit.dto';
import { BudgetEngineService } from './pipeline/budget-engine.service';
import { BrandSelectorService } from './pipeline/brand-selector.service';
import { ContextBuilderService } from './pipeline/context-builder.service';
import { InputAnalyzerService } from './pipeline/input-analyzer.service';
import { OutfitComposerService } from './pipeline/outfit-composer.service';
import { PromptBuilderService } from './pipeline/prompt-builder.service';
import { ResponseFormatterService } from './pipeline/response-formatter.service';
import { StyleClassifierService } from './pipeline/style-classifier.service';
import { TrendIntelligenceService } from './pipeline/trend-intelligence.service';
import { ValidationLayerService } from './pipeline/validation-layer.service';
import { WeatherAdapterService } from './pipeline/weather-adapter.service';
import { OutfitCacheService } from './services/outfit-cache.service';
import { OutfitResult, PipelineContext } from './types/outfit.types';

@Injectable()
export class AiService {
  constructor(
    private readonly inputAnalyzer: InputAnalyzerService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly styleClassifier: StyleClassifierService,
    private readonly budgetEngine: BudgetEngineService,
    private readonly brandSelector: BrandSelectorService,
    private readonly weatherAdapter: WeatherAdapterService,
    private readonly outfitComposer: OutfitComposerService,
    private readonly validationLayer: ValidationLayerService,
    private readonly responseFormatter: ResponseFormatterService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly outfitCache: OutfitCacheService,
    private readonly trendIntelligence: TrendIntelligenceService,
  ) {}

  async generateOutfit(
    inputDto: GenerateOutfitDto,
    options?: {
      userId?: string;
      personalization?: PipelineContext['personalization'];
      monetization?: PipelineContext['monetization'];
    },
  ) {
    const input = this.inputAnalyzer.analyze(inputDto);
    const style = this.styleClassifier.classify(input.styleInput);
    input.style = style.style;

    const useCache = process.env.AI_CACHE_ENABLED === 'true';
    const cacheKey = this.getCacheKey(inputDto);
    if (useCache) {
      const cached = await this.outfitCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const weather = await this.contextBuilder.build(input);
    const budget = this.budgetEngine.decide(input, style.preferredTiers);
    const trend = await this.trendIntelligence.getSnapshot(input.style);
    const prompt = this.promptBuilder.build({
      style: input.style,
      occasion: input.occasion,
      location: weather.locationLabel,
      weatherSummary: `${weather.temperatureC}C ${weather.condition}`,
      budgetLabel: budget.budgetLabel,
      paletteHint: style.paletteHint,
      trendCoefficient: trend.trendInfluenceCoefficient,
      adaptiveIndex: options?.personalization?.adaptiveIndex,
      monetizationMode: options?.monetization?.premiumOnly
        ? 'premium-only'
        : options?.monetization?.luxuryBias
          ? 'luxury'
          : 'standard',
    });

    const context: PipelineContext = {
      userId: options?.userId,
      personalization: options?.personalization,
      monetization: options?.monetization,
      input,
      weather,
      budget,
      trend,
      prompt,
    };

    const result = await this.runPipeline(context);
    if (useCache) {
      await this.outfitCache.set(cacheKey, result);
    }
    return result;
  }

  private async runPipeline(context: PipelineContext) {
    const firstAttempt = await this.tryComposeValidOutfit(context);
    if (firstAttempt.outfit) {
      return firstAttempt.outfit;
    }

    const fallbackContext: PipelineContext = {
      ...context,
      budget: {
        ...context.budget,
        tiers: [1, 2, 3],
        preference: 'cheaper',
      },
    };
    const fallbackAttempt = await this.tryComposeValidOutfit(fallbackContext);
    if (fallbackAttempt.outfit) {
      return fallbackAttempt.outfit;
    }

    const reasons = [...new Set([...firstAttempt.reasons, ...fallbackAttempt.reasons])];
    throw new BadRequestException({
      message: 'Could not compose a valid branded outfit',
      reasons: reasons.length ? reasons : ['Budget constraints violated'],
    });
  }

  private async tryComposeValidOutfit(context: PipelineContext): Promise<{
    outfit: OutfitResult | null;
    reasons: string[];
  }> {
    try {
      const candidates = await this.brandSelector.select(context);
      const adapted = this.weatherAdapter.adapt(context, candidates);
      const composed = this.outfitComposer.compose(context, adapted);
      const validation = this.validationLayer.validate(context, composed);
      if (!validation.isValid) {
        const deterministic = this.outfitComposer.composeDeterministic(context, adapted);
        const deterministicValidation = this.validationLayer.validate(context, deterministic);
        if (deterministicValidation.isValid) {
          const deterministicFormatted = await this.responseFormatter.format(context, deterministic);
          if (
            deterministicFormatted.total_price >= context.budget.min &&
            deterministicFormatted.total_price <= context.budget.max
          ) {
            return {
              outfit: deterministicFormatted,
              reasons: [],
            };
          }
        }
        return {
          outfit: null,
          reasons: validation.reasons,
        };
      }

      const formatted = await this.responseFormatter.format(context, composed);
      if (
        formatted.total_price < context.budget.min ||
        formatted.total_price > context.budget.max
      ) {
        return {
          outfit: null,
          reasons: ['Budget constraints violated'],
        };
      }

      return {
        outfit: formatted,
        reasons: [],
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        const response = error.getResponse();
        const message =
          typeof response === 'string'
            ? response
            : (response as { message?: string | string[] }).message;

        const normalized =
          typeof message === 'string'
            ? message
            : Array.isArray(message)
              ? message.join(', ')
              : 'Could not compose a valid branded outfit';

        if (normalized.includes('No branded items available')) {
          return {
            outfit: null,
            reasons: ['Budget constraints violated', 'No branded items available in requested budget'],
          };
        }
      }

      return {
        outfit: null,
        reasons: ['Could not compose a valid branded outfit'],
      };
    }
  }

  private getCacheKey(input: GenerateOutfitDto) {
    return JSON.stringify({
      style: input.style,
      occasion: input.occasion,
      city: input.city,
      lat: input.latitude,
      lon: input.longitude,
      budgetMode: input.budgetMode,
      min: input.budgetMin,
      max: input.budgetMax,
      fit: input.fitPreference,
      premiumOnly: input.premiumOnly,
      luxuryOnly: input.luxuryOnly,
    });
  }
}
