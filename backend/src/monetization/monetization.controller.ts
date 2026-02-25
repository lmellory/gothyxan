import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { MonetizationService } from './monetization.service';

@Controller('monetization')
export class MonetizationController {
  constructor(private readonly monetizationService: MonetizationService) {}

  @Get('subscription')
  subscription(@CurrentUser() user: JwtPayload) {
    return this.monetizationService.getSubscription(user.sub);
  }

  @Post('subscription/activate-premium')
  activatePremium(@CurrentUser() user: JwtPayload) {
    return this.monetizationService.activatePremium(user.sub);
  }

  @Get('referral')
  referralSummary(@CurrentUser() user: JwtPayload) {
    return this.monetizationService.getReferralSummary(user.sub);
  }

  @Post('referral/apply')
  applyReferral(@CurrentUser() user: JwtPayload, @Body() body: { code?: string }) {
    return this.monetizationService.applyReferralCode(user.sub, body.code ?? '');
  }

  @Public()
  @Get('affiliate/redirect')
  async redirectAffiliate(
    @Query('target') target: string | undefined,
    @Query('uid') uid: string | undefined,
    @Query('brand') brand: string | undefined,
    @Query('item') item: string | undefined,
    @Query('price') price: string | undefined,
    @Res() res: Response,
  ) {
    const affiliateUrl = await this.monetizationService.trackAffiliateClick({
      userId: uid,
      targetUrl: target ?? '',
      brand,
      item,
      estimatedPrice: price ? Number(price) : undefined,
    });

    return res.redirect(302, affiliateUrl);
  }
}

