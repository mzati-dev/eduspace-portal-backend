// src/modules/reminders/reminders.controller.ts

import { Controller, Get, Post, Body, Delete, Param, Request } from '@nestjs/common';
import { RemindersService } from './reminders.service';

@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) { }

  @Post()
  create(@Body() body: any, @Request() req) {
    return this.remindersService.create(
      body,
      req.user.id,
      req.user.role,
      req.user.schoolId,
    );
  }

  @Get()
  findAll(@Request() req) {
    return this.remindersService.findAll(req.user.schoolId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.remindersService.remove(id, req.user.schoolId);
  }
}