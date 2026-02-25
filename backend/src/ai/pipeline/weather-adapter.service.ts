import { Injectable } from '@nestjs/common';
import { PipelineContext } from '../types/outfit.types';
import { CandidateMap } from './brand-selector.service';

export type WeatherAdaptedPlan = {
  candidates: CandidateMap;
  includeOuterwear: boolean;
  accessoryCount: number;
  weatherSummary: string;
};

@Injectable()
export class WeatherAdapterService {
  adapt(context: PipelineContext, candidates: CandidateMap): WeatherAdaptedPlan {
    const includeOuterwear = context.weather.isCold || context.weather.isRainy;
    const accessoryCount = context.weather.isCold ? 2 : 1;

    const weatherSummary = `${context.weather.locationLabel}, ${context.weather.temperatureC}C, ${context.weather.condition}`;

    if (includeOuterwear) {
      return {
        candidates,
        includeOuterwear,
        accessoryCount,
        weatherSummary,
      };
    }

    const lighterOuterwear = candidates.outerwear.filter((item) => item.estimatedPrice <= context.budget.max);

    return {
      candidates: {
        ...candidates,
        outerwear: lighterOuterwear.length ? lighterOuterwear : candidates.outerwear,
      },
      includeOuterwear: false,
      accessoryCount,
      weatherSummary,
    };
  }
}
