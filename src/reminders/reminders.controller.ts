import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { RemindersService } from './reminders.service';

@Controller('api/reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) { }

  @Get()
  async findAll(@Query('schoolId') schoolId?: string) {
    return this.remindersService.findAll(schoolId);
  }

  @Post()
  async create(@Body() data: any, @Query('schoolId') schoolId?: string) {
    return this.remindersService.create(data, schoolId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updates: any, @Query('schoolId') schoolId?: string) {
    return this.remindersService.update(id, updates, schoolId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Query('schoolId') schoolId?: string) {
    return this.remindersService.delete(id, schoolId);
  }
}