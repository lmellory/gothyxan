import { Injectable, Logger } from '@nestjs/common';
import { BudgetMode, Prisma } from '@prisma/client';
import { GenerateOutfitDto } from '../ai/dto/generate-outfit.dto';
import { OutfitResult } from '../ai/types/outfit.types';
import { PrismaService } from '../database/prisma.service';

type CounterMap = Record<string, number>;

@Injectable()
export class StyleProfileService {
  private readonly logger = new Logger(StyleProfileService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getByUserId(userId: string) {
    try {
      return await this.prisma.userStyleProfile.findUnique({
        where: { userId },
      });
    } catch (error) {
      this.logger.warn(`Could not read style profile for ${userId}: ${String(error)}`);
      return null;
    }
  }

  async recordGeneration(userId: string, input: GenerateOutfitDto, outfit: OutfitResult) {
    try {
      const existing = await this.prisma.userStyleProfile.findUnique({
        where: { userId },
      });

      const styleStats = this.incrementCounterMap(this.asCounterMap(existing?.styleStats), outfit.style);
      const brandStats = this.mergeBrandStats(existing?.brandStats, outfit);
      const favoriteBrands = this.topKeys(brandStats, 5);
      const nextGenerationCount = (existing?.generationCount ?? 0) + 1;
      const avgBudgetMin = this.rollingAverage(existing?.avgBudgetMin, input.budgetMin, nextGenerationCount);
      const avgBudgetMax = this.rollingAverage(existing?.avgBudgetMax, input.budgetMax, nextGenerationCount);

      await this.prisma.userStyleProfile.upsert({
        where: { userId },
        create: {
          userId,
          generationCount: 1,
          preferredBudgetMode: this.mapBudgetMode(input.budgetMode),
          avgBudgetMin: input.budgetMin ?? null,
          avgBudgetMax: input.budgetMax ?? null,
          lastStyle: outfit.style,
          favoriteBrands,
          styleStats: styleStats as Prisma.JsonObject,
          brandStats: brandStats as Prisma.JsonObject,
          lastGeneratedAt: new Date(),
        },
        update: {
          generationCount: nextGenerationCount,
          preferredBudgetMode: this.mapBudgetMode(input.budgetMode) ?? existing?.preferredBudgetMode,
          avgBudgetMin,
          avgBudgetMax,
          lastStyle: outfit.style,
          favoriteBrands,
          styleStats: styleStats as Prisma.JsonObject,
          brandStats: brandStats as Prisma.JsonObject,
          lastGeneratedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.warn(`Could not update style profile for ${userId}: ${String(error)}`);
    }
  }

  private mergeBrandStats(rawStats: unknown, outfit: OutfitResult) {
    const stats = this.asCounterMap(rawStats);
    const pieces = [
      outfit.top,
      outfit.bottom,
      outfit.shoes,
      outfit.outerwear,
      ...outfit.accessories,
    ];

    for (const piece of pieces) {
      if (!piece.brand) {
        continue;
      }
      const key = piece.brand.trim();
      stats[key] = (stats[key] ?? 0) + 1;
    }
    return stats;
  }

  private rollingAverage(current: number | null | undefined, incoming: number | undefined, n: number) {
    if (typeof incoming !== 'number') {
      return current ?? null;
    }
    if (current === null || current === undefined || n <= 1) {
      return incoming;
    }
    return Math.round(((current * (n - 1)) + incoming) / n);
  }

  private incrementCounterMap(stats: CounterMap, key: string) {
    if (!key) {
      return stats;
    }
    const normalizedKey = key.trim().toLowerCase();
    stats[normalizedKey] = (stats[normalizedKey] ?? 0) + 1;
    return stats;
  }

  private asCounterMap(value: unknown): CounterMap {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.reduce<CounterMap>((acc, [key, raw]) => {
      const normalized = Number(raw);
      if (Number.isFinite(normalized) && normalized > 0) {
        acc[key] = Math.floor(normalized);
      }
      return acc;
    }, {});
  }

  private topKeys(stats: CounterMap, limit: number) {
    return Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key]) => key);
  }

  private mapBudgetMode(mode?: string): BudgetMode | null {
    if (mode === 'custom') {
      return BudgetMode.CUSTOM;
    }
    if (mode === 'premium') {
      return BudgetMode.PREMIUM;
    }
    if (mode === 'cheaper') {
      return BudgetMode.CHEAPER;
    }
    return null;
  }
}

