import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) { }

    /**
     * Get attendance for a class on a specific date
     * GET /attendance/class/:classId?date=2024-03-20
     */
    @Get('class/:classId')
    async getByClassAndDate(
        @Param('classId') classId: string,
        @Query('date') date: string,
        @Query('teacherId') teacherId: string
    ) {
        try {
            const data = await this.attendanceService.getByClassAndDate(classId, date, teacherId);
            return { success: true, data };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Save a single attendance record
     * POST /attendance
     */
    @Post()
    async save(@Body() body: any) {
        try {
            const { teacherId, ...record } = body;
            const data = await this.attendanceService.save(record, teacherId);
            return { success: true, data };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Save multiple attendance records in batch
     * POST /attendance/batch
     */
    @Post('batch')
    async saveBatch(@Body() body: any) {
        try {
            const { teacherId, records } = body;
            const data = await this.attendanceService.saveBatch(records, teacherId);
            return { success: true, data };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Mark all students in a class as present
     * POST /attendance/batch/mark-all-present
     */
    @Post('batch/mark-all-present')
    async markAllPresent(@Body() body: any) {
        try {
            const { classId, date, studentIds, teacherId } = body;
            const data = await this.attendanceService.markAllPresent(classId, date, studentIds, teacherId);
            return { success: true, data };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Get weekly attendance stats for a class
     * GET /attendance/stats/weekly/:classId?startDate=2024-03-01&endDate=2024-03-07&teacherId=xxx
     */
    @Get('stats/weekly/:classId')
    async getWeeklyStats(
        @Param('classId') classId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('teacherId') teacherId: string
    ) {
        try {
            const data = await this.attendanceService.getWeeklyStats(classId, startDate, endDate, teacherId);
            return { success: true, data };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Get attendance summaries for all classes a teacher has access to
     * GET /attendance/stats/classes/:teacherId
     */
    @Get('stats/classes/:teacherId')
    async getClassSummaries(@Param('teacherId') teacherId: string) {
        try {
            const data = await this.attendanceService.getClassSummaries(teacherId);
            return { success: true, data };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Get top/bottom performing students by attendance
     * GET /attendance/stats/students/:classId?type=best&limit=3&teacherId=xxx
     */
    @Get('stats/students/:classId')
    async getStudentPerformance(
        @Param('classId') classId: string,
        @Query('type') type: 'best' | 'needs-improvement',

        @Query('teacherId') teacherId: string
    ) {
        try {
            const data = await this.attendanceService.getStudentPerformance(
                classId,
                type,

                teacherId
            );
            return { success: true, data };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Send attendance alerts to parents
     * POST /attendance/alerts/send
     */
    @Post('alerts/send')
    async sendAlerts(@Body() body: any) {
        try {
            const { teacherId, ...alertData } = body;
            const data = await this.attendanceService.sendAlerts(alertData, teacherId);
            return { success: true, data };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Get alert history
     * GET /attendance/alerts/history?classId=xxx&limit=10&teacherId=xxx
     */
    @Get('alerts/history')
    async getAlertHistory(
        @Query('classId') classId: string,
        @Query('limit') limit: number,
        @Query('teacherId') teacherId: string
    ) {
        try {
            const data = await this.attendanceService.getAlertHistory(
                classId,
                limit || 10,
                teacherId
            );
            return { success: true, data };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
    @Get('analytics/patterns')
    async getAttendancePatterns(
        @Query('classId') classId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('teacherId') teacherId: string
    ) {
        try {
            const data = await this.attendanceService.getAttendancePatterns(classId, startDate, endDate, teacherId);
            return { success: true, data };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}