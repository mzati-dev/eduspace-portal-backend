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

  // ============= PARENTS =============
  @Get('parents')
  async getParents(@Query('teacherId') teacherId: string) {
    const data = await this.messagesService.getParents(teacherId);
    return { success: true, data };
  }

  // ============= ADMINS =============
  @Get('admins')
  async getAdmins() {
    const data = await this.messagesService.getAdmins();
    return { success: true, data };
  }

  // ============= INBOX =============
  @Get('inbox/:teacherId')
  async getInbox(@Param('teacherId') teacherId: string) {
    const data = await this.messagesService.getInbox(teacherId);
    return { success: true, data };
  }

  // ============= SENT MESSAGES =============
  @Get('sent/:teacherId')
  async getSentMessages(@Param('teacherId') teacherId: string) {
    const data = await this.messagesService.getSentMessages(teacherId);
    return { success: true, data };
  }

  // ============= SEND MESSAGE =============
  @Post('send')
  @UseInterceptors(FilesInterceptor('attachments'))
  async sendMessage(
    @Body() body: any,
    @UploadedFiles() files: any[],
    @Req() req,
  ) {
    const data = await this.messagesService.sendMessage({
      ...body,
      attachments: files,
      teacherId: body.teacherId || req.user?.id,
      teacherName: req.user?.name,
    });
    return { success: true, data };
  }

  // ============= MARK MESSAGE AS READ =============
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    await this.messagesService.markAsRead(id);
    return { success: true, message: 'Message marked as read' };
  }

  // ============= GET MESSAGE STATS =============
  @Get('stats/:teacherId')
  async getStats(@Param('teacherId') teacherId: string) {
    const data = await this.messagesService.getStats(teacherId);
    return { success: true, data };
  }

  // ============= DELETE MESSAGE =============
  @Delete(':id')
  async deleteMessage(@Param('id') id: string) {
    await this.messagesService.deleteMessage(id);
    return { success: true, message: 'Message deleted' };
  }

  // ============= ANNOUNCEMENTS =============
  @Get('announcements')
  async getAnnouncements(
    @Query('userId') userId: string,
    @Query('role') role: string,
  ) {
    const data = await this.messagesService.getAnnouncements(userId, role);
    return { success: true, data };
  }

  @Post('announcements')
  @UseInterceptors(FilesInterceptor('attachments'))
  async createAnnouncement(
    @Body() body: any,
    @UploadedFiles() files: any[],
    @Req() req,
  ) {
    const data = await this.messagesService.createAnnouncement({
      ...body,
      attachments: files,
      userId: body.userId || req.user?.id,
      userName: req.user?.name,
      userRole: body.userRole || req.user?.role,
    });
    return { success: true, data };
  }

  @Patch('announcements/:announcementId')
  async updateAnnouncement(
    @Param('announcementId') announcementId: string,
    @Body() body: any,
  ) {
    const data = await this.messagesService.updateAnnouncement(announcementId, body);
    return { success: true, data };
  }

  @Delete('announcements/:announcementId')
  async deleteAnnouncement(@Param('announcementId') announcementId: string) {
    await this.messagesService.deleteAnnouncement(announcementId);
    return { success: true, message: 'Announcement deleted' };
  }

  @Post('announcements/:announcementId/read')
  async markAnnouncementAsRead(
    @Param('announcementId') announcementId: string,
    @Body() body: { userId: string },
  ) {
    await this.messagesService.markAnnouncementAsRead(announcementId, body.userId);
    return { success: true, message: 'Announcement marked as read' };
  }

  @Get('announcements/stats/:userId')
  async getAnnouncementStats(@Param('userId') userId: string) {
    const data = await this.messagesService.getAnnouncementStats(userId);
    return { success: true, data };
  }
}


// // src/modules/teacher-messages/teacher-messages.controller.ts
// import {
//   Controller,
//   Get,
//   Post,
//   Patch,
//   Delete,
//   Param,
//   Query,
//   Body,
//   UseInterceptors,
//   UploadedFiles,
//   Req
// } from '@nestjs/common';
// import { FilesInterceptor } from '@nestjs/platform-express';
// import { TeacherMessagesService } from './teacher-messages.service';

// @Controller('messages')
// export class TeacherMessagesController {
//   constructor(private readonly messagesService: TeacherMessagesService) { }

//   @Get('parents')
//   async getParents(@Query('teacherId') teacherId: string) {
//     const data = await this.messagesService.getParents(teacherId);
//     return { success: true, data };
//   }

//   @Get('inbox/:teacherId')
//   async getInbox(@Param('teacherId') teacherId: string) {
//     const data = await this.messagesService.getInbox(teacherId);
//     return { success: true, data };
//   }

//   @Get('sent/:teacherId')
//   async getSentMessages(@Param('teacherId') teacherId: string) {
//     const data = await this.messagesService.getSentMessages(teacherId);
//     return { success: true, data };
//   }

//   @Post('send')
//   @UseInterceptors(FilesInterceptor('attachments'))
//   async sendMessage(
//     @Body() body: any,
//     @UploadedFiles() files: any[], // ← CHANGE THIS LINE
//     @Req() req,
//   ) {
//     const data = await this.messagesService.sendMessage({
//       ...body,
//       attachments: files,
//       teacherId: body.teacherId || req.user?.id,
//     });
//     return { success: true, data };
//   }

//   @Patch(':id/read')
//   async markAsRead(@Param('id') id: string) {
//     await this.messagesService.markAsRead(id);
//     return { success: true, message: 'Message marked as read' };
//   }

//   @Get('stats/:teacherId')
//   async getStats(@Param('teacherId') teacherId: string) {
//     const data = await this.messagesService.getStats(teacherId);
//     return { success: true, data };
//   }

//   @Delete(':id')
//   async deleteMessage(@Param('id') id: string) {
//     await this.messagesService.deleteMessage(id);
//     return { success: true, message: 'Message deleted' };
//   }
// }