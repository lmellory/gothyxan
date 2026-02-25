import { Module } from '@nestjs/common';
import { BrandsModule } from '../brands/brands.module';
import { AdminRouteSecretGuard } from '../common/guards/admin-route-secret.guard';
import { AuditLogService } from '../common/services/audit-log.service';
import { MediaModule } from '../media/media.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [BrandsModule, MediaModule],
  controllers: [AdminController],
  providers: [AdminService, AuditLogService, AdminRouteSecretGuard],
})
export class AdminModule {}
