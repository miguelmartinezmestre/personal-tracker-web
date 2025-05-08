import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty()
  userId: number;

  @ApiProperty()
  value: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  userAgent: string;
}
