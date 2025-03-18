import { ApiProperty } from '@nestjs/swagger';

export class CreateProgressUpdateDto {
  @ApiProperty()
  goalId: number;

  @ApiProperty()
  updatedValue: number;

  @ApiProperty()
  updateDate: Date;

  @ApiProperty()
  comment: string;
}
