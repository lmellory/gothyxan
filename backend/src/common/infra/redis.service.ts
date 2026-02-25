import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly redisUrl: string | null;
  private client: Redis | null = null;
  private disabledUntil = 0;

  constructor(private readonly configService: ConfigService) {
    this.redisUrl = this.configService.get<string>('redis.url')?.trim() ?? null;
  }

  async getClient() {
    if (!this.redisUrl) {
      return null;
    }

    if (Date.now() < this.disabledUntil) {
      return null;
    }

    if (this.client && this.client.status !== 'end') {
      return this.client;
    }

    const nextClient = new Redis(this.redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 1_500,
    });

    nextClient.on('error', (error) => {
      this.logger.warn(`Redis error: ${String(error)}`);
    });

    try {
      await nextClient.connect();
      this.client = nextClient;
      this.logger.log('Redis connected');
      return this.client;
    } catch (error) {
      this.disabledUntil = Date.now() + 10_000;
      this.logger.warn(`Redis unavailable, fallback to in-memory mode: ${String(error)}`);
      try {
        nextClient.disconnect();
      } catch {
        // ignore disconnect errors
      }
      return null;
    }
  }

  async onModuleDestroy() {
    if (!this.client) {
      return;
    }
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
