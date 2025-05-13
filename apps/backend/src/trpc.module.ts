import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers/app.router';
import { PrismaService } from './prisma.service';
import { Request, Response } from 'express';
import { CookieGuard } from './session.guard';
import { CryptoService } from './crypto.service';
import { UsersService } from './users/users.service';
import { EmailsService } from './emails/emails.service';
import { SessionsService } from './sessions/sessions.service';
import { ProgressUpdatesService } from './progress-updates/progress-updates.service';
import { NotificationsService } from './notifications/notifications.service';
import { GoalsService } from './goals/goals.service';

export const createContext = async ({
  req,
  res,
  prisma,
  cookieGuard,
  cryptoService,
  usersService,
  emailsService,
  sessionsService,
  progressUpdatesService,
  notificationsService,
  goalsService,
}: {
  req: Request;
  res: Response;
  prisma: PrismaService;
  cookieGuard: CookieGuard;
  cryptoService: CryptoService;
  usersService: UsersService;
  emailsService: EmailsService;
  sessionsService: SessionsService;
  progressUpdatesService: ProgressUpdatesService;
  notificationsService: NotificationsService;
  goalsService: GoalsService;
}): Promise<{
  req: Request;
  res: Response;
  prisma: PrismaService;
  cookieGuard: CookieGuard;
  cryptoService: CryptoService;
  usersService: UsersService;
  emailsService: EmailsService;
  sessionsService: SessionsService;
  progressUpdatesService: ProgressUpdatesService;
  notificationsService: NotificationsService;
  goalsService: GoalsService;
}> => {
  return {
    req,
    res,
    prisma,
    cookieGuard,
    cryptoService,
    usersService,
    emailsService,
    sessionsService,
    progressUpdatesService,
    notificationsService,
    goalsService,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

@Module({
  providers: [
    PrismaService,
    CookieGuard,
    CryptoService,
    UsersService,
    EmailsService,
    SessionsService,
    ProgressUpdatesService,
    NotificationsService,
    GoalsService,
    NotificationsService,
  ],
})
export class TrpcModule implements NestModule {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cookieGuard: CookieGuard,
    private readonly cryptoService: CryptoService,
    private readonly usersService: UsersService,
    private readonly emailsService: EmailsService,
    private readonly sessionsService: SessionsService,
    private readonly progressUpdatesService: ProgressUpdatesService,
    private readonly notificationsService: NotificationsService,
    private readonly goalsService: GoalsService,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        createExpressMiddleware({
          router: appRouter,
          createContext: (opts) =>
            createContext({
              req: opts.req,
              res: opts.res,
              prisma: this.prisma,
              cookieGuard: this.cookieGuard,
              cryptoService: this.cryptoService,
              usersService: this.usersService,
              emailsService: this.emailsService,
              sessionsService: this.sessionsService,
              progressUpdatesService: this.progressUpdatesService,
              notificationsService: this.notificationsService,
              goalsService: this.goalsService,
            }),
        }),
      )
      .forRoutes('/trpc');
  }
}
