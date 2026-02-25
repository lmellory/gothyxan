import { IsIn, IsObject } from 'class-validator';

export class SaveOutfitDto {
  @IsIn(['WEB', 'MOBILE', 'TELEGRAM'])
  channel!: 'WEB' | 'MOBILE' | 'TELEGRAM';

  @IsObject()
  outfit!: Record<string, unknown>;
}
