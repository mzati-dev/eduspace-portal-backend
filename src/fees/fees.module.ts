// src/modules/fees/fees.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeesController } from './fees.controller';
import { FeesService } from './fees.service';
import { FeeStructure } from './entities/fee-structure.entity';
import { Payment } from './entities/payment.entity';
import { Reminder } from './entities/reminder.entity';
import { StudentFee } from './entities/student-fee.entity';
import { Student } from '../students/entities/student.entity';
import { Class } from '../students/entities/class.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FeeStructure,
      Payment,
      Reminder,
      StudentFee,
      Student,
      Class,
    ]),
  ],
  controllers: [FeesController],
  providers: [FeesService],
  exports: [FeesService],
})
export class FeesModule { }