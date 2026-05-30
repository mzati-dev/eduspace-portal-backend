// src/modules/messages/messages.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { Message } from './entities/message.entity';
import { Conversation } from './entities/conversation.entity';
import { Student } from '../students/entities/student.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { SchoolsModule } from '../schools/schools.module';


@Module({
  imports: [TypeOrmModule.forFeature([Message, Conversation, Student, Teacher]),
    SchoolsModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule { }

// // src/modules/messages/messages.module.ts

// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { MessagesService } from './messages.service';
// import { MessagesController } from './messages.controller';
// import { Message } from './entities/message.entity';
// import { Conversation } from './entities/conversation.entity';

// @Module({
//   imports: [TypeOrmModule.forFeature([Message, Conversation])],
//   controllers: [MessagesController],
//   providers: [MessagesService],
//   exports: [MessagesService],
// })
// export class MessagesModule { }