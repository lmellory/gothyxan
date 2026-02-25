import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { ImageValidationService } from './image-validation.service';
import { MediaUrlService } from './media-url.service';

@Module({
  controllers: [MediaController],
  providers: [ImageValidationService, MediaUrlService],
  exports: [ImageValidationService, MediaUrlService],
})
export class MediaModule {}
