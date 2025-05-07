import { Injectable } from '@nestjs/common';
import { CreateProgressUpdateDto } from './dto/create-progress-update.dto';
import { UpdateProgressUpdateDto } from './dto/update-progress-update.dto';
import { PrismaService } from '../prisma.service';
import { GoalsService } from '../goals/goals.service';

@Injectable()
export class ProgressUpdatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly goalsService: GoalsService,
  ) { }

  async create(createProgressUpdateDto: CreateProgressUpdateDto) {
    const progressUpdate = await this.prisma.progressUpdate.create({
      data: createProgressUpdateDto,
    });

    const goal = await this.prisma.goal.findUnique({
      where: { id: progressUpdate.goalId },
    });

    const percentage = (progressUpdate.updatedValue / goal.targetValue) * 100;

    console.log(progressUpdate.updatedValue, goal.targetValue);

    if (percentage === 100) {
      await this.prisma.notification.create({
        data: {
          userId: goal.userId,
          message: 'Goal completed',
          goalId: progressUpdate.goalId,
          notificationDate: new Date(),
          notificationType: 'Goal Completed',
        },
      });
    } else {
      await this.prisma.notification.create({
        data: {
          userId: goal.userId,
          message: `Goal ${goal.title} is ${percentage}% completed`,
          goalId: progressUpdate.goalId,
          notificationDate: new Date(),
          notificationType: 'Goal Progress',
        },
      });
    }

    return progressUpdate;
  }

  async findAll() {
    return this.prisma.progressUpdate.findMany();
  }

  async findById(goalId: number) {
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
