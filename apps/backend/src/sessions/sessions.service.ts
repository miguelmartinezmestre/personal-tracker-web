import { Injectable } from '@nestjs/common';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) { }

  async create(createSessionDto: CreateSessionDto) {
    return this.prisma.session.create({
      data: createSessionDto,
    });
  }

  async findAllByUserId(userId: number) {
    return this.prisma.session.findMany({
      where: { userId },
    });
  }

  async findAll() {
    return this.prisma.session.findMany();
  }

  async findOne(id: number) {
    return this.prisma.session.findUnique({
      where: { id },
    });
  }

  async update(id: number, updateSessionDto: UpdateSessionDto) {
    return this.prisma.session.update({
      where: { id },
      data: updateSessionDto,
    });
  }

  async remove(id: number) {
    return this.prisma.session.delete({
      where: { id },
    });
  }
}
