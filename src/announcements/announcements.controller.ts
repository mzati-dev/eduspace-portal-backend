// src/modules/announcements/announcements.controller.ts

import { Controller, Get, Post, Body, Patch, Delete, Param, Request } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';

@Controller('announcements')
export class AnnouncementsController {
    constructor(private readonly announcementsService: AnnouncementsService) { }

    @Post()
    create(@Body() body: any, @Request() req) {
        return this.announcementsService.create(
            body,
            req.user.id,
            req.user.role,
            req.user.schoolId,
        );
    }

    @Get()
    findAll(@Request() req) {
        return this.announcementsService.findAll(req.user.schoolId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.announcementsService.findOne(id, req.user.schoolId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any, @Request() req) {
        return this.announcementsService.update(id, body, req.user.schoolId);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.announcementsService.remove(id, req.user.schoolId);
    }

    @Post(':id/read')
    markAsRead(@Param('id') id: string, @Request() req) {
        return this.announcementsService.markAsRead(
            id,
            req.user.id,
            req.user.role,
            req.user.schoolId,
        );
    }

    @Get(':id/read/count')
    getReadCount(@Param('id') id: string, @Request() req) {
        return this.announcementsService.getReadCount(id, req.user.schoolId);
    }
}