import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';
import { Teacher } from './entities/teacher.entity';
import { TeacherClassSubject } from './entities/teacher-class-subject.entity';
import { Class } from '../students/entities/class.entity';
import { Subject } from '../students/entities/subject.entity';
import { Student } from '../students/entities/student.entity';
// ===== ADD THESE IMPORTS =====
import { Assessment } from '../students/entities/assessment.entity';      // 👈 ADD THIS
import { ReportCard } from '../students/entities/report-card.entity';    // 👈 ADD THIS
import { GradeConfig } from '../students/entities/grade-config.entity';  // 👈 ADD THIS
// import { Teacher } from './entities/teacher.entity';


@Module({
  imports: [TypeOrmModule.forFeature([
    Teacher,
    // ===== START: NEW ENTITIES =====
    TeacherClassSubject,
    Class,
    Subject,
    Student,
    // ===== END: NEW ENTITIES =====
    // ===== ADD THESE ENTITIES =====
    Assessment,      // 👈 ADD THIS
    ReportCard,      // 👈 ADD THIS
    GradeConfig,     // 👈 ADD THIS
    // ===== END ADD =====
  ])],
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TeachersService],
})
export class TeachersModule { }