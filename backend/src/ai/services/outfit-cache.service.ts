import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RedisService } from '../../common/infra/redis.service';
import { OutfitResult } from '../types/outfit.types';

type CachedEntry = {
  expiresAt: number;
  value: OutfitResult;
};

@Injectable()
export class OutfitCacheService {
  private readonly cache = new Map<string, CachedEntry>();
  private readonly ttlMs = 5 * 60 * 1000;
  private readonly redisTtlSeconds = 5 * 60;

  constructor(private readonly redisService: RedisService) {}

  async get(key: string): Promise<OutfitResult | null> {
    const redisKey = this.redisKey(key);
    const redis = await this.redisService.getClient();
    if (redis) {
      try {
        const raw = await redis.get(redisKey);
        if (raw) {
          return JSON.parse(raw) as OutfitResult;
        }
      } catch {
        // fallback to in-memory cache
      }
    }

    const entry = this.cache.get(redisKey);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(redisKey);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: OutfitResult) {
    const redisKey = this.redisKey(key);
    const redis = await this.redisService.getClient();
    if (redis) {
      try {
        await redis.set(redisKey, JSON.stringify(value), 'EX', this.redisTtlSeconds);
      } catch {
        // fallback to in-memory cache
      }
    }
    this.cache.set(redisKey, { value, expiresAt: Date.now() + this.ttlMs });
  }

  private redisKey(key: string) {
    const digest = createHash('sha1').update(key).digest('hex');
    return `gothyxan:ai:outfit:${digest}`;
  }
}
