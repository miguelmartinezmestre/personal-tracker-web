import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  value: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  userAgent: string;
}
