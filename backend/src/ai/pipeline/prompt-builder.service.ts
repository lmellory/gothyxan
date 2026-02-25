import { Injectable } from '@nestjs/common';

@Injectable()
export class PromptBuilderService {
  build(input: {
    style: string;
    occasion: string;
    location: string;
    weatherSummary: string;
    budgetLabel: string;
    paletteHint: string;
    trendCoefficient?: number;
    adaptiveIndex?: number;
    monetizationMode?: 'standard' | 'luxury' | 'premium-only';
  }) {
    return [
      `Style: ${input.style}`,
      `Occasion: ${input.occasion}`,
      `Location: ${input.location}`,
      `Weather: ${input.weatherSummary}`,
      `Budget: ${input.budgetLabel}`,
      `Palette: ${input.paletteHint}`,
      `TrendInfluence: ${input.trendCoefficient ?? 60}/100`,
      `AdaptiveIndex: ${input.adaptiveIndex ?? 35}/100`,
      `MonetizationMode: ${input.monetizationMode ?? 'standard'}`,
      'Use only branded clothing items and keep silhouette cohesive.',
    ].join(' | ');
  }
}
