import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { GoalsModule } from './goals.module';

describe('Cats', () => {
  let app: INestApplication;
  const goalsService = { findAll: () => ['test'] };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [GoalsModule],
    })
      .overrideProvider(GoalsService)
      .useValue(goalsService)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it(`/GET goals`, () => {
    return request(app.getHttpServer()).get('/goals').expect(200).expect({
      data: goalsService.findAll(),
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
