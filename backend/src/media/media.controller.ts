import { BadRequestException, Controller, Get, HttpException, HttpStatus, Query, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import axios from 'axios';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import path from 'node:path';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { verifyMediaSignature } from './media-signature.util';

@Controller('media')
export class MediaController {
  @Public()
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @Get('proxy')
  async proxyImage(
    @Query('url') rawUrl: string | undefined,
    @Query('variant') variant: string | undefined,
    @Query('exp') exp: string | undefined,
    @Query('sig') sig: string | undefined,
    @Res() res: Response,
  ) {
    if (!rawUrl || !rawUrl.trim()) {
      throw new BadRequestException('url query is required');
    }

    const normalizedVariant = this.normalizeVariant(variant);
    this.verifySignedRequest(rawUrl.trim(), normalizedVariant, exp, sig);
    const targetUrl = await this.normalizeAndValidateUrl(rawUrl.trim());

    try {
      const response = await axios.get<ArrayBuffer>(targetUrl, {
        responseType: 'arraybuffer',
        timeout: 7000,
        maxRedirects: 5,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        validateStatus: (status) => status >= 200 && status < 400,
      });

      const contentType = response.headers['content-type'] ?? 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400');
      res.setHeader('CDN-Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(Buffer.from(response.data));
    } catch {
      throw new HttpException('Could not load remote image', HttpStatus.BAD_GATEWAY);
    }
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get('local')
  async localImage(
    @Query('file') file: string | undefined,
    @Res() res: Response,
  ) {
    if (!file || !file.trim()) {
      throw new BadRequestException('file query is required');
    }

    const mediaRoot = this.resolveLocalMediaRoot();
    if (!mediaRoot) {
      throw new HttpException('Local media root not configured', HttpStatus.NOT_FOUND);
    }

    const decoded = decodeURIComponent(file.trim()).replace(/\\/g, '/');
    if (!decoded || decoded.includes('..') || decoded.startsWith('/')) {
      throw new BadRequestException('Invalid file path');
    }

    const fullPath = path.resolve(mediaRoot, decoded);
    if (!fullPath.startsWith(mediaRoot)) {
      throw new BadRequestException('Invalid file path');
    }
    if (!existsSync(fullPath)) {
      throw new HttpException('Local media file not found', HttpStatus.NOT_FOUND);
    }

    try {
      const fileStat = await stat(fullPath);
      res.setHeader('Content-Type', this.detectMimeType(fullPath));
      res.setHeader('Content-Length', String(fileStat.size));
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('CDN-Cache-Control', 'public, s-maxage=31536000, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return createReadStream(fullPath).pipe(res);
    } catch {
      throw new HttpException('Could not read local media file', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Public()
  @Get('placeholder')
  placeholder(@Query('variant') variant: string | undefined, @Res() res: Response) {
    const normalizedVariant = this.normalizeVariant(variant);
    const size =
      normalizedVariant === 'thumbnail'
        ? { width: 420, height: 420 }
        : normalizedVariant === 'medium'
          ? { width: 720, height: 960 }
          : { width: 1280, height: 1600 };

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#111827" />
      <stop offset="100%" stop-color="#1f2937" />
    </linearGradient>
  </defs>
  <rect width="${size.width}" height="${size.height}" fill="url(#bg)" />
  <rect x="24" y="24" width="${size.width - 48}" height="${size.height - 48}" rx="28" fill="#0f172a" stroke="#334155" />
  <text x="56" y="${Math.floor(size.height * 0.52)}" font-family="Arial, sans-serif" font-size="32" fill="#93c5fd">GOTHYXAN IMAGE FALLBACK</text>
</svg>`;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=604800');
    return res.send(svg);
  }

  private async normalizeAndValidateUrl(rawUrl: string) {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException('Invalid url');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException('Only http/https URLs are allowed');
    }

    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local')) {
      throw new BadRequestException('Blocked host');
    }

    if (this.isPrivateHost(host)) {
      throw new BadRequestException('Blocked host');
    }

    if (!isIP(host)) {
      try {
        const resolved = await lookup(host, { all: true });
        if (resolved.some((entry) => this.isPrivateHost(entry.address))) {
          throw new BadRequestException('Blocked host');
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException('Host lookup failed');
      }
    }

    return parsed.toString();
  }

  private isPrivateHost(hostname: string) {
    const ipType = isIP(hostname);
    if (ipType === 4) {
      return this.isPrivateIpv4(hostname);
    }
    if (ipType === 6) {
      return this.isPrivateIpv6(hostname);
    }
    return false;
  }

  private isPrivateIpv4(address: string) {
    const octets = address.split('.').map((part) => Number(part));
    if (octets.length !== 4 || octets.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
      return true;
    }

    const [a, b] = octets;
    if (a === 10 || a === 127 || a === 0) {
      return true;
    }
    if (a === 169 && b === 254) {
      return true;
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return true;
    }
    if (a === 192 && b === 168) {
      return true;
    }
    if (a === 100 && b >= 64 && b <= 127) {
      return true;
    }
    return false;
  }

  private isPrivateIpv6(address: string) {
    const normalized = address.toLowerCase();
    return (
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80')
    );
  }

  private normalizeVariant(rawVariant: string | undefined) {
    const value = (rawVariant ?? 'medium').trim().toLowerCase();
    if (value === 'thumbnail' || value === 'medium' || value === 'high_res') {
      return value;
    }
    return 'medium';
  }

  private verifySignedRequest(url: string, variant: string, exp: string | undefined, sig: string | undefined) {
    const signingSecret = process.env.MEDIA_SIGNING_SECRET?.trim();
    if (!signingSecret) {
      return;
    }
    if (!exp || !sig) {
      throw new BadRequestException('Signed media URL is required');
    }
    const expTs = Number(exp);
    if (!Number.isFinite(expTs) || expTs <= Math.floor(Date.now() / 1000)) {
      throw new BadRequestException('Signed URL expired');
    }
    const valid = verifyMediaSignature(signingSecret, url, variant, exp, sig);
    if (!valid) {
      throw new BadRequestException('Invalid media signature');
    }
  }

  private resolveLocalMediaRoot() {
    const explicit = process.env.LOCAL_CATALOG_MEDIA_ROOT?.trim();
    const candidates = [
      explicit,
      path.resolve(process.cwd(), 'PACK_ALL_CLOTHES'),
      path.resolve(process.cwd(), '../PACK_ALL_CLOTHES'),
    ].filter((value): value is string => Boolean(value));

    const found = candidates.find((candidate) => existsSync(candidate));
    return found ? path.resolve(found) : null;
  }

  private detectMimeType(filePath: string) {
    const extension = path.extname(filePath).toLowerCase();
    if (extension === '.webp') {
      return 'image/webp';
    }
    if (extension === '.png') {
      return 'image/png';
    }
    if (extension === '.avif') {
      return 'image/avif';
    }
    if (extension === '.svg') {
      return 'image/svg+xml';
    }
    if (extension === '.gif') {
      return 'image/gif';
    }
    return 'image/jpeg';
  }
}
