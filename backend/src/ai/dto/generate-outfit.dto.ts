import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { BudgetModeInput } from '../../common/enums/budget-mode.enum';

export class GenerateOutfitDto {
  @IsString()
  @MaxLength(80)
  style!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  occasion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsIn([BudgetModeInput.CHEAPER, BudgetModeInput.PREMIUM, BudgetModeInput.CUSTOM])
  budgetMode?: BudgetModeInput;

  @ValidateIf((obj: GenerateOutfitDto) => obj.budgetMode === BudgetModeInput.CUSTOM)
  @IsNumber()
  @Min(30)
  @Max(10_000)
  budgetMin?: number;

  @ValidateIf((obj: GenerateOutfitDto) => obj.budgetMode === BudgetModeInput.CUSTOM)
  @IsNumber()
  @Min(50)
  @Max(15_000)
  budgetMax?: number;

  @IsOptional()
  @IsString()
  @IsIn(['oversize', 'fitted', 'relaxed'])
  fitPreference?: 'oversize' | 'fitted' | 'relaxed';

  @IsOptional()
  @IsBoolean()
  luxuryOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  premiumOnly?: boolean;
}
