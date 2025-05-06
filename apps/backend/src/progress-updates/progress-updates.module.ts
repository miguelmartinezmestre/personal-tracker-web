import { Module } from '@nestjs/common';
import { ProgressUpdatesService } from './progress-updates.service';
import { ProgressUpdatesController } from './progress-updates.controller';
import { PrismaService } from 'src/prisma.service';
import { GoalsService } from 'src/goals/goals.service';

@Module({
  controllers: [ProgressUpdatesController],
  providers: [PrismaService, ProgressUpdatesService, GoalsService],
})
export class ProgressUpdatesModule {}
