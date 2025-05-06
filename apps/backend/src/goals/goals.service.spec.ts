import { Test, TestingModule } from '@nestjs/testing';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { PrismaService } from '../prisma.service';

describe('GoalsService', () => {
  let service: GoalsService;
  let goalId: number = 0;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoalsService, PrismaService],
    }).compile();

    service = module.get<GoalsService>(GoalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a goal', async () => {
    const goal: CreateGoalDto = {
      userId: 1,
      title: 'Test Goal',
      description: 'Test Description',
      category: 'Test Category',
      targetValue: 100,
      currentValue: 0,
      deadline: new Date(),
      status: 'Test Status',
      unit: 'Test Unit',
    };

    const result = await service.create(goal);
    expect(result.userId).toEqual(goal.userId);
    expect(result.title).toEqual(goal.title);
    expect(result.description).toEqual(goal.description);
    expect(result.category).toEqual(goal.category);
    expect(result.targetValue).toEqual(goal.targetValue);
    expect(result.currentValue).toEqual(goal.currentValue);
    expect(result.deadline).toEqual(goal.deadline);
    expect(result.status).toEqual(goal.status);
    expect(result.unit).toEqual(goal.unit);

    goalId = result.id;
  });

  it('should find all goals', async () => {
    const result = await service.findAll();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should find a goal by id', async () => {
    const result = await service.findById(goalId);
    expect(result.id).toEqual(goalId);
  });

  it('should update a goal', async () => {
    const result = await service.update(goalId, {
      title: 'Updated Goal',
    });
    expect(result.id).toEqual(goalId);
  });

  it('should delete a goal', async () => {
    const result = await service.remove(goalId);
    expect(result.id).toEqual(goalId);
  });
});
