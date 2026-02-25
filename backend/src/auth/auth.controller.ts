import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestResetDto } from './dto/request-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TelegramLoginDto } from './dto/telegram-login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ auth: { limit: 4, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ auth: { limit: 6, ttl: 60_000 } })
  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.verifyEmail(dto, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    this.setRefreshCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Public()
  @Throttle({ auth: { limit: 6, ttl: 60_000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(dto, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    this.setRefreshCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Public()
  @Throttle({ auth: { limit: 8, ttl: 60_000 } })
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.refresh(dto, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    this.setRefreshCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Post('logout')
  async logout(@Body() dto: RefreshTokenDto, @Res({ passthrough: true }) res: Response) {
    this.clearRefreshCookie(res);
    return this.authService.logout(dto);
  }

  @Public()
  @Throttle({ auth: { limit: 4, ttl: 60_000 } })
  @Post('password/request-reset')
  requestReset(@Body() dto: RequestResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Public()
  @Throttle({ auth: { limit: 6, ttl: 60_000 } })
  @Post('password/reset')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Throttle({ auth: { limit: 12, ttl: 60_000 } })
  @Post('telegram/login')
  async telegramLogin(@Body() dto: TelegramLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.telegramLogin(dto, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    this.setRefreshCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    const enabled = (process.env.AUTH_REFRESH_COOKIE_ENABLED ?? 'false') === 'true';
    if (!enabled) {
      return;
    }

    const secure = (process.env.AUTH_COOKIE_SECURE ?? 'true') === 'true';
    const sameSite = (process.env.AUTH_COOKIE_SAMESITE ?? 'strict') as 'strict' | 'lax' | 'none';
    const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim();
    const maxAgeMs = Number(process.env.AUTH_COOKIE_MAX_AGE_MS ?? `${30 * 24 * 60 * 60 * 1000}`);

    res.cookie('gx_refresh', refreshToken, {
      httpOnly: true,
      secure,
      sameSite,
      domain: cookieDomain || undefined,
      path: '/api/auth',
      maxAge: maxAgeMs,
    });
  }

  private clearRefreshCookie(res: Response) {
    const secure = (process.env.AUTH_COOKIE_SECURE ?? 'true') === 'true';
    const sameSite = (process.env.AUTH_COOKIE_SAMESITE ?? 'strict') as 'strict' | 'lax' | 'none';
    const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim();
    res.clearCookie('gx_refresh', {
      httpOnly: true,
      secure,
      sameSite,
      domain: cookieDomain || undefined,
      path: '/api/auth',
    });
  }
}
