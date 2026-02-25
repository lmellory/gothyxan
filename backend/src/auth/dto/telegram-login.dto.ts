import { IsOptional, IsString, MinLength } from 'class-validator';

export class TelegramLoginDto {
  @IsString()
  telegramId!: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  botSecret?: string;
}
