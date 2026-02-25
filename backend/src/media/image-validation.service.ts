import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../database/prisma.service';

type ValidationResult = {
  success: boolean;
  finalUrl: string;
  statusCode?: number;
  reason?: string;
  latencyMs?: number;
};

@Injectable()
export class ImageValidationService {
  private readonly logger = new Logger(ImageValidationService.name);
  private readonly timeoutMs = 4_000;
  private readonly retries = 2;

  constructor(private readonly prisma: PrismaService) {}

  async validateWithRetry(url: string): Promise<ValidationResult> {
    let lastFailure: ValidationResult = {
      success: false,
      finalUrl: url,
      reason: 'unknown',
    };

    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      const startedAt = Date.now();
      try {
        const response = await axios.head(url, {
          timeout: this.timeoutMs,
          maxRedirects: 4,
          validateStatus: (status) => status >= 200 && status < 400,
        });

        const contentType = response.headers['content-type'] ?? '';
        const latencyMs = Date.now() - startedAt;
        if (!contentType.startsWith('image/')) {
          lastFailure = {
            success: false,
            finalUrl: url,
            statusCode: response.status,
            reason: `Non-image content-type: ${contentType}`,
            latencyMs,
          };
          continue;
        }

        const success: ValidationResult = {
          success: true,
          finalUrl: url,
          statusCode: response.status,
          latencyMs,
        };
        await this.logResult(success);
        return success;
      } catch (error) {
        lastFailure = {
          success: false,
          finalUrl: url,
          reason: error instanceof Error ? error.message : String(error),
          latencyMs: Date.now() - startedAt,
        };
      }
    }

    await this.logResult(lastFailure);
    return lastFailure;
  }

  async getSuccessRate(lastHours = 24) {
    const since = new Date(Date.now() - lastHours * 60 * 60 * 1000);
    const [ok, fail] = await Promise.all([
      this.prisma.imageValidationLog.count({
        where: { createdAt: { gte: since }, success: true },
      }),
      this.prisma.imageValidationLog.count({
        where: { createdAt: { gte: since }, success: false },
      }),
    ]);

    const total = ok + fail;
    return {
      total,
      success: ok,
      failed: fail,
      successRate: total ? Number(((ok / total) * 100).toFixed(2)) : 100,
    };
  }

  private async logResult(result: ValidationResult) {
    try {
      await this.prisma.imageValidationLog.create({
        data: {
          sourceUrl: result.finalUrl,
          success: result.success,
          statusCode: result.statusCode ?? null,
          reason: result.reason ?? null,
          latencyMs: result.latencyMs ?? null,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to persist image validation log: ${String(error)}`);
    }
  }
}

