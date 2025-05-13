import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UsersModule } from './users/users.module';
import { CookieGuard } from './session.guard';
import { GoalsModule } from './goals/goals.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SessionsModule } from './sessions/sessions.module';
import { EmailsModule } from './emails/emails.module';
import { ProgressUpdatesModule } from './progress-updates/progress-updates.module';
import { CryptoService } from './crypto.service';
import { TrpcModule } from './trpc.module';

@Module({
  imports: [
    // TrpcModule,
    UsersModule,
    GoalsModule,
    NotificationsModule,
    SessionsModule,
    EmailsModule,
    ProgressUpdatesModule,
  ],
  controllers: [],
  providers: [PrismaService, CookieGuard, CryptoService],
})
export class AppModule {}
