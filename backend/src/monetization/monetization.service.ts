import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { OutfitChannel, SubscriptionTier } from '@prisma/client';
import { randomBytes } from 'crypto';
import { MonetizationSignals } from '../ai/types/outfit.types';
import { PrismaService } from '../database/prisma.service';

type TrackClickInput = {
  userId?: string;
  channel?: OutfitChannel;
  brand?: string;
  item?: string;
  targetUrl: string;
  affiliateUrl?: string;
  estimatedPrice?: number;
};

@Injectable()
export class MonetizationService {
  private readonly logger = new Logger(MonetizationService.name);
  private readonly freeDailyLimit = Number(process.env.FREE_DAILY_GENERATION_LIMIT ?? '20');
  private readonly premiumDailyLimit = Number(process.env.PREMIUM_DAILY_GENERATION_LIMIT ?? '9999');
  private readonly defaultCommissionRate = Number(process.env.AFFILIATE_COMMISSION_RATE ?? '0.06');
  private readonly redirectBaseUrl = (process.env.API_PUBLIC_BASE_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

  constructor(private readonly prisma: PrismaService) {}

  async ensureUserMonetizationProfile(userId: string) {
    await this.prisma.userSubscription.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        tier: SubscriptionTier.FREE,
        dailyGenerationLimit: this.freeDailyLimit,
        monthlyGenerationLimit: 300,
        unlimitedGenerations: false,
        luxuryOnlyEnabled: false,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (!user?.referralCode) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { referralCode: this.generateReferralCode() },
      });
    }
  }

  async getSubscription(userId: string) {
    await this.ensureUserMonetizationProfile(userId);
    return this.prisma.userSubscription.findUnique({
      where: { userId },
    });
  }

  async activatePremium(userId: string) {
    await this.ensureUserMonetizationProfile(userId);
    return this.prisma.userSubscription.update({
      where: { userId },
      data: {
        tier: SubscriptionTier.PREMIUM,
        unlimitedGenerations: true,
        luxuryOnlyEnabled: true,
        dailyGenerationLimit: this.premiumDailyLimit,
        monthlyGenerationLimit: 100_000,
        status: 'active',
      },
    });
  }

  async ensureGenerationAllowed(userId: string, luxuryOnly = false, premiumOnly = false) {
    await this.ensureUserMonetizationProfile(userId);
    const subscription = await this.prisma.userSubscription.findUnique({ where: { userId } });
    if (!subscription) {
      throw new ForbiddenException('Subscription data unavailable');
    }

    if (luxuryOnly && !subscription.luxuryOnlyEnabled) {
      throw new ForbiddenException('Luxury-only mode requires premium subscription');
    }
    if (premiumOnly && subscription.tier !== SubscriptionTier.PREMIUM) {
      throw new ForbiddenException('Premium-only generation requires premium subscription');
    }

    if (subscription.unlimitedGenerations) {
      return subscription;
    }

    const day = this.todayStart();
    const usage = await this.prisma.generationUsageDaily.findUnique({
      where: { userId_day: { userId, day } },
    });

    const used = usage?.count ?? 0;
    if (used >= subscription.dailyGenerationLimit) {
      throw new ForbiddenException('Daily generation limit reached. Upgrade to premium for unlimited generations.');
    }

    return subscription;
  }

  async buildGenerationSignals(userId: string, input: { luxuryOnly?: boolean; premiumOnly?: boolean }): Promise<MonetizationSignals> {
    await this.ensureUserMonetizationProfile(userId);
    const subscription = await this.prisma.userSubscription.findUnique({ where: { userId } });
    const isPremium = subscription?.tier === SubscriptionTier.PREMIUM;

    const luxuryBias = Boolean(input.luxuryOnly) || Boolean(subscription?.luxuryOnlyEnabled && isPremium);
    const premiumOnly = Boolean(input.premiumOnly);
    const affiliateAware = true;

    const highMarginBoost = luxuryBias ? 0.9 : isPremium ? 0.65 : 0.35;
    const conversionBoost = isPremium ? 0.72 : 0.48;

    return {
      affiliateAware,
      luxuryBias,
      premiumOnly,
      highMarginBoost,
      conversionBoost,
    };
  }

  async consumeGeneration(userId: string) {
    const day = this.todayStart();
    await this.prisma.generationUsageDaily.upsert({
      where: { userId_day: { userId, day } },
      create: { userId, day, count: 1 },
      update: { count: { increment: 1 } },
    });
  }

  async getReferralSummary(userId: string) {
    await this.ensureUserMonetizationProfile(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });
    const [invited, earnedCredits] = await Promise.all([
      this.prisma.referralEvent.count({
        where: { referrerUserId: userId },
      }),
      this.prisma.referralEvent.aggregate({
        where: { referrerUserId: userId },
        _sum: { rewardCredits: true },
      }),
    ]);

    return {
      referralCode: user?.referralCode,
      invitedUsers: invited,
      earnedCredits: earnedCredits._sum.rewardCredits ?? 0,
    };
  }

  async applyReferralCode(refereeUserId: string, referralCode: string) {
    const code = referralCode.trim().toUpperCase();
    if (!code) {
      return;
    }

    const referee = await this.prisma.user.findUnique({
      where: { id: refereeUserId },
      select: { id: true, referralCode: true, referredByCode: true },
    });
    if (!referee || referee.referredByCode) {
      return;
    }

    const referrer = await this.prisma.user.findFirst({
      where: { referralCode: code },
      select: { id: true },
    });

    if (!referrer || referrer.id === refereeUserId) {
      return;
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: refereeUserId },
        data: { referredByCode: code },
      }),
      this.prisma.referralEvent.create({
        data: {
          referrerUserId: referrer.id,
          refereeUserId,
          referralCode: code,
          rewardCredits: 100,
        },
      }),
    ]);
  }

  buildAffiliateUrl(input: { targetUrl: string; brand?: string; item?: string; userId?: string }) {
    const target = this.normalizeHttpUrl(input.targetUrl);
    const url = new URL(`${this.redirectBaseUrl}/api/monetization/affiliate/redirect`);
    url.searchParams.set('target', target);
    if (input.brand) {
      url.searchParams.set('brand', input.brand);
    }
    if (input.item) {
      url.searchParams.set('item', input.item);
    }
    if (input.userId) {
      url.searchParams.set('uid', input.userId);
    }
    return url.toString();
  }

  async trackAffiliateClick(input: TrackClickInput) {
    const targetUrl = this.normalizeHttpUrl(input.targetUrl);
    const affiliateUrl = this.attachAffiliateParams(input.affiliateUrl ?? targetUrl);
    const commissionCents = this.calculateCommissionCents(input.estimatedPrice);

    await this.prisma.affiliateClick.create({
      data: {
        userId: input.userId ?? null,
        channel: input.channel ?? null,
        itemBrand: input.brand ?? null,
        itemName: input.item ?? null,
        targetUrl,
        affiliateUrl,
        commissionCents,
      },
    });

    return affiliateUrl;
  }

  private attachAffiliateParams(targetUrl: string) {
    const url = new URL(this.normalizeHttpUrl(targetUrl));
    const tag = process.env.AFFILIATE_TAG?.trim();
    if (tag) {
      url.searchParams.set('ref', tag);
    }
    url.searchParams.set('utm_source', 'gothyxan');
    url.searchParams.set('utm_medium', 'affiliate');
    return url.toString();
  }

  private calculateCommissionCents(estimatedPrice?: number) {
    if (!estimatedPrice || estimatedPrice <= 0) {
      return 0;
    }
    return Math.max(0, Math.round(estimatedPrice * this.defaultCommissionRate * 100));
  }

  private normalizeHttpUrl(value: string) {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new BadRequestException('Invalid target url');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException('Only http/https URLs are allowed');
    }

    return parsed.toString();
  }

  private todayStart() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }

  private generateReferralCode() {
    return `GX${randomBytes(4).toString('hex').toUpperCase()}`;
  }
}
