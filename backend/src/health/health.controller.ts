import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';
import { MediaUrlService } from '../media/media-url.service';
import { OutfitQueueService } from '../outfits/queue/outfit-queue.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaUrlService: MediaUrlService,
    private readonly outfitQueueService: OutfitQueueService,
  ) {}

  @Public()
  @Get()
  async getHealth() {
    const uptimeSeconds = Math.floor(process.uptime());
    const memory = process.memoryUsage();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        uptimeSeconds,
        memoryRss: memory.rss,
      };
    } catch {
      return {
        status: 'degraded',
        uptimeSeconds,
      };
    }
  }

  @Public()
  @Get('metrics')
  async getMetrics(@Res() res: Response) {
    const [
      usersTotal,
      verifiedUsers,
      generationsTotal,
      generationsLastHour,
      queueStats,
      imageStats,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isEmailVerified: true } }),
      this.prisma.outfitGenerationLog.count(),
      this.prisma.outfitGenerationLog.count({
        where: { createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
      }),
      this.outfitQueueService.getStats(),
      this.mediaUrlService.getImageSuccessRate(),
    ]);

    const lines = [
      '# HELP gothyxan_users_total Total registered users',
      '# TYPE gothyxan_users_total gauge',
      `gothyxan_users_total ${usersTotal}`,
      '# HELP gothyxan_users_verified Total verified users',
      '# TYPE gothyxan_users_verified gauge',
      `gothyxan_users_verified ${verifiedUsers}`,
      '# HELP gothyxan_generations_total Total outfit generations',
      '# TYPE gothyxan_generations_total counter',
      `gothyxan_generations_total ${generationsTotal}`,
      '# HELP gothyxan_generations_last_hour Outfit generations over last hour',
      '# TYPE gothyxan_generations_last_hour gauge',
      `gothyxan_generations_last_hour ${generationsLastHour}`,
      '# HELP gothyxan_queue_waiting Jobs waiting in outfit queue',
      '# TYPE gothyxan_queue_waiting gauge',
      `gothyxan_queue_waiting ${queueStats.waiting}`,
      '# HELP gothyxan_queue_active Jobs active in outfit queue',
      '# TYPE gothyxan_queue_active gauge',
      `gothyxan_queue_active ${queueStats.active}`,
      '# HELP gothyxan_queue_failed Jobs failed in outfit queue',
      '# TYPE gothyxan_queue_failed counter',
      `gothyxan_queue_failed ${queueStats.failed}`,
      '# HELP gothyxan_image_success_rate Percent of validated images delivered successfully',
      '# TYPE gothyxan_image_success_rate gauge',
      `gothyxan_image_success_rate ${imageStats.successRate}`,
      '# HELP gothyxan_process_uptime_seconds Process uptime in seconds',
      '# TYPE gothyxan_process_uptime_seconds gauge',
      `gothyxan_process_uptime_seconds ${Math.floor(process.uptime())}`,
    ];

    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    return res.send(`${lines.join('\n')}\n`);
  }
}
