import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { OutfitsModule } from '../outfits/outfits.module';
import { HealthController } from './health.controller';

@Module({
  imports: [MediaModule, OutfitsModule],
  controllers: [HealthController],
})
export class HealthModule {}
