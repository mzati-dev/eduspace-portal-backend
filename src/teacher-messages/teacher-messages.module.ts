import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherMessagesController } from './teacher-messages.controller';
import { TeacherMessagesService } from './teacher-messages.service';
import { TeacherMessage, TeacherParent, TeacherAdmin, Announcement } from './entities/teacher-message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeacherMessage, TeacherParent, TeacherAdmin, Announcement]),
  ],
  controllers: [TeacherMessagesController],
  providers: [TeacherMessagesService],
  exports: [TeacherMessagesService],
})
export class TeacherMessagesModule { }

// // src/modules/teacher-messages/teacher-messages.module.ts
// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { TeacherMessagesController } from './teacher-messages.controller';
// import { TeacherMessagesService } from './teacher-messages.service';
// import { TeacherMessage } from './entities/teacher-message.entity';
// import { TeacherParent } from './entities/teacher-parent.entity';

// @Module({
//   imports: [
//     TypeOrmModule.forFeature([TeacherMessage, TeacherParent]),
//   ],
//   controllers: [TeacherMessagesController],
//   providers: [TeacherMessagesService],
//   exports: [TeacherMessagesService],
// })
// export class TeacherMessagesModule { }