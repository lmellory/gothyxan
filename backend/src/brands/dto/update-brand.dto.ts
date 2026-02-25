import { PartialType } from '@nestjs/mapped-types';
import { UpsertBrandDto } from './upsert-brand.dto';

export class UpdateBrandDto extends PartialType(UpsertBrandDto) {}
