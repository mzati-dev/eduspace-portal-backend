// src/modules/timetable/timetable.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Res, UseGuards, Req } from '@nestjs/common';
import { Response } from 'express';
import { TimetableService } from './timetable.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('timetable/admin')
@UseGuards(AuthGuard('jwt'))
export class TimetableController {
    constructor(private readonly timetableService: TimetableService) { }

    // ============ TIME SLOTS ============
    @Get('time-slots')
    async getTimeSlots() {
        const data = await this.timetableService.getTimeSlots();
        return { success: true, data };
    }

    // ============ TIMETABLE ENTRIES ============
    @Get('entries')
    async getTimetableEntries(
        @Req() req,
        @Query('classId') classId?: string,
        @Query('term') term?: string,
        @Query('weekStart') weekStart?: string,
        @Query('teacherId') teacherId?: string,
    ) {
        const schoolId = req.user?.schoolId;
        const data = await this.timetableService.getTimetableEntries(schoolId, {
            classId,
            term,
            weekStart,
            teacherId,
        });
        return { success: true, data };
    }

    @Post('entries')
    async createTimetableEntry(
        @Req() req,
        @Body() body: any,
    ) {
        const schoolId = req.user?.schoolId;
        const data = await this.timetableService.createTimetableEntry(schoolId, body);
        return { success: true, data };
    }

    @Patch('entries/:id')
    async updateTimetableEntry(
        @Req() req,
        @Param('id') id: string,
        @Body() body: any,
    ) {
        const schoolId = req.user?.schoolId;
        const data = await this.timetableService.updateTimetableEntry(schoolId, id, body);
        return { success: true, data };
    }

    @Delete('entries/:id')
    async deleteTimetableEntry(
        @Req() req,
        @Param('id') id: string,
    ) {
        const schoolId = req.user?.schoolId;
        await this.timetableService.deleteTimetableEntry(schoolId, id);
        return { success: true, message: 'Entry deleted successfully' };
    }

    @Post('entries/bulk')
    async bulkCreateEntries(
        @Req() req,
        @Body() body: { entries: any[] },
    ) {
        const schoolId = req.user?.schoolId;
        const data = await this.timetableService.bulkCreateEntries(schoolId, body.entries);
        return { success: true, data };
    }

    // ============ COPY WEEK ============
    @Post('copy-week')
    async copyTimetableWeek(
        @Req() req,
        @Body() body: { sourceWeek: string; targetWeek: string; classId?: string },
    ) {
        const schoolId = req.user?.schoolId;
        const data = await this.timetableService.copyTimetableWeek(
            schoolId,
            body.sourceWeek,
            body.targetWeek,
            body.classId,
        );
        return { success: true, data };
    }

    // ============ PUBLISH ============
    @Post('publish')
    async publishTimetable(
        @Req() req,
        @Body() body: { classId: string; term: string; weekStart?: string },
    ) {
        const schoolId = req.user?.schoolId;
        await this.timetableService.publishTimetable(schoolId, body.classId, body.term, body.weekStart);
        return { success: true, message: 'Timetable published successfully' };
    }

    // ============ STATS ============
    @Get('stats')
    async getTimetableStats(
        @Req() req,
        @Query('classId') classId?: string,
        @Query('term') term?: string,
        @Query('weekStart') weekStart?: string,
    ) {
        const schoolId = req.user?.schoolId;
        const data = await this.timetableService.getTimetableStats(schoolId, {
            classId,
            term,
            weekStart,
        });
        return { success: true, data };
    }

    // ============ CONFLICTS ============
    @Get('conflicts')
    async checkConflicts(
        @Req() req,
        @Query('classId') classId?: string,
        @Query('term') term?: string,
        @Query('weekStart') weekStart?: string,
    ) {
        const schoolId = req.user?.schoolId;
        const data = await this.timetableService.checkConflicts(schoolId, {
            classId,
            term,
            weekStart,
        });
        return { success: true, data };
    }

    // ============ EXPORT/IMPORT ============
    @Get('export')
    async exportTimetable(
        @Req() req,
        @Res() res: Response,
        @Query('format') format: string,
        @Query('classId') classId?: string,
        @Query('term') term?: string,
        @Query('weekStart') weekStart?: string,
    ) {
        const schoolId = req.user?.schoolId;
        const { buffer, filename } = await this.timetableService.exportTimetable(
            schoolId,
            format,
            { classId, term, weekStart }
        );

        const contentType = format === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }

    // @Post('import')
    // async importTimetable(
    //     @Req() req,
    //     @Body() body: { classId: string; term: string; weekStart?: string },
    //     @Body('file') file: any,
    // ) {
    //     const schoolId = req.user?.schoolId;
    //     // Note: File upload handling would need multer - simplified for now
    //     const data = await this.timetableService.importTimetable(
    //         schoolId,
    //         body.classId,
    //         body.term,
    //         body.weekStart,
    //         file,
    //     );
    //     return { success: true, data };
    // }

    // ============ TEMPLATES ============
    @Get('templates')
    async getTemplates(@Req() req) {
        const schoolId = req.user?.schoolId;
        const data = await this.timetableService.getTemplates(schoolId);
        return { success: true, data };
    }

    @Post('templates')
    async createTemplate(
        @Req() req,
        @Body() body: { name: string; data: any },
    ) {
        const schoolId = req.user?.schoolId;
        const userId = req.user?.id;
        const data = await this.timetableService.createTemplate(schoolId, userId, body.name, body.data);
        return { success: true, data };
    }

    @Post('generate-from-template')
    async generateFromTemplate(
        @Req() req,
        @Body() body: { templateId: string; classId: string; term: string; weekStart?: string },
    ) {
        const schoolId = req.user?.schoolId;
        const data = await this.timetableService.generateFromTemplate(
            schoolId,
            body.templateId,
            body.classId,
            body.term,
            body.weekStart,
        );
        return { success: true, data };
    }

    @Delete('templates/:id')
    async deleteTemplate(
        @Req() req,
        @Param('id') id: string,
    ) {
        const schoolId = req.user?.schoolId;
        await this.timetableService.deleteTemplate(schoolId, id);
        return { success: true, message: 'Template deleted successfully' };
    }

    @Patch('time-slots/:id')
    async updateTimeSlot(
        @Req() req,
        @Param('id') id: string,
        @Body() body: { startTime: string; endTime: string; break: boolean },
    ) {
        const schoolId = req.user?.schoolId;
        const data = await this.timetableService.updateTimeSlot(id, body);
        return { success: true, data };
    }
}