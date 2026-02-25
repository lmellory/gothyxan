import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { WeatherContext, WeatherLookupInput } from './weather.types';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly weatherApiBase = 'https://api.openweathermap.org/data/2.5/weather';

  constructor(private readonly configService: ConfigService) {}

  async resolveWeather(input: WeatherLookupInput): Promise<WeatherContext> {
    const apiKey = this.configService.get<string>('weather.apiKey');
    if (!apiKey) {
      return this.fallbackWeather(input);
    }

    try {
      const params: Record<string, string | number> = {
        appid: apiKey,
        units: 'metric',
      };

      if (input.latitude !== undefined && input.longitude !== undefined) {
        params.lat = input.latitude;
        params.lon = input.longitude;
      } else if (input.city) {
        params.q = input.city;
      } else {
        return this.fallbackWeather(input);
      }

      const response = await axios.get(this.weatherApiBase, { params, timeout: 5_000 });
      const weatherMain = response.data?.weather?.[0]?.main ?? 'Unknown';
      const temperature = Number(response.data?.main?.temp ?? 18);
      const locationLabel = response.data?.name ?? input.city ?? 'Unknown';

      return {
        locationLabel,
        temperatureC: temperature,
        condition: weatherMain,
        isCold: temperature < 10,
        isHot: temperature > 26,
        isRainy: ['rain', 'drizzle', 'thunderstorm'].includes(String(weatherMain).toLowerCase()),
        source: 'api',
      };
    } catch (error) {
      this.logger.warn(`Weather API failed. Falling back. ${String(error)}`);
      return this.fallbackWeather(input);
    }
  }

  private fallbackWeather(input: WeatherLookupInput): WeatherContext {
    return {
      locationLabel: input.city ?? 'Default City',
      temperatureC: 18,
      condition: 'Clouds',
      isCold: false,
      isHot: false,
      isRainy: false,
      source: 'fallback',
    };
  }
}
