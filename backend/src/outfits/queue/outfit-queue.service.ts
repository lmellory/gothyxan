import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConnectionOptions, Job, Queue, QueueEvents, Worker } from 'bullmq';
import { AiService } from '../../ai/ai.service';
import { GenerateOutfitDto } from '../../ai/dto/generate-outfit.dto';
import { OutfitResult } from '../../ai/types/outfit.types';

type GenerationJobPayload = {
  input: GenerateOutfitDto;
  options?: {
    userId?: string;
    personalization?: {
      adaptiveIndex: number;
      generationCount: number;
      avgRating: number;
      saveRate: number;
      regenerateRate: number;
      favoriteBrands: string[];
      preferredStyles: string[];
      brandAffinity: Record<string, number>;
      budgetSensitivity: number;
      styleBiasScore: number;
      lastStyle?: string | null;
    };
    monetization?: {
      affiliateAware: boolean;
      luxuryBias: boolean;
      premiumOnly: boolean;
      highMarginBoost: number;
      conversionBoost: number;
    };
  };
};

type OutfitQueue = Queue<
  GenerationJobPayload,
  OutfitResult,
  string,
  GenerationJobPayload,
  OutfitResult,
  string
>;

@Injectable()
export class OutfitQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutfitQueueService.name);
  private readonly queueName = 'outfit-generation';
  private readonly enabled = (process.env.OUTFIT_QUEUE_ENABLED ?? 'true') === 'true';
  private readonly timeoutMs = Number(process.env.OUTFIT_QUEUE_TIMEOUT_MS ?? '30000');
  private readonly workerConcurrency = Number(process.env.OUTFIT_WORKER_CONCURRENCY ?? '6');
  private queue: OutfitQueue | null = null;
  private queueEvents: QueueEvents | null = null;
  private worker: Worker<GenerationJobPayload, OutfitResult> | null = null;
  private connectionOptions: ConnectionOptions | null = null;

  constructor(
    private readonly aiService: AiService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Outfit queue disabled by env');
      return;
    }

    const redisUrl = this.configService.get<string>('redis.url')?.trim();
    if (!redisUrl) {
      this.logger.warn('Outfit queue disabled: REDIS_URL is not configured');
      return;
    }

    try {
      this.connectionOptions = { url: redisUrl, maxRetriesPerRequest: null };

      this.queue = new Queue<
        GenerationJobPayload,
        OutfitResult,
        string,
        GenerationJobPayload,
        OutfitResult,
        string
      >(this.queueName, {
        connection: this.connectionOptions,
        defaultJobOptions: {
          attempts: 2,
          backoff: {
            type: 'fixed',
            delay: 700,
          },
          removeOnComplete: 400,
          removeOnFail: 400,
        },
      });

      this.queueEvents = new QueueEvents(this.queueName, {
        connection: this.connectionOptions,
      });
      await this.queueEvents.waitUntilReady();

      this.worker = new Worker<GenerationJobPayload, OutfitResult>(
        this.queueName,
        async (job) => this.processJob(job),
        {
          connection: this.connectionOptions,
          concurrency: this.workerConcurrency,
          lockDuration: 45_000,
        },
      );
      this.worker.on('failed', (job, error) => {
        this.logger.warn(
          `Outfit job failed ${job?.id ? `id=${job.id}` : ''}: ${String(error)}`,
        );
      });

      this.logger.log(`Outfit queue enabled (concurrency=${this.workerConcurrency})`);
    } catch (error) {
      this.logger.warn(`Failed to initialize outfit queue, fallback to direct mode: ${String(error)}`);
      await this.closeQueueResources();
    }
  }

  async onModuleDestroy() {
    await this.closeQueueResources();
  }

  async generate(
    input: GenerateOutfitDto,
    options?: GenerationJobPayload['options'],
  ): Promise<OutfitResult> {
    if (!this.queue || !this.queueEvents) {
      return this.aiService.generateOutfit(input, options);
    }

    try {
      const job = await this.queue.add('generate', {
        input,
        options,
      });
      return (await job.waitUntilFinished(this.queueEvents, this.timeoutMs)) as OutfitResult;
    } catch (error) {
      this.logger.warn(`Queue generation fallback to direct mode: ${String(error)}`);
      return this.aiService.generateOutfit(input, options);
    }
  }

  async getStats() {
    if (!this.queue) {
      return {
        enabled: false,
        waiting: 0,
        active: 0,
        delayed: 0,
        completed: 0,
        failed: 0,
      };
    }

    const [waiting, active, delayed, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getDelayedCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return {
      enabled: true,
      waiting,
      active,
      delayed,
      completed,
      failed,
    };
  }

  private async processJob(job: Job<GenerationJobPayload, OutfitResult>) {
    const payload = job.data;
    return this.aiService.generateOutfit(payload.input, payload.options);
  }

  private async closeQueueResources() {
    const workers = [this.worker, this.queueEvents, this.queue];
    for (const resource of workers) {
      if (!resource) {
        continue;
      }
      try {
        await resource.close();
      } catch {
        // ignore close errors
      }
    }
    this.worker = null;
    this.queueEvents = null;
    this.queue = null;
    this.connectionOptions = null;
  }
}
