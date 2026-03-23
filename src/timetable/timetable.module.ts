// src/modules/timetable/timetable.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimetableController } from './timetable.controller';
import { TimetableService } from './timetable.service';
import { TimeSlot } from './entities/time-slot.entity';
import { TimetableEntry } from './entities/timetable-entry.entity';
import { TimetableTemplate } from './entities/timetable-template.entity';
import { Student } from '../students/entities/student.entity';
import { Class } from '../students/entities/class.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Subject } from '../students/entities/subject.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TimeSlot,
      TimetableEntry,
      TimetableTemplate,
      Student,
      Class,
      Teacher,
      Subject,
    ]),
  ],
  controllers: [TimetableController],
  providers: [TimetableService],
  exports: [TimetableService],
})
export class TimetableModule { }