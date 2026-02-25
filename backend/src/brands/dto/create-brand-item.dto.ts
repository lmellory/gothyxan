import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

export class CreateBrandItemDto {
  @IsString()
  name!: string;

  @IsString()
  category!: string;

  @IsInt()
  @Min(1)
  estimatedPrice!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  tier?: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  styleTags!: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  occasionTags!: string[];

  @IsUrl({ require_tld: false })
  referenceLink!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
