// src/modules/reminders/reminders.controller.ts

import { Controller, Get, Post, Body, Delete, Param, Query, Headers, BadRequestException } from '@nestjs/common';
import { RemindersService } from './reminders.service';

@Controller('api/reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) { }

  @Post()
  async create(
    @Body() body: any,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-role') userRole?: string,
    @Query('schoolId') schoolId?: string
  ) {
    if (!userId || !userRole) {
      throw new BadRequestException('User ID and Role are required');
    }
    return this.remindersService.create(body, userId, userRole, schoolId);
  }

  @Get()
  async findAll(@Query('schoolId') schoolId?: string) {
    return this.remindersService.findAll(schoolId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Query('schoolId') schoolId?: string
  ) {
    return this.remindersService.remove(id, schoolId);
  }
}