import { Test, TestingModule } from '@nestjs/testing';
import { TimetableTeacherService } from './timetable-teacher.service';

describe('TimetableTeacherService', () => {
  let service: TimetableTeacherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TimetableTeacherService],
    }).compile();

    service = module.get<TimetableTeacherService>(TimetableTeacherService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
