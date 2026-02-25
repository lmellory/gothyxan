import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BrandsService } from '../brands/brands.service';
import { MediaUrlService } from '../media/media-url.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { CreateBrandItemDto } from '../brands/dto/create-brand-item.dto';
import { UpdateBrandItemDto } from '../brands/dto/update-brand-item.dto';
import { UpsertBrandDto } from '../brands/dto/upsert-brand.dto';
import { ManageFeaturedStyleDto } from './dto/manage-featured-style.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brandsService: BrandsService,
    private readonly mediaUrlService: MediaUrlService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getAnalytics() {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      usersTotal,
      verifiedUsers,
      generationsTotal,
      activeBrands,
      avgOutfitPrice,
      topStyles,
      generationsLast24h,
      generationsLast7d,
      activeUsers7d,
      budgetModeBreakdown,
      channelBreakdown,
      trendingStyles7d,
      lastLogs,
    ] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isEmailVerified: true } }),
        this.prisma.outfitGenerationLog.count(),
        this.prisma.brand.count({ where: { isActive: true } }),
        this.prisma.outfitGenerationLog.aggregate({
          _avg: { totalPrice: true },
        }),
        this.prisma.outfitGenerationLog.groupBy({
          by: ['style'],
          _count: { style: true },
          orderBy: {
            _count: {
              style: 'desc',
            },
          },
          take: 8,
        }),
        this.prisma.outfitGenerationLog.count({
          where: { createdAt: { gte: last24Hours } },
        }),
        this.prisma.outfitGenerationLog.count({
          where: { createdAt: { gte: last7Days } },
        }),
        this.prisma.outfitGenerationLog.findMany({
          where: { createdAt: { gte: last7Days } },
          select: { userId: true },
        }),
        this.prisma.outfitGenerationLog.groupBy({
          by: ['budgetMode'],
          _count: { budgetMode: true },
          orderBy: {
            _count: {
              budgetMode: 'desc',
            },
          },
        }),
        this.prisma.savedOutfit.groupBy({
          by: ['channel'],
          _count: { channel: true },
          orderBy: {
            _count: {
              channel: 'desc',
            },
          },
        }),
        this.prisma.outfitGenerationLog.groupBy({
          by: ['style'],
          _count: { style: true },
          where: { createdAt: { gte: last7Days } },
          orderBy: {
            _count: {
              style: 'desc',
            },
          },
          take: 8,
        }),
        this.prisma.outfitGenerationLog.findMany({
          where: { createdAt: { gte: last7Days } },
          select: { outputJson: true },
          orderBy: { createdAt: 'desc' },
          take: 600,
        }),
      ]);

    const activeUsers7dCount = new Set(activeUsers7d.map((item) => item.userId)).size;
    const topBrands7d = this.extractTopBrands(lastLogs.map((log) => log.outputJson));
    const imageDelivery = await this.mediaUrlService.getImageSuccessRate();

    return {
      usersTotal,
      verifiedUsers,
      generationsTotal,
      activeBrands,
      avgOutfitPrice: Math.round(avgOutfitPrice._avg.totalPrice ?? 0),
      topStyles,
      generationsLast24h,
      generationsLast7d,
      activeUsers7d: activeUsers7dCount,
      budgetModeBreakdown,
      channelBreakdown,
      trendingStyles7d,
      topBrands7d,
      imageSuccessRate: imageDelivery.successRate,
    };
  }

  async getGenerationLogs(limit = 100) {
    return this.prisma.outfitGenerationLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      take: limit,
    });
  }

  async getSystemHealth() {
    let database = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }

    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const generationLast24h = await this.prisma.outfitGenerationLog.count({
      where: { createdAt: { gte: last24Hours } },
    });

    return {
      status: database === 'ok' ? 'healthy' : 'degraded',
      database,
      uptimeSeconds: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      generationLast24h,
      timestamp: now.toISOString(),
    };
  }

  listBrands() {
    return this.brandsService.listAllBrands();
  }

  async createBrand(dto: UpsertBrandDto, actor?: { userId?: string; ip?: string; userAgent?: string }) {
    const brand = await this.brandsService.createBrand(dto);
    await this.auditLogService.log({
      actorUserId: actor?.userId,
      action: 'brand.create',
      entityType: 'Brand',
      entityId: brand.id,
      payload: dto,
      ipAddress: actor?.ip,
      userAgent: actor?.userAgent,
    });
    return brand;
  }

  async updateBrand(id: string, dto: Partial<UpsertBrandDto>, actor?: { userId?: string; ip?: string; userAgent?: string }) {
    const brand = await this.brandsService.updateBrand(id, dto);
    await this.auditLogService.log({
      actorUserId: actor?.userId,
      action: 'brand.update',
      entityType: 'Brand',
      entityId: id,
      payload: dto,
      ipAddress: actor?.ip,
      userAgent: actor?.userAgent,
    });
    return brand;
  }

  async deleteBrand(id: string, actor?: { userId?: string; ip?: string; userAgent?: string }) {
    const deleted = await this.brandsService.deleteBrand(id);
    await this.auditLogService.log({
      actorUserId: actor?.userId,
      action: 'brand.delete',
      entityType: 'Brand',
      entityId: id,
      payload: { id },
      ipAddress: actor?.ip,
      userAgent: actor?.userAgent,
    });
    return deleted;
  }

  async addBrandItem(brandId: string, dto: CreateBrandItemDto, actor?: { userId?: string; ip?: string; userAgent?: string }) {
    const item = await this.brandsService.addBrandItem(brandId, dto);
    await this.auditLogService.log({
      actorUserId: actor?.userId,
      action: 'brand-item.create',
      entityType: 'BrandItem',
      entityId: item.id,
      payload: dto,
      ipAddress: actor?.ip,
      userAgent: actor?.userAgent,
    });
    return item;
  }

  async updateBrandItem(itemId: string, dto: UpdateBrandItemDto, actor?: { userId?: string; ip?: string; userAgent?: string }) {
    const item = await this.brandsService.updateBrandItem(itemId, dto);
    await this.auditLogService.log({
      actorUserId: actor?.userId,
      action: 'brand-item.update',
      entityType: 'BrandItem',
      entityId: itemId,
      payload: dto,
      ipAddress: actor?.ip,
      userAgent: actor?.userAgent,
    });
    return item;
  }

  async deleteBrandItem(itemId: string, actor?: { userId?: string; ip?: string; userAgent?: string }) {
    const deleted = await this.brandsService.deleteBrandItem(itemId);
    await this.auditLogService.log({
      actorUserId: actor?.userId,
      action: 'brand-item.delete',
      entityType: 'BrandItem',
      entityId: itemId,
      payload: { itemId },
      ipAddress: actor?.ip,
      userAgent: actor?.userAgent,
    });
    return deleted;
  }

  listFeaturedStyles() {
    return this.prisma.featuredStyle.findMany({ orderBy: { name: 'asc' } });
  }

  async createFeaturedStyle(dto: ManageFeaturedStyleDto, actor?: { userId?: string; ip?: string; userAgent?: string }) {
    const created = await this.prisma.featuredStyle.create({
      data: {
        name: dto.name.toLowerCase(),
        description: dto.description,
        isFeatured: dto.isFeatured ?? true,
      },
    });
    await this.auditLogService.log({
      actorUserId: actor?.userId,
      action: 'featured-style.create',
      entityType: 'FeaturedStyle',
      entityId: created.id,
      payload: dto,
      ipAddress: actor?.ip,
      userAgent: actor?.userAgent,
    });
    return created;
  }

  async updateFeaturedStyle(id: string, dto: Partial<ManageFeaturedStyleDto>, actor?: { userId?: string; ip?: string; userAgent?: string }) {
    const updated = await this.prisma.featuredStyle.update({
      where: { id },
      data: {
        name: dto.name?.toLowerCase(),
        description: dto.description,
        isFeatured: dto.isFeatured,
      },
    });
    await this.auditLogService.log({
      actorUserId: actor?.userId,
      action: 'featured-style.update',
      entityType: 'FeaturedStyle',
      entityId: id,
      payload: dto,
      ipAddress: actor?.ip,
      userAgent: actor?.userAgent,
    });
    return updated;
  }

  async deleteFeaturedStyle(id: string, actor?: { userId?: string; ip?: string; userAgent?: string }) {
    const deleted = await this.prisma.featuredStyle.delete({ where: { id } });
    await this.auditLogService.log({
      actorUserId: actor?.userId,
      action: 'featured-style.delete',
      entityType: 'FeaturedStyle',
      entityId: id,
      payload: { id },
      ipAddress: actor?.ip,
      userAgent: actor?.userAgent,
    });
    return deleted;
  }

  private extractTopBrands(outputs: unknown[]) {
    const counts = new Map<string, number>();

    for (const output of outputs) {
      if (!output || typeof output !== 'object') {
        continue;
      }
      const data = output as {
        top?: { brand?: string };
        bottom?: { brand?: string };
        shoes?: { brand?: string };
        outerwear?: { brand?: string };
        accessories?: Array<{ brand?: string }>;
      };

      const brands = [
        data.top?.brand,
        data.bottom?.brand,
        data.shoes?.brand,
        data.outerwear?.brand,
        ...(data.accessories ?? []).map((item) => item.brand),
      ]
        .filter((brand): brand is string => Boolean(brand))
        .map((brand) => brand.trim());

      for (const brand of brands) {
        counts.set(brand, (counts.get(brand) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([brand, count]) => ({ brand, count }));
  }
}
