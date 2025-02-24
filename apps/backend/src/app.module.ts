import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UsersModule } from './users/users.module';
import { CookieGuard } from './session.guard';
import { GoalsModule } from './goals/goals.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SessionsModule } from './sessions/sessions.module';
import { EmailsModule } from './emails/emails.module';

@Module({
  imports: [UsersModule, GoalsModule, NotificationsModule, SessionsModule, EmailsModule],
  controllers: [],
  providers: [PrismaService, CookieGuard],
})
export class AppModule {}
