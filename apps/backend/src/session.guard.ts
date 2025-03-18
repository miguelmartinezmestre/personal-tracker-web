import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Request } from 'express';
@Injectable()
export class CookieGuard implements CanActivate {
  constructor(@Inject(PrismaService) private prisma?: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('CookieGuard');
    const request = context.switchToHttp().getRequest() as Request;
    // Obtener cookies del cliente
    const cookies = request.cookies;
    // Comprobar si la cookie existe
    if (!cookies || !cookies['session_id']) {
      throw new UnauthorizedException('Incorrect credentials');
    }
    const session_id = request.cookies['session_id'];
    const session = await this.prisma.session.findFirst({
      where: {
        value: session_id,
      },
    });

    if (!session_id || !session) {
      throw new UnauthorizedException('Incorrect credentials');
    }

    return true;
  }
}
