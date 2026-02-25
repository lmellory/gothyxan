import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { BrandsService } from './brands.service';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Public()
  @Get()
  getBrands() {
    return this.brandsService.listPublicBrands();
  }

  @Public()
  @Get('featured-styles')
  getFeaturedStyles() {
    return this.brandsService.listFeaturedStyles();
  }

  @Public()
  @Get('items')
  getItems(
    @Query('style') style?: string,
    @Query('occasion') occasion?: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('tiers') tiers?: string,
  ) {
    return this.brandsService.findItemsForOutfit({
      style,
      occasion,
      category,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      tiers: tiers ? tiers.split(',').map(Number).filter(Boolean) : undefined,
    });
  }
}
