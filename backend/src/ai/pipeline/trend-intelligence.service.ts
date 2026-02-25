import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TrendContextSnapshot } from '../types/outfit.types';

type TrendCacheEntry = {
  expiresAt: number;
  value: TrendContextSnapshot;
};

@Injectable()
export class TrendIntelligenceService {
  private readonly logger = new Logger(TrendIntelligenceService.name);
  private readonly ttlMs = 10 * 60 * 1000;
  private readonly cache = new Map<string, TrendCacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  async getSnapshot(style: string): Promise<TrendContextSnapshot> {
    const key = style.trim().toLowerCase();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const snapshot = await this.computeSnapshot(key);
    this.cache.set(key, {
      value: snapshot,
      expiresAt: Date.now() + this.ttlMs,
    });
    return snapshot;
  }

  private async computeSnapshot(style: string): Promise<TrendContextSnapshot> {
    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const logs = await this.prisma.outfitGenerationLog.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 500,
        select: {
          style: true,
          outputJson: true,
          createdAt: true,
        },
      });

      const trendMap = new Map<string, number>();
      const confidenceMap = new Map<string, number>();
      const brandWeightMap = new Map<string, number>();

      for (const log of logs) {
        const ageDays = Math.max(0, (Date.now() - log.createdAt.getTime()) / (24 * 60 * 60 * 1000));
        const recencyWeight = Math.max(0.2, 1 - ageDays / 45);
        trendMap.set(log.style, (trendMap.get(log.style) ?? 0) + recencyWeight);

        const output = log.outputJson as {
          scores?: { overall?: number };
          top?: { brand?: string };
          bottom?: { brand?: string };
          shoes?: { brand?: string };
          outerwear?: { brand?: string };
        } | null;

        const overall = output?.scores?.overall ?? 0;
        const confidenceBoost = Math.max(0, overall - 55) / 45;
        confidenceMap.set(log.style, (confidenceMap.get(log.style) ?? 0) + confidenceBoost);

        const brands = [
          output?.top?.brand,
          output?.bottom?.brand,
          output?.shoes?.brand,
          output?.outerwear?.brand,
        ].filter((brand): brand is string => Boolean(brand));
        for (const brand of brands) {
          brandWeightMap.set(brand, (brandWeightMap.get(brand) ?? 0) + recencyWeight * (1 + confidenceBoost));
        }
      }

      const sortedStyles = [...trendMap.entries()].sort((a, b) => b[1] - a[1]);
      const trendingStyles = sortedStyles.slice(0, 6).map(([styleName]) => styleName);
      const highConfidenceStyles = [...confidenceMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([styleName]) => styleName);

      const maxStyleWeight = sortedStyles[0]?.[1] ?? 1;
      const styleTrendScore = this.toPercent((trendMap.get(style) ?? 0) / maxStyleWeight);
      const seasonalShiftScore = this.estimateSeasonalShift(style, trendingStyles);
      const trendInfluenceCoefficient = this.toPercent(
        styleTrendScore * 0.75 + seasonalShiftScore * 0.25,
      );

      const maxBrandWeight = Math.max(1, ...brandWeightMap.values());
      const dynamicBrandWeights = [...brandWeightMap.entries()].reduce<Record<string, number>>(
        (acc, [brand, weight]) => {
          acc[brand] = this.toPercent((weight / maxBrandWeight) * 100) / 100;
          return acc;
        },
        {},
      );

      return {
        trendingStyles,
        highConfidenceStyles,
        styleTrendScore,
        seasonalShiftScore,
        trendInfluenceCoefficient,
        dynamicBrandWeights,
      };
    } catch (error) {
      this.logger.warn(`Trend snapshot fallback: ${String(error)}`);
      return {
        trendingStyles: [],
        highConfidenceStyles: [],
        styleTrendScore: 60,
        seasonalShiftScore: 58,
        trendInfluenceCoefficient: 59,
        dynamicBrandWeights: {},
      };
    }
  }

  private estimateSeasonalShift(style: string, trendingStyles: string[]) {
    const month = new Date().getMonth() + 1;
    const seasonalBoostMap: Record<string, string[]> = {
      winter: ['goth', 'minimal', 'streetwear', 'old money'],
      spring: ['smart casual', 'minimal', 'vintage'],
      summer: ['y2k', 'streetwear', 'casual', 'minimal'],
      autumn: ['vintage', 'goth', 'techwear', 'smart casual'],
    };

    const season = month === 12 || month <= 2
      ? 'winter'
      : month <= 5
        ? 'spring'
        : month <= 8
          ? 'summer'
          : 'autumn';

    const alignedStyles = seasonalBoostMap[season] ?? [];
    const alignedTrendHits = trendingStyles.filter((entry) => alignedStyles.includes(entry)).length;
    const styleAligned = alignedStyles.includes(style);

    const base = styleAligned ? 82 : 58;
    return this.toPercent(base + alignedTrendHits * 4);
  }

  private toPercent(value: number) {
    const rounded = Math.round(value);
    if (rounded < 0) {
      return 0;
    }
    if (rounded > 100) {
      return 100;
    }
    return rounded;
  }
}

