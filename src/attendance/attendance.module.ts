import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { Attendance } from './entities/attendance.entity';
import { AttendanceAlert } from './entities/attendance-alert.entity';
import { Student } from '../students/entities/student.entity';
import { Class } from '../students/entities/class.entity';
import { TeacherClassSubject } from '../teachers/entities/teacher-class-subject.entity';
import { Term } from './entities/term.entity';
import { SchoolHoliday } from './entities/school-holiday.entity';
import { PublicHoliday } from './entities/public-holiday.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Attendance,
      AttendanceAlert,
      Student,
      Class,
      TeacherClassSubject,
      Term,
      SchoolHoliday,
      PublicHoliday,
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule { }