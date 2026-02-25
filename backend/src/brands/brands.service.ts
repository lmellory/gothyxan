import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateBrandItemDto } from './dto/create-brand-item.dto';
import { UpdateBrandItemDto } from './dto/update-brand-item.dto';
import { UpsertBrandDto } from './dto/upsert-brand.dto';

type ItemFilterInput = {
  style?: string;
  occasion?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  tiers?: number[];
};

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  listPublicBrands() {
    return this.prisma.brand.findMany({
      where: { isActive: true },
      orderBy: [{ tier: 'asc' }, { name: 'asc' }],
      include: {
        items: {
          where: { isActive: true },
          orderBy: { estimatedPrice: 'asc' },
        },
      },
    });
  }

  listAllBrands() {
    return this.prisma.brand.findMany({
      orderBy: [{ tier: 'asc' }, { name: 'asc' }],
      include: {
        items: {
          orderBy: { estimatedPrice: 'asc' },
        },
      },
    });
  }

  listFeaturedStyles() {
    return this.prisma.featuredStyle.findMany({
      where: { isFeatured: true },
      orderBy: { name: 'asc' },
    });
  }

  async createBrand(dto: UpsertBrandDto) {
    return this.prisma.brand.create({
      data: {
        name: dto.name,
        tier: dto.tier,
        categories: dto.categories,
        styleTags: dto.styleTags,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateBrand(id: string, dto: Partial<UpsertBrandDto>) {
    await this.ensureBrandExists(id);
    return this.prisma.brand.update({
      where: { id },
      data: {
        name: dto.name,
        tier: dto.tier,
        categories: dto.categories,
        styleTags: dto.styleTags,
        isActive: dto.isActive,
      },
    });
  }

  async deleteBrand(id: string) {
    await this.ensureBrandExists(id);
    return this.prisma.brand.delete({ where: { id } });
  }

  async addBrandItem(brandId: string, dto: CreateBrandItemDto) {
    const brand = await this.ensureBrandExists(brandId);

    return this.prisma.brandItem.create({
      data: {
        brandId,
        name: dto.name,
        category: dto.category,
        estimatedPrice: dto.estimatedPrice,
        tier: dto.tier ?? brand.tier,
        styleTags: dto.styleTags,
        occasionTags: dto.occasionTags,
        referenceLink: dto.referenceLink,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateBrandItem(itemId: string, dto: UpdateBrandItemDto) {
    const existing = await this.prisma.brandItem.findUnique({ where: { id: itemId } });
    if (!existing) {
      throw new NotFoundException('Brand item not found');
    }

    return this.prisma.brandItem.update({
      where: { id: itemId },
      data: {
        name: dto.name,
        category: dto.category,
        estimatedPrice: dto.estimatedPrice,
        tier: dto.tier,
        styleTags: dto.styleTags,
        occasionTags: dto.occasionTags,
        referenceLink: dto.referenceLink,
        isActive: dto.isActive,
      },
    });
  }

  async deleteBrandItem(itemId: string) {
    const existing = await this.prisma.brandItem.findUnique({ where: { id: itemId } });
    if (!existing) {
      throw new NotFoundException('Brand item not found');
    }

    return this.prisma.brandItem.delete({ where: { id: itemId } });
  }

  async findItemsForOutfit(filters: ItemFilterInput) {
    const where: Prisma.BrandItemWhereInput = {
      isActive: true,
      brand: { isActive: true },
    };

    if (filters.style) {
      where.OR = [{ styleTags: { has: filters.style } }, { brand: { styleTags: { has: filters.style } } }];
    }

    if (filters.occasion) {
      where.occasionTags = { has: filters.occasion };
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.tiers?.length) {
      where.tier = { in: filters.tiers };
    }

    if (filters.minPrice || filters.maxPrice) {
      where.estimatedPrice = {
        gte: filters.minPrice,
        lte: filters.maxPrice,
      };
    }

    return this.prisma.brandItem.findMany({
      where,
      include: { brand: true },
      orderBy: [{ tier: 'asc' }, { estimatedPrice: 'asc' }],
    });
  }

  private async ensureBrandExists(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    return brand;
  }
}
