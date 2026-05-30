// src/modules/messages/messages.controller.ts

import { Controller, Get, Post, Body, Delete, Param, Query, Headers, BadRequestException } from '@nestjs/common';
import { MessagesService } from './messages.service';

@Controller('api/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) { }

  @Post()
  async sendMessage(
    @Body() body: any,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-role') userRole?: string,
    @Query('schoolId') schoolId?: string
  ) {
    if (!userId || !userRole) {
      throw new BadRequestException('User ID and Role are required');
    }
    return this.messagesService.sendMessage(body, userId, userRole, schoolId);
  }

  @Get('conversations')
  async getConversations(
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-role') userRole?: string,
    @Query('schoolId') schoolId?: string
  ) {
    if (!userId || !userRole) {
      throw new BadRequestException('User ID and Role are required');
    }
    return this.messagesService.getConversations(userId, userRole, schoolId);
  }

  @Get('conversations/:id')
  async getConversationMessages(
    @Param('id') id: string,
    @Headers('x-user-id') userId?: string,
    @Query('schoolId') schoolId?: string
  ) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    return this.messagesService.getConversationMessages(id, userId, schoolId);
  }

  @Get('unread/count')
  async getUnreadCount(
    @Headers('x-user-id') userId?: string,
    @Query('schoolId') schoolId?: string
  ) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    return this.messagesService.getUnreadCount(userId, schoolId);
  }

  @Delete(':id')
  async deleteMessage(
    @Param('id') id: string,
    @Headers('x-user-id') userId?: string,
    @Query('schoolId') schoolId?: string
  ) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    return this.messagesService.deleteMessage(id, userId, schoolId);
  }

  @Get('whatsapp-link/:recipientId/:recipientRole')
  async getWhatsAppLink(
    @Param('recipientId') recipientId: string,
    @Param('recipientRole') recipientRole: string,
    @Query('message') message: string,
  ) {
    return this.messagesService.getWhatsAppLink(recipientId, recipientRole, message);
  }
}

// // src/modules/messages/messages.controller.ts

// import { Controller, Get, Post, Body, Delete, Param, Query, Headers, BadRequestException } from '@nestjs/common';
// import { MessagesService } from './messages.service';

// @Controller('api/messages')
// export class MessagesController {
//   constructor(private readonly messagesService: MessagesService) { }

//   @Post()
//   async sendMessage(
//     @Body() body: any,
//     @Headers('x-user-id') userId?: string,
//     @Headers('x-user-role') userRole?: string,
//     @Query('schoolId') schoolId?: string
//   ) {
//     if (!userId || !userRole) {
//       throw new BadRequestException('User ID and Role are required');
//     }
//     return this.messagesService.sendMessage(body, userId, userRole, schoolId);
//   }

//   @Get('conversations')
//   async getConversations(
//     @Headers('x-user-id') userId?: string,
//     @Headers('x-user-role') userRole?: string,
//     @Query('schoolId') schoolId?: string
//   ) {
//     if (!userId || !userRole) {
//       throw new BadRequestException('User ID and Role are required');
//     }
//     return this.messagesService.getConversations(userId, userRole, schoolId);
//   }

//   @Get('conversations/:id')
//   async getConversationMessages(
//     @Param('id') id: string,
//     @Headers('x-user-id') userId?: string,
//     @Query('schoolId') schoolId?: string
//   ) {
//     if (!userId) {
//       throw new BadRequestException('User ID is required');
//     }
//     return this.messagesService.getConversationMessages(id, userId, schoolId);
//   }

//   @Get('unread/count')
//   async getUnreadCount(
//     @Headers('x-user-id') userId?: string,
//     @Query('schoolId') schoolId?: string
//   ) {
//     if (!userId) {
//       throw new BadRequestException('User ID is required');
//     }
//     return this.messagesService.getUnreadCount(userId, schoolId);
//   }

//   @Delete(':id')
//   async deleteMessage(
//     @Param('id') id: string,
//     @Headers('x-user-id') userId?: string,
//     @Query('schoolId') schoolId?: string
//   ) {
//     if (!userId) {
//       throw new BadRequestException('User ID is required');
//     }
//     return this.messagesService.deleteMessage(id, userId, schoolId);
//   }
// }