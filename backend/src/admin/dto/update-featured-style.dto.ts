import { PartialType } from '@nestjs/mapped-types';
import { ManageFeaturedStyleDto } from './manage-featured-style.dto';

export class UpdateFeaturedStyleDto extends PartialType(ManageFeaturedStyleDto) {}
