import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty()
  userId: number;

  @ApiProperty()
  goalId: number;

  @ApiProperty()
  notificationType: string;

  @ApiProperty()
  notificationDate: Date;

  @ApiProperty()
  message: string;
}
