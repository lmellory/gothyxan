import { Injectable } from '@nestjs/common';
import { BudgetModeInput } from '../../common/enums/budget-mode.enum';
import { BudgetDecision, NormalizedInput } from '../types/outfit.types';

@Injectable()
export class BudgetEngineService {
  decide(input: NormalizedInput, stylePreferredTiers: number[]): BudgetDecision {
    if (input.premiumOnly) {
      const min = Math.max(450, input.budgetMin ?? 450);
      const max = Math.max(min + 350, input.budgetMax ?? 6000);
      const tiers = this.intersectTiers(stylePreferredTiers, [2, 3]);
      return {
        mode: BudgetModeInput.PREMIUM,
        min,
        max,
        tiers,
        budgetLabel: `$${min}-$${max}`,
        preference: 'premium',
      };
    }

    if (input.luxuryOnly) {
      const min = Math.max(900, input.budgetMin ?? 900);
      const max = Math.max(min + 300, input.budgetMax ?? 9000);
      const tiers = this.intersectTiers(stylePreferredTiers, [3]);
      return {
        mode: BudgetModeInput.PREMIUM,
        min,
        max,
        tiers,
        budgetLabel: `$${min}-$${max}`,
        preference: 'premium',
      };
    }

    if (input.budgetMode === BudgetModeInput.CUSTOM) {
      const min = input.budgetMin ?? 100;
      const max = input.budgetMax ?? 1000;
      const tiers = this.intersectTiers(stylePreferredTiers, this.resolveTiersByRange(min, max));

      return {
        mode: BudgetModeInput.CUSTOM,
        min,
        max,
        tiers,
        budgetLabel: `$${min}-$${max}`,
        preference: 'balanced',
      };
    }

    if (input.budgetMode === BudgetModeInput.PREMIUM) {
      const tiers = this.intersectTiers(stylePreferredTiers, [2, 3]);
      return {
        mode: BudgetModeInput.PREMIUM,
        min: 700,
        max: 8000,
        tiers,
        budgetLabel: '$700-$8000',
        preference: 'premium',
      };
    }

    const tiers = this.intersectTiers(stylePreferredTiers, [1]);
    return {
      mode: BudgetModeInput.CHEAPER,
      min: 80,
      max: 700,
      tiers,
      budgetLabel: '$80-$700',
      preference: 'cheaper',
    };
  }

  private resolveTiersByRange(min: number, max: number) {
    if (max <= 450) {
      return [1];
    }
    if (max <= 1500) {
      return [1, 2];
    }
    if (min >= 700) {
      return [2, 3];
    }
    return [1, 2, 3];
  }

  private intersectTiers(styleTiers: number[], budgetTiers: number[]) {
    const intersection = styleTiers.filter((tier) => budgetTiers.includes(tier));
    return intersection.length ? intersection : budgetTiers;
  }
}
