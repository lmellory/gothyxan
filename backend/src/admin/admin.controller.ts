import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AdminRouteSecretGuard } from '../common/guards/admin-route-secret.guard';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { CreateBrandItemDto } from '../brands/dto/create-brand-item.dto';
import { UpdateBrandDto } from '../brands/dto/update-brand.dto';
import { UpdateBrandItemDto } from '../brands/dto/update-brand-item.dto';
import { UpsertBrandDto } from '../brands/dto/upsert-brand.dto';
import { AdminService } from './admin.service';
import { ManageFeaturedStyleDto } from './dto/manage-featured-style.dto';
import { UpdateFeaturedStyleDto } from './dto/update-featured-style.dto';

@Roles(Role.ADMIN)
@UseGuards(AdminRouteSecretGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('analytics')
  analytics() {
    return this.adminService.getAnalytics();
  }

  @Get('logs')
  logs(@Query('limit') limit?: string) {
    return this.adminService.getGenerationLogs(limit ? Number(limit) : undefined);
  }

  @Get('system-health')
  systemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('brands')
  brands() {
    return this.adminService.listBrands();
  }

  @Post('brands')
  createBrand(@CurrentUser() user: JwtPayload, @Req() req: Request, @Body() dto: UpsertBrandDto) {
    return this.adminService.createBrand(dto, {
      userId: user.sub,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch('brands/:id')
  updateBrand(@CurrentUser() user: JwtPayload, @Req() req: Request, @Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.adminService.updateBrand(id, dto, {
      userId: user.sub,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Delete('brands/:id')
  deleteBrand(@CurrentUser() user: JwtPayload, @Req() req: Request, @Param('id') id: string) {
    return this.adminService.deleteBrand(id, {
      userId: user.sub,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('brands/:id/items')
  createBrandItem(@CurrentUser() user: JwtPayload, @Req() req: Request, @Param('id') id: string, @Body() dto: CreateBrandItemDto) {
    return this.adminService.addBrandItem(id, dto, {
      userId: user.sub,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch('brand-items/:itemId')
  updateBrandItem(@CurrentUser() user: JwtPayload, @Req() req: Request, @Param('itemId') itemId: string, @Body() dto: UpdateBrandItemDto) {
    return this.adminService.updateBrandItem(itemId, dto, {
      userId: user.sub,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Delete('brand-items/:itemId')
  deleteBrandItem(@CurrentUser() user: JwtPayload, @Req() req: Request, @Param('itemId') itemId: string) {
    return this.adminService.deleteBrandItem(itemId, {
      userId: user.sub,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('featured-styles')
  featuredStyles() {
    return this.adminService.listFeaturedStyles();
  }

  @Post('featured-styles')
  createFeaturedStyle(@CurrentUser() user: JwtPayload, @Req() req: Request, @Body() dto: ManageFeaturedStyleDto) {
    return this.adminService.createFeaturedStyle(dto, {
      userId: user.sub,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch('featured-styles/:id')
  updateFeaturedStyle(@CurrentUser() user: JwtPayload, @Req() req: Request, @Param('id') id: string, @Body() dto: UpdateFeaturedStyleDto) {
    return this.adminService.updateFeaturedStyle(id, dto, {
      userId: user.sub,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Delete('featured-styles/:id')
  deleteFeaturedStyle(@CurrentUser() user: JwtPayload, @Req() req: Request, @Param('id') id: string) {
    return this.adminService.deleteFeaturedStyle(id, {
      userId: user.sub,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
