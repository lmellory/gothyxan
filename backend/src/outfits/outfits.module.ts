import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AiModule } from '../ai/ai.module';
import { MonetizationModule } from '../monetization/monetization.module';
import { OutfitsController } from './outfits.controller';
import { AdaptivePersonalizationService } from './adaptive-personalization.service';
import { OutfitsGateway } from './outfits.gateway';
import { OutfitsService } from './outfits.service';
import { OutfitQueueService } from './queue/outfit-queue.service';
import { StyleProfileService } from './style-profile.service';

@Module({
  imports: [AiModule, MonetizationModule, JwtModule.register({})],
  controllers: [OutfitsController],
  providers: [
    OutfitsService,
    OutfitsGateway,
    StyleProfileService,
    OutfitQueueService,
    AdaptivePersonalizationService,
  ],
  exports: [OutfitQueueService],
})
export class OutfitsModule {}
