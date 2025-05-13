import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { ConsoleLogger } from '@nestjs/common';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers/app.router';

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    // {
    //   logger: new ConsoleLogger({
    //     json: true,
    //   }),
    // }
  );

  app.use(cookieParser());

  app.use(
    '/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext: (ctx) => {
        return {
          req: ctx.req,
          res: ctx.res,
          prisma: ctx.prisma,
          cookieGuard: ctx.cookieGuard,
          cryptoService: ctx.cryptoService,
          usersService: ctx.usersService,
          emailsService: ctx.emailsService,
          sessionsService: ctx.sessionsService,
          progressUpdatesService: ctx.progressUpdatesService,
        };
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
