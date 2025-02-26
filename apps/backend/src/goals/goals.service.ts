import { Injectable } from '@nestjs/common';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { PrismaService } from '../prisma.service';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  async create(createGoalDto: CreateGoalDto) {
    return this.prisma.goal.create({
      data: createGoalDto,
    });
  }

  async findAll() {
    const goals = await this.prisma.goal.findMany();
    return goals;
  }

  async findOne(id: number) {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
    });
    return goal;
  }

  async findByUser(userId: number) {
    const goals = await this.prisma.goal.findMany({
      where: { userId },
    });
    return goals;
  }

  async update(id: number, updateGoalDto: UpdateGoalDto) {
    const goal = await this.prisma.goal.update({
      where: { id },
      data: updateGoalDto,
    });

    const percentage =
      (updateGoalDto.currentValue / updateGoalDto.targetValue) * 100;

    if (percentage === 100) {
      await this.prisma.notification.create({
        data: {
          userId: updateGoalDto.userId,
          message: 'Goal completed',
          goalId: id,
          notificationDate: new Date(),
          notificationType: 'Goal Completed',
        },
      });
    } else {
      await this.prisma.notification.create({
        data: {
          userId: updateGoalDto.userId,
          message: `Goal ${goal.title} is ${percentage}% completed`,
          goalId: id,
          notificationDate: new Date(),
          notificationType: 'Goal Progress',
        },
      });
    }

    return goal;
  }

  async remove(id: number) {
    const goal = await this.prisma.goal.delete({
      where: { id },
    });
    return goal;
  }
}
