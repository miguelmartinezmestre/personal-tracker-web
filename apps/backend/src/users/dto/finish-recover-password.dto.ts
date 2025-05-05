import { ApiProperty } from '@nestjs/swagger';

export class FinishRecoverPasswordDto {
  @ApiProperty()
  password: string;

  @ApiProperty()
  resetPasswordKey: string;
}
