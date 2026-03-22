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


@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnalyticsData,
      Student,
      Assessment,
      Attendance,
      Class
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule { }