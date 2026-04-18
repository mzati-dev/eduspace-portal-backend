// src/analytics/analytics.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsData } from './entities/analytics.entity';
import { Student } from '../students/entities/student.entity';
import { Assessment } from '../students/entities/assessment.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Class } from '../students/entities/class.entity';
import { Subject } from '../students/entities/subject.entity';
import { GradeConfig } from '../students/entities/grade-config.entity';
import { ReportCard } from '../students/entities/report-card.entity';
import { Archive } from '../students/entities/archive.entity';
import { TeacherClassSubject } from '../teachers/entities/teacher-class-subject.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnalyticsData,
      Student,
      Assessment,
      Attendance,
      Class,
      Subject,
      GradeConfig,
      ReportCard,
      Archive,
      TeacherClassSubject,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule { }

// // src/analytics/analytics.module.ts
// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { AnalyticsController } from './analytics.controller';
// import { AnalyticsService } from './analytics.service';
// import { AnalyticsData } from './entities/analytics.entity';
// import { Student } from '../students/entities/student.entity';
// import { Assessment } from '../students/entities/assessment.entity';
// import { Attendance } from '../attendance/entities/attendance.entity';
// import { Class } from '../students/entities/class.entity';
// import { Subject } from '../students/entities/subject.entity';
// import { GradeConfig } from '../students/entities/grade-config.entity';


// @Module({
//   imports: [
//     TypeOrmModule.forFeature([
//       AnalyticsData,
//       Student,
//       Assessment,
//       Attendance,
//       Class,
//       Subject,
//       GradeConfig,
//     ]),
//   ],
//   controllers: [AnalyticsController],
//   providers: [AnalyticsService],
//   exports: [AnalyticsService],
// })
// export class AnalyticsModule { }