import { Injectable } from '@nestjs/common';
import { WeatherService } from '../../weather/weather.service';
import { NormalizedInput } from '../types/outfit.types';

@Injectable()
export class ContextBuilderService {
  constructor(private readonly weatherService: WeatherService) {}

  async build(input: NormalizedInput) {
    const weather = await this.weatherService.resolveWeather({
      city: input.city,
      latitude: input.latitude,
      longitude: input.longitude,
    });

    return weather;
  }
}
