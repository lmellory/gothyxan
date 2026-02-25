import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpsertBrandDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(1)
  @Max(3)
  tier!: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  categories!: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  styleTags!: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
