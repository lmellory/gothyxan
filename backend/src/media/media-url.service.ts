import { Injectable } from '@nestjs/common';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createMediaSignature } from './media-signature.util';
import { ImageValidationService } from './image-validation.service';

export type MediaObject = {
  thumbnail: string;
  medium: string;
  high_res: string;
  source: 'validated' | 'placeholder';
  validated: boolean;
};

@Injectable()
export class MediaUrlService {
  private readonly apiPublicBaseUrl = (process.env.API_PUBLIC_BASE_URL ?? 'http://localhost:4000').replace(/\/+$/, '');
  private readonly signingSecret = process.env.MEDIA_SIGNING_SECRET?.trim() ?? null;
  private readonly signedTtlSec = Number(process.env.MEDIA_SIGNED_URL_TTL_SEC ?? '900');
  private readonly s3Bucket = process.env.MEDIA_S3_BUCKET?.trim() ?? null;
  private readonly s3Region = process.env.MEDIA_S3_REGION?.trim() ?? 'us-east-1';
  private readonly s3Endpoint = process.env.MEDIA_S3_ENDPOINT?.trim() ?? null;
  private readonly s3AccessKeyId = process.env.MEDIA_S3_ACCESS_KEY?.trim() ?? null;
  private readonly s3SecretAccessKey = process.env.MEDIA_S3_SECRET_KEY?.trim() ?? null;
  private readonly s3Client: S3Client | null;

  constructor(private readonly imageValidationService: ImageValidationService) {
    this.s3Client =
      this.s3Bucket && this.s3AccessKeyId && this.s3SecretAccessKey
        ? new S3Client({
            region: this.s3Region,
            endpoint: this.s3Endpoint ?? undefined,
            forcePathStyle: Boolean(this.s3Endpoint),
            credentials: {
              accessKeyId: this.s3AccessKeyId,
              secretAccessKey: this.s3SecretAccessKey,
            },
          })
        : null;
  }

  async buildMediaObject(sourceUrl: string): Promise<MediaObject> {
    if (this.isFirstPartyMediaUrl(sourceUrl)) {
      return {
        thumbnail: sourceUrl,
        medium: sourceUrl,
        high_res: sourceUrl,
        source: 'validated',
        validated: true,
      };
    }

    const validation = await this.imageValidationService.validateWithRetry(sourceUrl);
    if (!validation.success) {
      return {
        thumbnail: this.placeholder('thumbnail'),
        medium: this.placeholder('medium'),
        high_res: this.placeholder('high_res'),
        source: 'placeholder',
        validated: false,
      };
    }

    const highRes = await this.toDeliverableUrl(validation.finalUrl, 'high_res');
    const medium = await this.toDeliverableUrl(validation.finalUrl, 'medium');
    const thumbnail = await this.toDeliverableUrl(validation.finalUrl, 'thumbnail');
    return {
      thumbnail,
      medium,
      high_res: highRes,
      source: 'validated',
      validated: true,
    };
  }

  async getImageSuccessRate() {
    return this.imageValidationService.getSuccessRate(24);
  }

  private async toDeliverableUrl(sourceUrl: string, variant: 'thumbnail' | 'medium' | 'high_res') {
    if (this.isS3Url(sourceUrl) && this.s3Client && this.s3Bucket) {
      const key = sourceUrl.replace(/^s3:\/\/[^/]+\//, '');
      const signed = await getSignedUrl(
        this.s3Client,
        new GetObjectCommand({
          Bucket: this.s3Bucket,
          Key: key,
        }),
        { expiresIn: this.signedTtlSec },
      );
      return signed;
    }

    const url = new URL(`${this.apiPublicBaseUrl}/api/media/proxy`);
    url.searchParams.set('url', sourceUrl);
    url.searchParams.set('variant', variant);

    if (this.signingSecret) {
      const exp = String(Math.floor(Date.now() / 1000) + this.signedTtlSec);
      const sig = createMediaSignature(this.signingSecret, sourceUrl, variant, exp);
      url.searchParams.set('exp', exp);
      url.searchParams.set('sig', sig);
    }

    return url.toString();
  }

  private placeholder(variant: 'thumbnail' | 'medium' | 'high_res') {
    return `${this.apiPublicBaseUrl}/api/media/placeholder?variant=${variant}`;
  }

  private isS3Url(value: string) {
    return value.startsWith('s3://');
  }

  private isFirstPartyMediaUrl(value: string) {
    if (!value || !value.startsWith('http')) {
      return false;
    }

    if (value.startsWith(`${this.apiPublicBaseUrl}/api/media/local`)) {
      return true;
    }

    if (value.startsWith(`${this.apiPublicBaseUrl}/api/media/placeholder`)) {
      return true;
    }

    return false;
  }
}
