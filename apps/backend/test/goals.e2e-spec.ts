import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { GoalsController } from '../src/goals/goals.controller';
import { GoalsService } from '../src/goals/goals.service';
import { PrismaService } from '../src/prisma.service';

describe('Goals', () => {
  let app: INestApplication;
  let goalsService: GoalsService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [GoalsController],
      providers: [GoalsService, PrismaService],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    goalsService = moduleRef.get<GoalsService>(GoalsService);
  });

  it('register a user', async () => {
    const response = await request(app.getHttpServer())
      .post('/users/register')
      .send({
        email: 'test@test.com',
        password: 'test',
        name: 'Test User',
      });

    expect(response.status).toBe(200);
  });

  // it(`/GET goals`, async () => {
  //   return request(app.getHttpServer())
  //     .get('/goals')
  //     .expect(200)
  //     .expect(await goalsService.findAll());
  // });

  // it(`/POST goals`, async () => {
  //   return request(app.getHttpServer())
  //     .post('/goals')
  //     .expect(201)
  //     .expect(
  //       await goalsService.create({
  //         userId: 1,
  //         title: 'Test Goal',
  //         description: 'Test Description',
  //         category: 'Test Category',
  //         targetValue: 100,
  //         currentValue: 0,
  //         deadline: new Date('2025-01-01'),
  //         status: 'active',
  //         unit: 'Test Unit',
  //       }),
  //     );
  // });

  afterAll(async () => {
    await app.close();
  });
});
