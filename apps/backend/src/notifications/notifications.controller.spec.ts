import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateGoalDto } from '../goals/dto/create-goal.dto';
import { GoalsController } from '../goals/goals.controller';
import { GoalsService } from '../goals/goals.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let goalsController: GoalsController;
  let usersService: UsersService;
  let prisma: PrismaService;
  let notificationId: number;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController, GoalsController],
      providers: [
        PrismaService,
        NotificationsService,
        GoalsService,
        UsersService,
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    goalsController = module.get<GoalsController>(GoalsController);
    usersService = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a notification', async () => {
    const user: CreateUserDto = {
      email: `${Math.random().toString(36).substring(2, 15)}@test.com`,
      password: 'password',
      username: 'Test User',
    };

    const createdUser = await prisma.user.create({
      data: user,
    });

    const goal: CreateGoalDto = {
      userId: createdUser.id,
      title: 'Goal 1',
      description: 'Description 1',
      category: 'Category 1',
      targetValue: 100,
      currentValue: 0,
      deadline: new Date(),
      status: 'active',
      unit: 'unit',
    };

    const createdGoal = await goalsController.create(goal);

    const notification: CreateNotificationDto = {
      userId: createdUser.id,
      goalId: createdGoal.id,
      notificationType: 'goal',
      notificationDate: new Date(),
      message: 'Goal created',
    };

    const result = await controller.create(notification);
    expect(result).toBeDefined();

    notificationId = result.id;
  });

  it('should find all notifications', async () => {
    const result = await controller.findAll();
    expect(result).toBeDefined();
  });

  it('should find one notification', async () => {
    const result = await controller.findById(notificationId);
    expect(result).toBeDefined();
  });

  it('should update a notification', async () => {
    const result = await controller.update(notificationId, {
      message: 'Updated message',
    });
    expect(result).toBeDefined();
  });

  it('should remove a notification', async () => {
    const result = await controller.remove(notificationId);
    expect(result).toBeDefined();
  });
});
