// src/modules/messaging/messaging.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { Contact } from './entities/contact.entity';
import { Message } from './entities/message.entity';
import { Event } from './entities/event.entity';
import { Broadcast } from './entities/broadcast.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contact, Message, Event, Broadcast]),
  ],
  controllers: [MessagingController],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule { }