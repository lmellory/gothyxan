import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const adminEmail = this.configService.get<string>('admin.email');
    const adminPassword = this.configService.get<string>('admin.password');

    if (!adminEmail || !adminPassword) {
      this.logger.warn('Admin credentials are missing in environment variables.');
      return;
    }

    const existing = await this.prisma.user.findUnique({ where: { email: adminEmail } });

    if (existing) {
      const updateData: {
        role?: Role;
        isEmailVerified?: boolean;
        passwordHash?: string;
      } = {};

      if (existing.role !== Role.ADMIN) {
        updateData.role = Role.ADMIN;
      }

      if (!existing.isEmailVerified) {
        updateData.isEmailVerified = true;
      }

      const validAdminPassword = await bcrypt.compare(adminPassword, existing.passwordHash);
      if (!validAdminPassword) {
        updateData.passwordHash = await bcrypt.hash(adminPassword, 12);
      }

      if (Object.keys(updateData).length > 0) {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: updateData,
        });
        this.logger.log(`Admin account updated for ${adminEmail}`);
      }

      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await this.prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
        isEmailVerified: true,
      },
    });

    this.logger.log(`Admin account ensured for ${adminEmail}`);
  }
}
