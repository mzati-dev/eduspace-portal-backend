import { Test, TestingModule } from '@nestjs/testing';
import { TimetableTeacherController } from './timetable-teacher.controller';

describe('TimetableTeacherController', () => {
  let controller: TimetableTeacherController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimetableTeacherController],
    }).compile();

    controller = module.get<TimetableTeacherController>(TimetableTeacherController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
