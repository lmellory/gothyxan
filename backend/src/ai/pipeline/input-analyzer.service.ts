import { BadRequestException, Injectable } from '@nestjs/common';
import { BudgetModeInput } from '../../common/enums/budget-mode.enum';
import { GenerateOutfitDto } from '../dto/generate-outfit.dto';
import { NormalizedInput } from '../types/outfit.types';

@Injectable()
export class InputAnalyzerService {
  analyze(input: GenerateOutfitDto): NormalizedInput {
    const styleInput = input.style.trim().toLowerCase();
    if (!styleInput) {
      throw new BadRequestException('Style is required');
    }

    const budgetMode = input.budgetMode ?? BudgetModeInput.CHEAPER;
    if (budgetMode === BudgetModeInput.CUSTOM) {
      if (!input.budgetMin || !input.budgetMax) {
        throw new BadRequestException('Custom budget requires min and max');
      }
      if (input.budgetMin > input.budgetMax) {
        throw new BadRequestException('budgetMin cannot be greater than budgetMax');
      }
      if (input.budgetMax - input.budgetMin < 40) {
        throw new BadRequestException('Custom budget range is too narrow');
      }
      if (input.budgetMax - input.budgetMin > 12_000) {
        throw new BadRequestException('Custom budget range is too wide');
      }
    }

    return {
      styleInput,
      style: styleInput,
      occasion: input.occasion?.trim().toLowerCase() ?? 'casual',
      city: input.city?.trim(),
      latitude: input.latitude,
      longitude: input.longitude,
      budgetMode,
      budgetMin: input.budgetMin,
      budgetMax: input.budgetMax,
      fitPreference: input.fitPreference,
      luxuryOnly: input.luxuryOnly ?? false,
      premiumOnly: input.premiumOnly ?? false,
    };
  }
}
