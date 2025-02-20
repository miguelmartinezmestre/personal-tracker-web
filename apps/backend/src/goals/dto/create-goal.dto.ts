import { ApiProperty } from '@nestjs/swagger';

export class CreateGoalDto {
  @ApiProperty()
  userId: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  targetValue: number;

  @ApiProperty()
  currentValue: number;

  @ApiProperty()
  deadline: Date;

  @ApiProperty()
  status: string;

  @ApiProperty()
  unit: string;
}
