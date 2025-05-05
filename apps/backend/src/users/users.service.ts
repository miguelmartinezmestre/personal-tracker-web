import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma.service';
import { LoginUserDto } from './dto/login-user.dto';
import { Response, Request } from 'express';
import { createHash, randomBytes } from 'crypto';
import { EmailsService } from 'src/emails/emails.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailsService: EmailsService,
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

    const hashedPassword = createHash('sha512')
      .update(loginUserDto.password)
      .digest('hex');

    if (user.password !== hashedPassword) {
      throw new UnauthorizedException('Incorrect credentials');
    }

    const bytes = randomBytes(64);
    const sessionId = bytes.toString('hex');

    await this.prisma.session.create({
      data: {
        userId: user.id,
        value: sessionId,
        userAgent: userAgent,
        status: 'active',
      },
    });

    response
      .cookie('session_id', sessionId, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      })
      .json({});
  }

  async create(createUserDto: CreateUserDto, response: Response) {
    const foundUser = await this.prisma.user.findFirst({
      where: {
        email: createUserDto.email,
      },
    });

    if (foundUser) {
      throw new UnauthorizedException('User already exists');
    }

    createUserDto.password = createHash('sha512')
      .update(createUserDto.password)
      .digest('hex');

    const user = await this.prisma.user.create({
      data: createUserDto,
    });

    const bytes = randomBytes(64);
    const sessionId = bytes.toString('hex');

    await this.prisma.session.create({
      data: {
        userId: user.id,
        value: sessionId,
        status: 'active',
      },
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

    const session = await this.prisma.session.findFirst({
      where: {
        value: session_id,
      },
    });

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

  findOne(id: number) {
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
}
