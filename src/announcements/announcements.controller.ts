// src/modules/announcements/announcements.controller.ts

import { Controller, Get, Post, Body, Patch, Delete, Param, Query, Headers, BadRequestException } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';

@Controller('api/announcements')
export class AnnouncementsController {
    constructor(private readonly announcementsService: AnnouncementsService) { }

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
        return this.announcementsService.create(body, userId, userRole, schoolId);
    }

    @Get()
    async findAll(@Query('schoolId') schoolId?: string) {
        return this.announcementsService.findAll(schoolId);
    }

    @Get(':id')
    async findOne(
        @Param('id') id: string,
        @Query('schoolId') schoolId?: string
    ) {
        return this.announcementsService.findOne(id, schoolId);
    }

    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() body: any,
        @Query('schoolId') schoolId?: string
    ) {
        return this.announcementsService.update(id, body, schoolId);
    }

    @Delete(':id')
    async remove(
        @Param('id') id: string,
        @Query('schoolId') schoolId?: string
    ) {
        return this.announcementsService.remove(id, schoolId);
    }

    @Post(':id/read')
    async markAsRead(
        @Param('id') id: string,
        @Headers('x-user-id') userId?: string,
        @Headers('x-user-role') userRole?: string,
        @Query('schoolId') schoolId?: string
    ) {
        if (!userId || !userRole) {
            throw new BadRequestException('User ID and Role are required');
        }
        return this.announcementsService.markAsRead(id, userId, userRole, schoolId);
    }

    @Get(':id/read/count')
    async getReadCount(
        @Param('id') id: string,
        @Query('schoolId') schoolId?: string
    ) {
        return this.announcementsService.getReadCount(id, schoolId);
    }
}