import { PartialType } from '@nestjs/mapped-types';
import { CreateBrandItemDto } from './create-brand-item.dto';

export class UpdateBrandItemDto extends PartialType(CreateBrandItemDto) {}
