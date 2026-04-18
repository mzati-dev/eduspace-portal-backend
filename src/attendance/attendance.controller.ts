// src/attendance/attendance.controller.ts
import { Controller, Get, Post, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) { }

    private handleError(error: unknown): { success: false; message: string } {
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, message };
    }

    // ========== ATTENDANCE CRUD ==========

    /**
     * Get attendance for a class on a specific date
     * GET /attendance/class/:classId?date=2024-03-20
     */
    @Get('class/:classId')
    async getByClassAndDate(
        @Param('classId') classId: string,
        @Query('date') date: string
    ) {
        try {
            const data = await this.attendanceService.getByClassAndDate(classId, date);
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Save a single attendance record
     * POST /attendance
     */
    @Post()
    async save(@Body() body: any) {
        try {
            const data = await this.attendanceService.saveSingle(body);
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Save multiple attendance records in batch
     * POST /attendance/batch
     */
    @Post('batch')
    async saveBatch(@Body() body: any) {
        try {
            const { records } = body;
            const data = await this.attendanceService.saveBatch(records);
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Mark all students in a class as present
     * POST /attendance/batch/mark-all-present
     */
    @Post('batch/mark-all-present')
    async markAllPresent(@Body() body: any) {
        try {
            const { classId, date, studentIds } = body;
            const data = await this.attendanceService.markAllPresent(classId, date, studentIds);
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    // ========== ATTENDANCE STATS ==========

    /**
     * Get weekly attendance stats for a class
     * GET /attendance/stats/weekly/:classId?startDate=2024-03-01&endDate=2024-03-07
     */
    @Get('stats/weekly/:classId')
    async getWeeklyStats(
        @Param('classId') classId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        try {
            const data = await this.attendanceService.getWeeklyStats(classId, startDate, endDate);
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get monthly attendance stats for a class
     * GET /attendance/stats/monthly/:classId?year=2024&month=3
     */
    @Get('stats/monthly/:classId')
    async getMonthlyStats(
        @Param('classId') classId: string,
        @Query('year') year: number,
        @Query('month') month: number
    ) {
        try {
            const data = await this.attendanceService.getMonthlyStats(classId, year, month);
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get term attendance stats for a class
     * GET /attendance/stats/term/:classId?termName=Term 1, 2025
     */
    @Get('stats/term/:classId')
    async getTermStats(
        @Param('classId') classId: string,
        @Query('termName') termName: string
    ) {
        try {
            const data = await this.attendanceService.getTermStats(classId, termName);
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get attendance summary for all teacher's classes
     * GET /attendance/stats/classes/:teacherId
     */
    @Get('stats/classes/:teacherId')
    async getClassSummaries(@Param('teacherId') teacherId: string) {
        try {
            const data = await this.attendanceService.getClassSummaries(teacherId);
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get top/bottom performing students by attendance
     * GET /attendance/stats/students/:classId?type=best&teacherId=xxx
     */
    @Get('stats/students/:classId')
    async getStudentPerformance(
        @Param('classId') classId: string,
        @Query('type') type: 'best' | 'needs-improvement'
    ) {
        try {
            const data = await this.attendanceService.getStudentPerformance(classId, type);
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    // ========== ATTENDANCE ALERTS ==========

    /**
     * Send attendance alerts to parents
     * POST /attendance/alerts/send
     */
    @Post('alerts/send')
    async sendAlerts(@Body() body: any) {
        try {
            const data = await this.attendanceService.sendAlerts(body);
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get alert history
     * GET /attendance/alerts/history?classId=xxx&limit=10
     */
    @Get('alerts/history')
    async getAlertHistory(
        @Query('classId') classId: string,
        @Query('limit') limit: number
    ) {
        try {
            const data = await this.attendanceService.getAlertHistory(classId, limit || 10);
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    // ========== ATTENDANCE PATTERNS & ANALYTICS ==========

    /**
     * Get attendance patterns for analytics
     * GET /attendance/analytics/patterns?classId=xxx&startDate=2024-03-01&endDate=2024-03-31
     */
    @Get('analytics/patterns')
    async getAttendancePatterns(
        @Query('classId') classId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        try {
            const data = await this.attendanceService.getAttendancePatterns(classId, startDate, endDate);
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get attendance analytics for a class
     * GET /attendance/analytics/class/:classId?startDate=2024-03-01&endDate=2024-03-31
     */
    @Get('analytics/class/:classId')
    async getAttendanceAnalytics(
        @Param('classId') classId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        try {
            const data = await this.attendanceService.getAttendanceAnalytics(classId, startDate, endDate);
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get class comparisons for analytics
     * GET /attendance/analytics/all-classes
     */
    /**
   * Get class comparisons for analytics
   * GET /attendance/analytics/all-classes
   */
    @Get('analytics/all-classes')
    async getClassComparisons(@Req() req) {
        try {
            const schoolId = req.user?.schoolId;
            const data = await this.attendanceService.getClassComparisons(schoolId);
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    // ========== STUDENT ATTENDANCE RATES ==========

    /**
     * Get attendance rate for a single student
     * GET /attendance/student/:studentId/rate
     */
    @Get('student/:studentId/rate')
    async getStudentAttendanceRate(@Param('studentId') studentId: string) {
        try {
            const data = await this.attendanceService.getStudentAttendanceRate(studentId);
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get attendance rates for all students
     * GET /attendance/students/all/rates
     */
    @Get('students/all/rates')
    async getAllStudentsAttendanceRates() {
        try {
            const data = await this.attendanceService.getAllStudentsAttendanceRates();
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get attendance rates for students in a specific class
     * GET /attendance/class/:classId/students/rates
     */
    @Get('class/:classId/students/rates')
    async getClassStudentsAttendanceRates(@Param('classId') classId: string) {
        try {
            const data = await this.attendanceService.getClassStudentsAttendanceRates(classId);
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get attendance history for a student with date range
     * GET /attendance/student/:studentId/history?startDate=2024-03-01&endDate=2024-03-31
     */
    @Get('student/:studentId/history')
    async getStudentAttendanceHistory(
        @Param('studentId') studentId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        try {
            const data = await this.attendanceService.getStudentAttendanceHistory(studentId, startDate, endDate);
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get attendance history for a student (simple version)
     * GET /attendance/student/:studentId
     */
    @Get('student/:studentId')
    async getByStudentId(@Param('studentId') studentId: string) {
        try {
            const data = await this.attendanceService.getByStudentId(studentId);
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    // ========== TERMS & HOLIDAYS ==========

    /**
     * Get current term
     * GET /attendance/current-term
     */
    @Get('current-term')
    async getCurrentTerm() {
        try {
            const data = await this.attendanceService.getCurrentTerm();
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get all available terms
     * GET /attendance/terms
     */
    @Get('terms')
    async getAllTerms() {
        try {
            const data = await this.attendanceService.getAllTerms();
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get term info for a specific class
     * GET /attendance/class/:classId/term
     */
    @Get('class/:classId/term')
    async getClassTerm(@Param('classId') classId: string) {
        try {
            const data = await this.attendanceService.getClassTerm(classId);
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get school holidays
     * GET /attendance/holidays/school
     */
    @Get('holidays/school')
    async getSchoolHolidays() {
        try {
            const data = await this.attendanceService.getSchoolHolidays();
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get school holidays for a specific class
     * GET /attendance/holidays/school/class/:classId
     */
    @Get('holidays/school/class/:classId')
    async getSchoolHolidaysByClass(@Param('classId') classId: string) {
        try {
            const data = await this.attendanceService.getSchoolHolidaysByClass(classId);
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get public holidays
     * GET /attendance/holidays/public
     */
    @Get('holidays/public')
    async getPublicHolidays() {
        try {
            const data = await this.attendanceService.getPublicHolidays();
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Get recorded days count for a class
     * GET /attendance/class/:classId/recorded-days-count
     */
    @Get('class/:classId/recorded-days-count')
    async getRecordedDaysCount(@Param('classId') classId: string) {
        try {
            const data = await this.attendanceService.getRecordedDaysCount(classId);
            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Add a school holiday
     * POST /attendance/holidays/school
     */
    @Post('holidays/school')
    async addSchoolHoliday(@Body() body: { date: string; classId: string; reason: string }) {
        try {
            await this.attendanceService.addSchoolHoliday(body.date, body.classId, body.reason);
            return { success: true, message: 'School holiday added successfully' };
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Remove a school holiday
     * DELETE /attendance/holidays/school/:date?classId=xxx
     */
    @Delete('holidays/school/:date')
    async removeSchoolHoliday(
        @Param('date') date: string,
        @Query('classId') classId: string
    ) {
        try {
            await this.attendanceService.removeSchoolHoliday(date, classId);
            return { success: true, message: 'School holiday removed successfully' };
        } catch (error) {
            return this.handleError(error);
        }
    }
}