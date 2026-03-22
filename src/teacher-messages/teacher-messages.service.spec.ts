import { Test, TestingModule } from '@nestjs/testing';
import { TeacherMessagesService } from './teacher-messages.service';

describe('TeacherMessagesService', () => {
  let service: TeacherMessagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TeacherMessagesService],
    }).compile();

    service = module.get<TeacherMessagesService>(TeacherMessagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
