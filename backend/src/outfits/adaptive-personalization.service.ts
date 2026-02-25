import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GenerateOutfitDto } from '../ai/dto/generate-outfit.dto';
import { AdaptivePersonalizationInput } from '../ai/types/outfit.types';
import { PrismaService } from '../database/prisma.service';

type RatingPayload = {
  rating: number;
  style?: string;
  saved?: boolean;
  regenerated?: boolean;
  budgetMode?: string;
  note?: string;
  outfit?: Record<string, unknown>;
};

@Injectable()
export class AdaptivePersonalizationService {
  private readonly logger = new Logger(AdaptivePersonalizationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async buildSignals(
    userId: string,
    profile?: {
      generationCount: number;
      favoriteBrands: string[];
      lastStyle?: string | null;
    } | null,
  ): Promise<AdaptivePersonalizationInput> {
    try {
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const [history, feedbackLogs] = await Promise.all([
        this.prisma.outfitGenerationLog.findMany({
          where: { userId, createdAt: { gte: since } },
          orderBy: { createdAt: 'desc' },
          take: 220,
          select: {
            style: true,
            budgetMode: true,
            budgetMin: true,
            budgetMax: true,
            totalPrice: true,
            outputJson: true,
          },
        }),
        this.prisma.auditLog.findMany({
          where: {
            actorUserId: userId,
            action: {
              in: ['OUTFIT_RATE', 'OUTFIT_SAVE', 'OUTFIT_REGENERATE'],
            },
            createdAt: { gte: since },
          },
          orderBy: { createdAt: 'desc' },
          take: 400,
          select: { action: true, payload: true },
        }),
      ]);

      const generationCount = profile?.generationCount ?? history.length;
      const styleFrequency = this.countBy(history.map((entry) => entry.style.toLowerCase()));
      const preferredStyles = this.topKeys(styleFrequency, 3);
      const styleBiasScore = this.computeStyleBias(styleFrequency);
      const brandAffinity = this.computeBrandAffinity(history);
      const favoriteBrands = profile?.favoriteBrands?.length
        ? profile.favoriteBrands
        : this.topKeys(brandAffinity, 5);
      const budgetSensitivity = this.computeBudgetSensitivity(history);

      const ratings = feedbackLogs
        .filter((entry) => entry.action === 'OUTFIT_RATE')
        .map((entry) => (entry.payload as { rating?: number } | null)?.rating)
        .filter((value): value is number => typeof value === 'number');
      const avgRating = ratings.length
        ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(2))
        : 0;

      const saveActions = feedbackLogs.filter((entry) => entry.action === 'OUTFIT_SAVE').length;
      const regenerateActions = feedbackLogs.filter((entry) => entry.action === 'OUTFIT_REGENERATE').length;
      const saveRate = generationCount > 0 ? Number((saveActions / generationCount).toFixed(3)) : 0;
      const regenerateRate = generationCount > 0 ? Number((regenerateActions / generationCount).toFixed(3)) : 0;

      const adaptiveIndex = this.computeAdaptiveIndex({
        generationCount,
        avgRating,
        saveRate,
        regenerateRate,
        styleBiasScore,
        budgetSensitivity,
      });

      return {
        adaptiveIndex,
        generationCount,
        avgRating,
        saveRate,
        regenerateRate,
        favoriteBrands,
        preferredStyles,
        brandAffinity,
        budgetSensitivity,
        styleBiasScore,
        lastStyle: profile?.lastStyle ?? null,
      };
    } catch (error) {
      this.logger.warn(`Adaptive profile fallback for ${userId}: ${String(error)}`);
      return {
        adaptiveIndex: 35,
        generationCount: profile?.generationCount ?? 0,
        avgRating: 0,
        saveRate: 0,
        regenerateRate: 0,
        favoriteBrands: profile?.favoriteBrands ?? [],
        preferredStyles: [],
        brandAffinity: {},
        budgetSensitivity: 50,
        styleBiasScore: 0,
        lastStyle: profile?.lastStyle ?? null,
      };
    }
  }

  async recordRating(userId: string, payload: RatingPayload) {
    await this.createAuditLog(userId, 'OUTFIT_RATE', payload);
  }

  async recordSaveAction(
    userId: string,
    outfit: {
      style?: string;
      total_price?: number;
      top?: { brand?: string };
      bottom?: { brand?: string };
      shoes?: { brand?: string };
      outerwear?: { brand?: string };
    },
  ) {
    await this.createAuditLog(userId, 'OUTFIT_SAVE', {
      style: outfit.style,
      totalPrice: outfit.total_price,
      brands: [
        outfit.top?.brand,
        outfit.bottom?.brand,
        outfit.shoes?.brand,
        outfit.outerwear?.brand,
      ].filter(Boolean),
    });
  }

  async recordRegenerateAction(userId: string, input: GenerateOutfitDto) {
    await this.createAuditLog(userId, 'OUTFIT_REGENERATE', {
      style: input.style,
      budgetMode: input.budgetMode,
      luxuryOnly: Boolean(input.luxuryOnly),
    });
  }

  private async createAuditLog(userId: string, action: string, payload: unknown) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action,
        entityType: 'OUTFIT',
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }

  private computeAdaptiveIndex(input: {
    generationCount: number;
    avgRating: number;
    saveRate: number;
    regenerateRate: number;
    styleBiasScore: number;
    budgetSensitivity: number;
  }) {
    const dataVolume = Math.min(1, input.generationCount / 60);
    const ratingNorm = input.avgRating > 0 ? input.avgRating / 5 : 0.45;
    const saveNorm = Math.min(1, input.saveRate * 1.8);
    const regenPenalty = Math.min(1, input.regenerateRate * 1.6);
    const styleBalance = 1 - input.styleBiasScore / 100;
    const budgetSignal = input.budgetSensitivity / 100;

    const value =
      dataVolume * 0.22 +
      ratingNorm * 0.24 +
      saveNorm * 0.18 +
      (1 - regenPenalty) * 0.14 +
      styleBalance * 0.1 +
      budgetSignal * 0.12;

    return this.toPercent(value * 100);
  }

  private computeStyleBias(styleFrequency: Record<string, number>) {
    const entries = Object.values(styleFrequency);
    if (!entries.length) {
      return 0;
    }
    const total = entries.reduce((sum, value) => sum + value, 0);
    const dominantShare = Math.max(...entries) / total;
    return this.toPercent(dominantShare * 100);
  }

  private computeBrandAffinity(
    history: Array<{
      outputJson: Prisma.JsonValue;
    }>,
  ) {
    const brands: string[] = [];
    for (const entry of history) {
      const output = entry.outputJson as {
        top?: { brand?: string };
        bottom?: { brand?: string };
        shoes?: { brand?: string };
        outerwear?: { brand?: string };
      } | null;
      const current = [
        output?.top?.brand,
        output?.bottom?.brand,
        output?.shoes?.brand,
        output?.outerwear?.brand,
      ].filter((brand): brand is string => Boolean(brand));
      brands.push(...current);
    }

    const counts = this.countBy(brands.map((brand) => brand.trim()));
    const max = Math.max(1, ...Object.values(counts));
    return Object.entries(counts).reduce<Record<string, number>>((acc, [brand, count]) => {
      acc[brand] = Number((count / max).toFixed(3));
      return acc;
    }, {});
  }

  private computeBudgetSensitivity(
    history: Array<{
      budgetMin: number | null;
      budgetMax: number | null;
      totalPrice: number;
    }>,
  ) {
    const utilization = history
      .filter((entry) => entry.budgetMax !== null && entry.budgetMin !== null && entry.budgetMax > entry.budgetMin)
      .map((entry) => {
        const min = entry.budgetMin as number;
        const max = entry.budgetMax as number;
        const span = Math.max(1, max - min);
        return (entry.totalPrice - min) / span;
      });

    if (!utilization.length) {
      return 50;
    }

    const mean = utilization.reduce((sum, value) => sum + value, 0) / utilization.length;
    const variance =
      utilization.reduce((sum, value) => sum + (value - mean) ** 2, 0) / utilization.length;

    const strictness = Math.max(0, 1 - variance * 4);
    return this.toPercent(strictness * 100);
  }

  private countBy(values: string[]) {
    return values.reduce<Record<string, number>>((acc, value) => {
      if (!value) {
        return acc;
      }
      acc[value] = (acc[value] ?? 0) + 1;
      return acc;
    }, {});
  }

  private topKeys(stats: Record<string, number>, limit: number) {
    return Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key]) => key);
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
