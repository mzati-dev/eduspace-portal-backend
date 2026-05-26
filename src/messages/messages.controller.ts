// src/modules/messages/messages.controller.ts

import { Controller, Get, Post, Body, Delete, Param, Request } from '@nestjs/common';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) { }

  @Post()
  sendMessage(@Body() body: any, @Request() req) {
    return this.messagesService.sendMessage(
      body,
      req.user.id,
      req.user.role,
      req.user.schoolId,
    );
  }

  @Get('conversations')
  getConversations(@Request() req) {
    return this.messagesService.getConversations(
      req.user.id,
      req.user.role,
      req.user.schoolId,
    );
  }

  @Get('conversations/:id')
  getConversationMessages(@Param('id') id: string, @Request() req) {
    return this.messagesService.getConversationMessages(
      id,
      req.user.id,
      req.user.schoolId,
    );
  }

  @Get('unread/count')
  getUnreadCount(@Request() req) {
    return this.messagesService.getUnreadCount(
      req.user.id,
      req.user.schoolId,
    );
  }

  @Delete(':id')
  deleteMessage(@Param('id') id: string, @Request() req) {
    return this.messagesService.deleteMessage(
      id,
      req.user.id,
      req.user.schoolId,
    );
  }
}