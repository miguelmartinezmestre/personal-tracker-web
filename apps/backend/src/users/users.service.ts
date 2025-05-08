import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma.service';
import { LoginUserDto } from './dto/login-user.dto';
import { Response, Request } from 'express';
import { EmailsService } from '../emails/emails.service';
import { RecoverPasswordDto } from './dto/recover-password.dto';
import { FinishRecoverPasswordDto } from './dto/finish-recover-password.dto';
import { CryptoService } from 'src/crypto.service';
import { SessionsService } from 'src/sessions/sessions.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailsService: EmailsService,
    private cryptoService: CryptoService,
    private sessionsService: SessionsService,
  ) {}

  async login(
    loginUserDto: LoginUserDto,
    request: Request,
    response: Response,
  ) {
    const userAgent = request.headers['user-agent'];

    const user = await this.prisma.user.findUnique({
      where: {
        email: loginUserDto.email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Incorrect credentials');
    }

    const hashedPassword = await this.cryptoService.hashPassword(
      loginUserDto.password,
    );

    const isPasswordCorrect = await this.cryptoService.verifyPassword(
      loginUserDto.password,
      user.password,
    );

    if (!isPasswordCorrect) {
      throw new UnauthorizedException('Incorrect credentials');
    }

    const sessionId = await this.cryptoService.generateSessionId();

    await this.sessionsService.create({
      userId: user.id,
      value: sessionId,
      userAgent: userAgent,
      status: 'active',
    });

    response
      .cookie('session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      })
      .json({});
  }

  async create(
    createUserDto: CreateUserDto,
    request: Request,
    response: Response,
  ) {
    const userAgent = request.headers['user-agent'];

    const foundUser = await this.prisma.user.findFirst({
      where: {
        email: createUserDto.email,
      },
    });

    if (foundUser) {
      throw new UnauthorizedException('User already exists');
    }

    createUserDto.password = await this.cryptoService.hashPassword(
      createUserDto.password,
    );

    const user = await this.prisma.user.create({
      data: createUserDto,
    });

    const sessionId = await this.cryptoService.generateSessionId();

    await this.sessionsService.create({
      userId: user.id,
      value: sessionId,
      status: 'active',
      userAgent: userAgent,
    });

    await this.emailsService.sendWelcomeEmail(user.username, user.email);

    response
      .cookie('session_id', sessionId, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      })
      .json({});
  }

  async logout(response: Response) {
    response.clearCookie('session_id').json({});
  }

  async auth(request: Request) {
    const session_id = request.cookies['session_id'];

    const session = await this.sessionsService.findBySessionId(session_id);

    if (!session_id || !session) {
      throw new UnauthorizedException('Incorrect credentials');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });

    return {
      id: user.id,
      email: user.email,
      username: user.username,
    };
  }

  findAll() {
    return this.prisma.user.findMany();
  }

  findById(id: number) {
    return this.prisma.user.findUnique({
      where: {
        id,
      },
    });
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: {
        username: updateUserDto.username,
      },
    });
  }

  remove(id: number) {
    return this.prisma.user.delete({ where: { id } });
  }

  async recoverPassword(body: RecoverPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: body.email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Unexpected error');
    }

    const resetPasswordKey =
      await this.cryptoService.generateResetPasswordKey();

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordKey },
    });

    await this.emailsService.sendRecoverPasswordEmail(
      user.username,
      user.email,
      `${process.env.FRONTEND_URL}/reset-password-finish?key=${resetPasswordKey}`,
    );
  }

  async finishRecoverPassword(body: FinishRecoverPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordKey: body.resetPasswordKey,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Unexpected error');
    }

    const hashedPassword = await this.cryptoService.hashPassword(body.password);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordKey: null },
    });
  }
}
