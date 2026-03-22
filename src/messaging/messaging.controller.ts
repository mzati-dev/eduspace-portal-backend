// src/modules/messaging/messaging.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req
} from '@nestjs/common';
import { MessagingService } from './messaging.service';

@Controller('messaging')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) { }

  // ============ CONTACTS ============
  @Get('contacts')
  async getContacts(
    @Query('role') role?: string,
    @Query('classId') classId?: string,
  ) {
    const data = await this.messagingService.getContacts(role, classId);
    return { success: true, data };
  }

  // ============ MESSAGES ============
  @Get('messages')
  async getMessages(
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.messagingService.getMessages(type, status);
    return { success: true, data };
  }

  @Get('messages/:id')
  async getMessageDetails(@Param('id') id: string) {
    const data = await this.messagingService.getMessageDetails(id);
    return { success: true, data };
  }

  @Post('send')
  async sendMessage(@Body() body: any, @Req() req) {
    const userId = req.user?.id || 'system';
    const data = await this.messagingService.sendMessage(body, userId);
    return { success: true, data };
  }

  @Delete('messages/:id')
  async deleteMessage(@Param('id') id: string) {
    await this.messagingService.deleteMessage(id);
    return { success: true, message: 'Message deleted successfully' };
  }

  @Post('messages/:id/resend')
  async resendMessage(@Param('id') id: string) {
    const data = await this.messagingService.resendMessage(id);
    return { success: true, data };
  }

  // ============ EVENTS ============
  @Get('events')
  async getEvents(
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const data = await this.messagingService.getEvents(status, fromDate, toDate);
    return { success: true, data };
  }

  @Post('events')
  async createEvent(@Body() body: any, @Req() req) {
    const userId = req.user?.id || 'system';
    const data = await this.messagingService.createEvent(body, userId);
    return { success: true, data };
  }

  @Patch('events/:id')
  async updateEvent(@Param('id') id: string, @Body() body: any) {
    const data = await this.messagingService.updateEvent(id, body);
    return { success: true, data };
  }

  @Delete('events/:id')
  async deleteEvent(@Param('id') id: string) {
    await this.messagingService.deleteEvent(id);
    return { success: true, message: 'Event deleted successfully' };
  }

  @Post('events/:id/reminders')
  async sendEventReminders(@Param('id') id: string) {
    await this.messagingService.sendEventReminders(id);
    return { success: true, message: 'Reminders sent successfully' };
  }

  // ============ BROADCASTS ============
  @Get('broadcasts')
  async getBroadcasts(@Query('status') status?: string) {
    const data = await this.messagingService.getBroadcasts(status);
    return { success: true, data };
  }

  @Post('broadcast')
  async sendBroadcast(@Body() body: any, @Req() req) {
    const userId = req.user?.id || 'system';
    const data = await this.messagingService.sendBroadcast(body, userId);
    return { success: true, data };
  }

  // ============ STATS ============
  @Get('stats')
  async getMessagingStats() {
    const data = await this.messagingService.getMessagingStats();
    return { success: true, data };
  }

  // ============ AUDIENCE ============
  @Get('audience/count')
  async getAudienceCount(
    @Query('audience') audience: string[],
    @Query('classId') classId?: string,
  ) {
    const data = await this.messagingService.getAudienceCount(audience, classId);
    return { success: true, data };
  }
}