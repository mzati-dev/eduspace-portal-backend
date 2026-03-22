import { Test, TestingModule } from '@nestjs/testing';
import { TeacherMessagesController } from './teacher-messages.controller';
import { TeacherMessagesService } from './teacher-messages.service';

describe('TeacherMessagesController', () => {
  let controller: TeacherMessagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeacherMessagesController],
      providers: [TeacherMessagesService],
    }).compile();

    controller = module.get<TeacherMessagesController>(TeacherMessagesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
