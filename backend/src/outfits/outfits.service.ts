import { Injectable } from '@nestjs/common';
import { BudgetMode, OutfitChannel, Prisma } from '@prisma/client';
import { GenerateOutfitDto } from '../ai/dto/generate-outfit.dto';
import { OutfitResult } from '../ai/types/outfit.types';
import { BudgetModeInput } from '../common/enums/budget-mode.enum';
import { PrismaService } from '../database/prisma.service';
import { MonetizationService } from '../monetization/monetization.service';
import { AdaptivePersonalizationService } from './adaptive-personalization.service';
import { OutfitFeedbackDto } from './dto/outfit-feedback.dto';
import { SaveOutfitDto } from './dto/save-outfit.dto';
import { OutfitQueueService } from './queue/outfit-queue.service';
import { StyleProfileService } from './style-profile.service';

@Injectable()
export class OutfitsService {
  constructor(
    private readonly outfitQueueService: OutfitQueueService,
    private readonly prisma: PrismaService,
    private readonly styleProfileService: StyleProfileService,
    private readonly monetizationService: MonetizationService,
    private readonly adaptivePersonalizationService: AdaptivePersonalizationService,
  ) {}

  async generate(userId: string, dto: GenerateOutfitDto) {
    await this.monetizationService.ensureGenerationAllowed(
      userId,
      dto.luxuryOnly ?? false,
      dto.premiumOnly ?? false,
    );
    const styleProfile = await this.styleProfileService.getByUserId(userId);
    const adaptiveSignals = await this.adaptivePersonalizationService.buildSignals(userId, styleProfile);
    const monetizationSignals = await this.monetizationService.buildGenerationSignals(userId, {
      luxuryOnly: dto.luxuryOnly,
      premiumOnly: dto.premiumOnly,
    });

    const resolvedInput: GenerateOutfitDto = {
      ...dto,
      budgetMode: dto.budgetMode ?? this.toBudgetModeInput(styleProfile?.preferredBudgetMode),
    };
    const outfit = await this.outfitQueueService.generate(resolvedInput, {
      userId,
      personalization: adaptiveSignals,
      monetization: monetizationSignals,
    });
    const budgetMode = this.mapBudgetMode(resolvedInput.budgetMode);

    await this.prisma.outfitGenerationLog.create({
      data: {
        userId,
        style: outfit.style,
        occasion: resolvedInput.occasion,
        weatherContext: outfit.weather_context,
        location: resolvedInput.city ?? 'auto',
        budgetMode,
        budgetMin: resolvedInput.budgetMin ?? null,
        budgetMax: resolvedInput.budgetMax ?? null,
        totalPrice: outfit.total_price,
        outputJson: outfit as unknown as Prisma.InputJsonValue,
        validationPassed: true,
        explanation: outfit.explanation,
      },
    });
    await this.styleProfileService.recordGeneration(userId, resolvedInput, outfit);
    await this.monetizationService.consumeGeneration(userId);

    return outfit;
  }

  async regenerate(userId: string, dto: GenerateOutfitDto) {
    await this.adaptivePersonalizationService.recordRegenerateAction(userId, dto);
    return this.generate(userId, dto);
  }

  getHistory(userId: string) {
    return this.prisma.outfitGenerationLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async saveOutfit(userId: string, dto: SaveOutfitDto) {
    const saved = await this.prisma.savedOutfit.create({
      data: {
        userId,
        channel: dto.channel as OutfitChannel,
        outfitJson: dto.outfit as Prisma.InputJsonValue,
      },
    });

    try {
      await this.adaptivePersonalizationService.recordSaveAction(userId, dto.outfit as OutfitResult);
    } catch {
      // non-blocking feedback update
    }

    return saved;
  }

  getSaved(userId: string) {
    return this.prisma.savedOutfit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async recordFeedback(userId: string, dto: OutfitFeedbackDto) {
    await this.adaptivePersonalizationService.recordRating(userId, {
      rating: dto.rating,
      style: dto.style,
      saved: dto.saved,
      regenerated: dto.regenerated,
      budgetMode: dto.budgetMode,
      note: dto.note,
      outfit: dto.outfit,
    });

    return {
      status: 'ok',
      message: 'Feedback recorded',
    };
  }

  async getStyleProfile(userId: string) {
    const profile = await this.styleProfileService.getByUserId(userId);
    const adaptive = await this.adaptivePersonalizationService.buildSignals(userId, profile);
    if (!profile) {
      return { adaptive };
    }
    return {
      ...profile,
      adaptive,
    };
  }

  private mapBudgetMode(mode?: string): BudgetMode {
    if (mode === 'premium') {
      return BudgetMode.PREMIUM;
    }
    if (mode === 'custom') {
      return BudgetMode.CUSTOM;
    }
    return BudgetMode.CHEAPER;
  }

  private toBudgetModeInput(mode?: BudgetMode | null): BudgetModeInput | undefined {
    if (mode === BudgetMode.CHEAPER) {
      return BudgetModeInput.CHEAPER;
    }
    if (mode === BudgetMode.PREMIUM) {
      return BudgetModeInput.PREMIUM;
    }
    if (mode === BudgetMode.CUSTOM) {
      return BudgetModeInput.CUSTOM;
    }
    return undefined;
  }
}
