import { Injectable } from '@nestjs/common';
import { CreateProgressUpdateDto } from './dto/create-progress-update.dto';
import { UpdateProgressUpdateDto } from './dto/update-progress-update.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class ProgressUpdatesService {

  constructor(private readonly prisma: PrismaService) {}

  async create(createProgressUpdateDto: CreateProgressUpdateDto) {
    return this.prisma.progressUpdate.create({
      data: createProgressUpdateDto,
    });
  }

  async findAll() {
    return this.prisma.progressUpdate.findMany();
  }

  async findOne(goalId: number) {
    return this.prisma.progressUpdate.findMany({
      where: { goalId },
    });
  }

  async update(id: number, updateProgressUpdateDto: UpdateProgressUpdateDto) {
    return this.prisma.progressUpdate.update({
      where: { id },
      data: updateProgressUpdateDto,
    });
  }

  async remove(id: number) {
    return this.prisma.progressUpdate.delete({
      where: { id },
    });
  }

}
