import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Subject } from 'rxjs';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Assessment } from '../students/entities/assessment.entity';
import { Class } from '../students/entities/class.entity';
import { ReportCard } from '../students/entities/report-card.entity';
import { Student } from '../students/entities/student.entity';
import { Report } from './entities/report.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      Report,
      Assessment,
      Student,
      Class,
      Subject,
      Attendance,
      ReportCard,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule { }