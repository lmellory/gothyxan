import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GenerateOutfitDto } from '../ai/dto/generate-outfit.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { OutfitFeedbackDto } from './dto/outfit-feedback.dto';
import { SaveOutfitDto } from './dto/save-outfit.dto';
import { OutfitsService } from './outfits.service';

@Controller('outfits')
export class OutfitsController {
  constructor(private readonly outfitsService: OutfitsService) {}

  @Throttle({ generate: { limit: 8, ttl: 60_000 } })
  @Post('generate')
  generate(@CurrentUser() user: JwtPayload, @Body() dto: GenerateOutfitDto) {
    return this.outfitsService.generate(user.sub, dto);
  }

  @Throttle({ generate: { limit: 6, ttl: 60_000 } })
  @Post('regenerate')
  regenerate(@CurrentUser() user: JwtPayload, @Body() dto: GenerateOutfitDto) {
    return this.outfitsService.regenerate(user.sub, dto);
  }

  @Get('history')
  history(@CurrentUser() user: JwtPayload) {
    return this.outfitsService.getHistory(user.sub);
  }

  @Post('save')
  save(@CurrentUser() user: JwtPayload, @Body() dto: SaveOutfitDto) {
    return this.outfitsService.saveOutfit(user.sub, dto);
  }

  @Post('feedback')
  feedback(@CurrentUser() user: JwtPayload, @Body() dto: OutfitFeedbackDto) {
    return this.outfitsService.recordFeedback(user.sub, dto);
  }

  @Get('saved')
  saved(@CurrentUser() user: JwtPayload) {
    return this.outfitsService.getSaved(user.sub);
  }

  @Get('style-profile')
  styleProfile(@CurrentUser() user: JwtPayload) {
    return this.outfitsService.getStyleProfile(user.sub);
  }
}
