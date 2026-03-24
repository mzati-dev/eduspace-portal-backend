import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimetableTeacherController } from './timetable-teacher.controller';
import { TimetableTeacherService } from './timetable-teacher.service';
import { TimetableEntry } from '../timetable/entities/timetable-entry.entity';
import { TimeSlot } from '../timetable/entities/time-slot.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([TimetableEntry, TimeSlot]),
  ],
  controllers: [TimetableTeacherController],
  providers: [TimetableTeacherService],
  exports: [TimetableTeacherService],
})
export class TimetableTeacherModule { }