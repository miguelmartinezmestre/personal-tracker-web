import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma.service';
import { LoginUserDto } from './dto/login-user.dto';
import { Response, Request } from 'express';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async login(loginUserDto: LoginUserDto, response: Response) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: loginUserDto.email,
      },
    });

    const hashedPassword = createHash('sha512')
      .update(loginUserDto.password)
      .digest('hex');

    console.log(hashedPassword, user.password);

    if (user.password !== hashedPassword) {
      throw new UnauthorizedException('Incorrect credentials');
    }

    const bytes = randomBytes(64);
    const sessionId = bytes.toString('hex');

    await this.prisma.session.create({
      data: {
        userId: user.id,
        value: sessionId,
      },
    });

    response.cookie('session_id', sessionId);
    console.log('cookie', sessionId);
    response.status(200);
    response.json({ status: 'success' });
  }

  async create(createUserDto: CreateUserDto, response: Response) {
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
      },
    });

    response.cookie('session_id', sessionId);
    console.log('cookie', sessionId);
    response.status(200);
    response.json({ status: 'success' });
  }

  async auth(request: Request) {
    const session_id = request.cookies['session_id'];

    console.log();

    const session = await this.prisma.session.findFirst({
      where: {
        value: session_id,
      },
    });

    if (!session_id || !session) {
      throw new UnauthorizedException('Incorrect credentials');
    }

    console.log(session.userId);
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
