import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SessionsController],
  providers: [PrismaService, SessionsService],
})
export class SessionsModule {}
