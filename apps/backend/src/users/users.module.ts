import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../prisma.service';
import { EmailsService } from '../emails/emails.service';

@Module({
  controllers: [UsersController],
  providers: [PrismaService, UsersService, EmailsService],
})
export class UsersModule {}
