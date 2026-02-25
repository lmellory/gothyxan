import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomInt } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { MonetizationService } from '../monetization/monetization.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestResetDto } from './dto/request-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TelegramLoginDto } from './dto/telegram-login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthTokens, SessionMeta } from './auth.types';

@Injectable()
export class AuthService {
  private readonly verificationCodeExpiresMs = 10 * 60 * 1000;
  private readonly passwordResetCodeExpiresMs = 10 * 60 * 1000;
  private readonly maxCodeAttempts = 5;
  private readonly codeResendCooldownMs = 60 * 1000;
  private readonly maxActiveCodes = 3;

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly monetizationService: MonetizationService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    if (existing?.isEmailVerified) {
      throw new ConflictException('User already exists');
    }

    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash, name: dto.name ?? existing.name ?? null, role: Role.USER },
        })
      : await this.usersService.createUser({
          email: dto.email,
          passwordHash,
          name: dto.name,
          role: Role.USER,
          isEmailVerified: false,
        });

    await this.monetizationService.ensureUserMonetizationProfile(user.id);
    if (dto.referralCode) {
      await this.monetizationService.applyReferralCode(user.id, dto.referralCode);
    }

    await this.createAndSendVerificationCode(user.email, user.id);

    return {
      message: 'Verification code sent to email',
      expiresInMinutes: 10,
    };
  }

  async verifyEmail(dto: VerifyEmailDto, sessionMeta: SessionMeta): Promise<AuthTokens> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const verification = await this.prisma.emailVerificationCode.findFirst({
      where: { userId: user.id, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      throw new BadRequestException('Verification code not found');
    }

    if (verification.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Verification code expired');
    }

    if (verification.attempts >= this.maxCodeAttempts) {
      throw new ForbiddenException('Too many attempts');
    }

    const valid = await bcrypt.compare(dto.code, verification.codeHash);
    if (!valid) {
      await this.prisma.emailVerificationCode.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid verification code');
    }

    await this.prisma.emailVerificationCode.update({
      where: { id: verification.id },
      data: { attempts: { increment: 1 }, consumedAt: new Date() },
    });
    await this.usersService.markEmailVerified(user.id);

    return this.issueTokens({ ...user, isEmailVerified: true }, sessionMeta);
  }

  async login(dto: LoginDto, sessionMeta: SessionMeta): Promise<AuthTokens> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new ForbiddenException('Email is not verified');
    }

    return this.issueTokens(user, sessionMeta);
  }

  async refresh(dto: RefreshTokenDto, sessionMeta: SessionMeta): Promise<AuthTokens> {
    const session = await this.validateRefreshToken(dto.refreshToken);
    await this.prisma.refreshToken.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(session.user, sessionMeta);
  }

  async logout(dto: RefreshTokenDto) {
    const [tokenId] = dto.refreshToken.split('.');

    if (!tokenId) {
      return { message: 'Logged out' };
    }

    await this.prisma.refreshToken.updateMany({
      where: { id: tokenId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Logged out' };
  }

  async requestPasswordReset(dto: RequestResetDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      return { message: 'If the account exists, a reset code was sent' };
    }

    await this.createAndSendPasswordResetCode(user.email, user.id);

    return { message: 'If the account exists, a reset code was sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const resetCode = await this.prisma.passwordResetCode.findFirst({
      where: { userId: user.id, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetCode) {
      throw new BadRequestException('Reset code not found');
    }

    if (resetCode.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Reset code expired');
    }

    if (resetCode.attempts >= this.maxCodeAttempts) {
      throw new ForbiddenException('Too many attempts');
    }

    const valid = await bcrypt.compare(dto.code, resetCode.codeHash);
    if (!valid) {
      await this.prisma.passwordResetCode.update({
        where: { id: resetCode.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid reset code');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.passwordResetCode.update({
        where: { id: resetCode.id },
        data: { attempts: { increment: 1 }, consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Password updated successfully' };
  }

  async telegramLogin(dto: TelegramLoginDto, sessionMeta: SessionMeta): Promise<AuthTokens> {
    const configuredBotToken = process.env.TELEGRAM_BOT_TOKEN;
    if (configuredBotToken && dto.botSecret && dto.botSecret !== configuredBotToken) {
      throw new UnauthorizedException('Invalid telegram bot secret');
    }

    const email = `tg_${dto.telegramId}@telegram.local`;
    let user = await this.usersService.findByEmail(email);

    if (!user) {
      const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
      user = await this.usersService.createUser({
        email,
        passwordHash,
        name: dto.username ?? `telegram_${dto.telegramId}`,
        role: Role.USER,
        isEmailVerified: true,
      });
    }

    return this.issueTokens(user, sessionMeta);
  }

  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    };
  }

  private async createAndSendVerificationCode(email: string, userId: string) {
    await this.guardCodeSpam('verification', userId);
    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + this.verificationCodeExpiresMs);

    await this.prisma.$transaction([
      this.prisma.emailVerificationCode.updateMany({
        where: { userId, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.emailVerificationCode.create({
        data: { userId, codeHash, expiresAt },
      }),
    ]);

    await this.mailService.sendEmail({
      to: email,
      subject: 'GOTHYXAN verification code',
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
    });
  }

  private async createAndSendPasswordResetCode(email: string, userId: string) {
    await this.guardCodeSpam('reset', userId);
    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + this.passwordResetCodeExpiresMs);

    await this.prisma.$transaction([
      this.prisma.passwordResetCode.updateMany({
        where: { userId, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.passwordResetCode.create({
        data: { userId, codeHash, expiresAt },
      }),
    ]);

    await this.mailService.sendEmail({
      to: email,
      subject: 'GOTHYXAN reset code',
      text: `Your reset code is ${code}. It expires in 10 minutes.`,
    });
  }

  private generateCode() {
    return randomInt(100_000, 1_000_000).toString();
  }

  private async issueTokens(user: User, sessionMeta: SessionMeta): Promise<AuthTokens> {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessSecret = this.configService.get<string>('auth.jwtAccessSecret');
    const accessExpires = this.configService.get<string>('auth.jwtAccessExpires') ?? '15m';
    const refreshExpires = this.configService.get<string>('auth.jwtRefreshExpires') ?? '30d';

    if (!accessSecret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: Math.floor(this.parseDurationToMs(accessExpires) / 1000),
    });

    const refreshRaw = randomBytes(32).toString('hex');
    const refreshHash = await bcrypt.hash(refreshRaw, 10);
    const refreshExpiresAt = new Date(Date.now() + this.parseDurationToMs(refreshExpires));

    const refreshSession = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        expiresAt: refreshExpiresAt,
        userAgent: sessionMeta.userAgent,
        ipAddress: sessionMeta.ipAddress,
      },
    });

    return {
      accessToken,
      refreshToken: `${refreshSession.id}.${refreshRaw}`,
      tokenType: 'Bearer',
    };
  }

  private async validateRefreshToken(rawToken: string) {
    const [tokenId, tokenSecret] = rawToken.split('.');
    if (!tokenId || !tokenSecret) {
      throw new UnauthorizedException('Invalid refresh token format');
    }

    const session = await this.prisma.refreshToken.findUnique({
      where: { id: tokenId },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const valid = await bcrypt.compare(tokenSecret, session.tokenHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return session;
  }

  private parseDurationToMs(duration: string) {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) {
      return 30 * 24 * 60 * 60 * 1000;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1_000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };

    return value * multipliers[unit];
  }

  private async guardCodeSpam(type: 'verification' | 'reset', userId: string) {
    const now = Date.now();
    const windowStart = new Date(now - this.codeResendCooldownMs);

    if (type === 'verification') {
      const [latest, activeCount] = await Promise.all([
        this.prisma.emailVerificationCode.findFirst({
          where: {
            userId,
            consumedAt: null,
            createdAt: { gte: windowStart },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.emailVerificationCode.count({
          where: {
            userId,
            consumedAt: null,
            expiresAt: { gt: new Date() },
          },
        }),
      ]);

      if (latest || activeCount >= this.maxActiveCodes) {
        throw new ForbiddenException('Please wait before requesting a new verification code');
      }
      return;
    }

    const [latest, activeCount] = await Promise.all([
      this.prisma.passwordResetCode.findFirst({
        where: {
          userId,
          consumedAt: null,
          createdAt: { gte: windowStart },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.passwordResetCode.count({
        where: {
          userId,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    if (latest || activeCount >= this.maxActiveCodes) {
      throw new ForbiddenException('Please wait before requesting a new reset code');
    }
  }
}
