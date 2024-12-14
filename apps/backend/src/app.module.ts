import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UsersModule } from './users/users.module';
import { CookieGuard } from './session.guard';

@Module({
  imports: [UsersModule],
  controllers: [],
  providers: [PrismaService, CookieGuard],
})
export class AppModule {}
