import { Test, TestingModule } from '@nestjs/testing';
import { ProgressUpdatesController } from './progress-updates.controller';
import { ProgressUpdatesService } from './progress-updates.service';

describe('ProgressUpdatesController', () => {
  let controller: ProgressUpdatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgressUpdatesController],
      providers: [ProgressUpdatesService],
    }).compile();

    controller = module.get<ProgressUpdatesController>(
      ProgressUpdatesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
