import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ManageFeaturedStyleDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
