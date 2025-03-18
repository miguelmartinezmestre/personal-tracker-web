import { PartialType } from '@nestjs/swagger';
import { CreateProgressUpdateDto } from './create-progress-update.dto';

export class UpdateProgressUpdateDto extends PartialType(
  CreateProgressUpdateDto,
) {}
