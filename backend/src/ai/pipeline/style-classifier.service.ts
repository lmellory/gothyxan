import { Injectable } from '@nestjs/common';
import { normalizeStyleName } from '../constants/style-map';

@Injectable()
export class StyleClassifierService {
  classify(styleInput: string) {
    const profile = normalizeStyleName(styleInput);
    return {
      style: profile.canonical,
      preferredTiers: profile.preferredTiers,
      paletteHint: profile.paletteHint,
    };
  }
}
