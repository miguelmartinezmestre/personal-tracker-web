import { Module } from '@nestjs/common';
import { ProgressUpdatesService } from './progress-updates.service';
import { ProgressUpdatesController } from './progress-updates.controller';
import { PrismaService } from '../prisma.service';
import { GoalsService } from '../goals/goals.service';
import { NotificationsService } from 'src/notifications/notifications.service';

@Module({
  controllers: [ProgressUpdatesController],
  providers: [PrismaService, ProgressUpdatesService, GoalsService, NotificationsService],
})
export class ProgressUpdatesModule {}
