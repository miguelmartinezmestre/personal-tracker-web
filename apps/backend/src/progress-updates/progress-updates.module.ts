import { Module } from '@nestjs/common';
import { ProgressUpdatesService } from './progress-updates.service';
import { ProgressUpdatesController } from './progress-updates.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [ProgressUpdatesController],
  providers: [PrismaService, ProgressUpdatesService],
})
export class ProgressUpdatesModule {}
