export type WeatherLookupInput = {
  city?: string;
  latitude?: number;
  longitude?: number;
};

export type WeatherContext = {
  locationLabel: string;
  temperatureC: number;
  condition: string;
  isCold: boolean;
  isHot: boolean;
  isRainy: boolean;
  source: 'api' | 'fallback';
};
