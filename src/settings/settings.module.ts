// src/modules/settings/settings.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { Settings } from './entities/settings.entity';
import { BackupFile } from './entities/backup-file.entity';
import { Student } from '../students/entities/student.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Class } from '../students/entities/class.entity';
import { Subject } from '../students/entities/subject.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Settings,
      BackupFile,
      Student,
      Teacher,
      Class,
      Subject,
    ]),
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule { }