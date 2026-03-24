import {
    Controller,
    Get,
    Param,
    Query,
    Res,
    StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { TimetableTeacherService } from './timetable-teacher.service';

@Controller('timetable/teacher')
export class TimetableTeacherController {
    constructor(private readonly timetableTeacherService: TimetableTeacherService) { }

    // Fetch teacher's timetable for a specific week
    @Get(':teacherId')
    async getTeacherTimetable(
        @Param('teacherId') teacherId: string,
        @Query('weekStart') weekStart?: string,
    ) {
        return this.timetableTeacherService.fetchTeacherTimetable(teacherId, weekStart);
    }

    // Fetch teacher's timetable for a specific day
    @Get(':teacherId/day')
    async getTeacherDayTimetable(
        @Param('teacherId') teacherId: string,
        @Query('date') date: string,
    ) {
        return this.timetableTeacherService.fetchTeacherDayTimetable(teacherId, date);
    }

    // Get timetable statistics
    @Get(':teacherId/stats')
    async getTimetableStats(
        @Param('teacherId') teacherId: string,
        @Query('weekStart') weekStart?: string,
    ) {
        return this.timetableTeacherService.fetchTimetableStats(teacherId, weekStart);
    }

    // Export timetable as PDF/Excel
    @Get(':teacherId/export')
    async exportTimetable(
        @Param('teacherId') teacherId: string,
        @Query('format') format: 'pdf' | 'excel',
        @Res({ passthrough: true }) res: Response,
        @Query('weekStart') weekStart?: string,
    ) {
        const data = await this.timetableTeacherService.exportTimetable(teacherId, format, weekStart);

        if (format === 'pdf') {
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="timetable-${weekStart || 'current'}.pdf"`,
            });
        } else {
            res.set({
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="timetable-${weekStart || 'current'}.xlsx"`,
            });
        }

        return new StreamableFile(Buffer.from(JSON.stringify(data)));
    }

    // Get upcoming alerts/notifications
    @Get(':teacherId/alerts')
    async getUpcomingAlerts(@Param('teacherId') teacherId: string) {
        return this.timetableTeacherService.fetchUpcomingAlerts(teacherId);
    }
}