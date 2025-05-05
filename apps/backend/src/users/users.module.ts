import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../prisma.service';
import { EmailsService } from '../emails/emails.service';
import { CryptoService } from 'src/crypto.service';
import { SessionsService } from 'src/sessions/sessions.service';

@Module({
  controllers: [UsersController],
  providers: [
    PrismaService,
    UsersService,
    EmailsService,
    CryptoService,
    SessionsService,
  ],
})
export class UsersModule {}
