// src/modules/teacher-messages/teacher-messages.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFiles,
  Req
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { TeacherMessagesService } from './teacher-messages.service';

@Controller('messages')
export class TeacherMessagesController {
  constructor(private readonly messagesService: TeacherMessagesService) { }

  @Get('parents')
  async getParents(@Query('teacherId') teacherId: string) {
    const data = await this.messagesService.getParents(teacherId);
    return { success: true, data };
  }

  @Get('inbox/:teacherId')
  async getInbox(@Param('teacherId') teacherId: string) {
    const data = await this.messagesService.getInbox(teacherId);
    return { success: true, data };
  }

  @Get('sent/:teacherId')
  async getSentMessages(@Param('teacherId') teacherId: string) {
    const data = await this.messagesService.getSentMessages(teacherId);
    return { success: true, data };
  }

  @Post('send')
  @UseInterceptors(FilesInterceptor('attachments'))
  async sendMessage(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req,
  ) {
    const data = await this.messagesService.sendMessage({
      ...body,
      attachments: files,
      teacherId: body.teacherId || req.user?.id,
    });
    return { success: true, data };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    await this.messagesService.markAsRead(id);
    return { success: true, message: 'Message marked as read' };
  }

  @Get('stats/:teacherId')
  async getStats(@Param('teacherId') teacherId: string) {
    const data = await this.messagesService.getStats(teacherId);
    return { success: true, data };
  }

  @Delete(':id')
  async deleteMessage(@Param('id') id: string) {
    await this.messagesService.deleteMessage(id);
    return { success: true, message: 'Message deleted' };
  }
}