import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { BudgetModeInput } from '../../common/enums/budget-mode.enum';

export class OutfitFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  style?: string;

  @IsOptional()
  @IsIn([BudgetModeInput.CHEAPER, BudgetModeInput.PREMIUM, BudgetModeInput.CUSTOM])
  budgetMode?: BudgetModeInput;

  @IsOptional()
  @IsBoolean()
  saved?: boolean;

  @IsOptional()
  @IsBoolean()
  regenerated?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  note?: string;

  @IsOptional()
  @IsObject()
  outfit?: Record<string, unknown>;
}
