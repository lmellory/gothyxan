import { Module } from '@nestjs/common';
import { BrandsModule } from '../brands/brands.module';
import { MediaModule } from '../media/media.module';
import { WeatherModule } from '../weather/weather.module';
import { AiService } from './ai.service';
import { BudgetEngineService } from './pipeline/budget-engine.service';
import { BrandSelectorService } from './pipeline/brand-selector.service';
import { ContextBuilderService } from './pipeline/context-builder.service';
import { FashionIntelligenceService } from './pipeline/fashion-intelligence.service';
import { InputAnalyzerService } from './pipeline/input-analyzer.service';
import { OutfitComposerService } from './pipeline/outfit-composer.service';
import { PromptBuilderService } from './pipeline/prompt-builder.service';
import { ResponseFormatterService } from './pipeline/response-formatter.service';
import { StyleClassifierService } from './pipeline/style-classifier.service';
import { TrendIntelligenceService } from './pipeline/trend-intelligence.service';
import { ValidationLayerService } from './pipeline/validation-layer.service';
import { WeatherAdapterService } from './pipeline/weather-adapter.service';
import { OutfitCacheService } from './services/outfit-cache.service';
import { ProductCardResolverService } from './services/product-card-resolver.service';

@Module({
  imports: [BrandsModule, WeatherModule, MediaModule],
  providers: [
    AiService,
    OutfitCacheService,
    InputAnalyzerService,
    ContextBuilderService,
    StyleClassifierService,
    TrendIntelligenceService,
    FashionIntelligenceService,
    BudgetEngineService,
    BrandSelectorService,
    WeatherAdapterService,
    OutfitComposerService,
    ValidationLayerService,
    ResponseFormatterService,
    ProductCardResolverService,
    PromptBuilderService,
  ],
  exports: [AiService],
})
export class AiModule {}
