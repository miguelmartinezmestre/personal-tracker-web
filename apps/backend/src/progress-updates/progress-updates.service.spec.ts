import { Test, TestingModule } from '@nestjs/testing';
import { ProgressUpdatesService } from './progress-updates.service';

describe('ProgressUpdatesService', () => {
  let service: ProgressUpdatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProgressUpdatesService],
    }).compile();

    service = module.get<ProgressUpdatesService>(ProgressUpdatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
