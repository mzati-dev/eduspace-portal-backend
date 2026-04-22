// src/analytics/analytics.controller.ts
import { Controller, Get, Post, Body, Param, Query, Res, Req, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'))
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    // ========== ADMIN ANALYTICS ==========

    @Get('dashboard')
    async getDashboardAnalytics(
        @Req() req,
        @Query('term') term: string,
        @Query('classId') classId?: string,
    ): Promise<{ success: boolean; data: any }> {
        const schoolId = req.user?.schoolId;
        const data = await this.analyticsService.getDashboardAnalytics(term, schoolId, classId);
        return { success: true, data };
    }

    @Get('student/:studentId')
    async getStudentDetail(
        @Req() req,
        @Param('studentId') studentId: string,
        @Query('term') term: string,
    ): Promise<{ success: boolean; data: any }> {
        const schoolId = req.user?.schoolId;
        const data = await this.analyticsService.getStudentDetail(studentId, term, schoolId);
        return { success: true, data };
    }

    @Get('compare')
    async getCompareTermsData(
        @Req() req,
        @Query('term1') term1: string,
        @Query('term2') term2: string,
        @Query('classId') classId?: string,
    ): Promise<{ success: boolean; data: any }> {
        const schoolId = req.user?.schoolId;
        const data = await this.analyticsService.getCompareTermsData(term1, term2, schoolId, classId);
        return { success: true, data };
    }

    @Get('grade/:gradeName/students')
    async getGradeStudents(
        @Req() req,
        @Param('gradeName') gradeName: string,
        @Query('term') term: string,
    ): Promise<{ success: boolean; data: any[] }> {
        const schoolId = req.user?.schoolId;
        const data = await this.analyticsService.getGradeStudents(gradeName, term, schoolId);
        return { success: true, data };
    }

    @Get('terms')
    async getAvailableTerms(
        @Req() req,
    ): Promise<{ success: boolean; data: { value: string; label: string }[] }> {
        const schoolId = req.user?.schoolId;
        const data = await this.analyticsService.getAvailableTerms(schoolId);
        return { success: true, data };
    }

    // ========== TEACHER ANALYTICS ==========

    @Get('teacher/:teacherId/dashboard')
    async getTeacherDashboardAnalytics(
        @Req() req,
        @Param('teacherId') teacherId: string,
        @Query('term') term: string,
        @Query('classId') classId?: string,
    ): Promise<{ success: boolean; data: any }> {
        const schoolId = req.user?.schoolId;
        const data = await this.analyticsService.getTeacherDashboardAnalytics(teacherId, term, schoolId, classId);
        return { success: true, data };
    }

    @Get('teacher/student/:studentId')
    async getTeacherStudentDetail(
        @Req() req,
        @Param('studentId') studentId: string,
        @Query('term') term: string,
    ): Promise<{ success: boolean; data: any }> {
        const schoolId = req.user?.schoolId;
        const data = await this.analyticsService.getTeacherStudentDetail(studentId, term, schoolId);
        return { success: true, data };
    }

    @Get('teacher/:teacherId/compare')
    async getTeacherCompareTermsData(
        @Req() req,
        @Param('teacherId') teacherId: string,
        @Query('term1') term1: string,
        @Query('term2') term2: string,
        @Query('classId') classId?: string,
    ): Promise<{ success: boolean; data: any }> {
        const schoolId = req.user?.schoolId;
        const data = await this.analyticsService.getTeacherCompareTermsData(teacherId, term1, term2, schoolId, classId);
        return { success: true, data };
    }

    @Get('teacher/:teacherId/grade/:className/students')
    async getTeacherGradeStudents(
        @Req() req,
        @Param('teacherId') teacherId: string,
        @Param('className') className: string,
        @Query('term') term: string,
    ): Promise<{ success: boolean; data: any[] }> {
        const schoolId = req.user?.schoolId;
        const data = await this.analyticsService.getTeacherGradeStudents(teacherId, className, term, schoolId);
        return { success: true, data };
    }

    // ========== OLD ENDPOINTS (PRESERVED FOR COMPATIBILITY) ==========

    @Get('at-risk')
    async getAtRiskStudents(
        @Req() req,
        @Query('classId') classId?: string,
        @Query('timeframe') timeframe?: string,
    ): Promise<{ success: boolean; data: any[] }> {
        const schoolId = req.user?.schoolId;
        // This is a placeholder - implement if needed
        return { success: true, data: [] };
    }

    @Get('classes')
    async getClassPerformance(
        @Req() req,
        @Query('timeframe') timeframe?: string
    ): Promise<{ success: boolean; data: any[] }> {
        const schoolId = req.user?.schoolId;
        return { success: true, data: [] };
    }

    @Get('subjects')
    async getSubjectPerformance(
        @Req() req,
        @Query('timeframe') timeframe?: string
    ): Promise<{ success: boolean; data: any[] }> {
        const schoolId = req.user?.schoolId;
        return { success: true, data: [] };
    }

    @Get('trends/:metric')
    async getTrendData(
        @Req() req,
        @Param('metric') metric: string,
        @Query('timeframe') timeframe: string,
        @Query('classId') classId?: string,
    ): Promise<{ success: boolean; data: any[] }> {
        const schoolId = req.user?.schoolId;
        return { success: true, data: [] };
    }

    @Get('metrics')
    async getKeyMetrics(
        @Req() req,
        @Query('timeframe') timeframe?: string,
        @Query('classId') classId?: string,
    ): Promise<{ success: boolean; data: any }> {
        const schoolId = req.user?.schoolId;
        return { success: true, data: {} };
    }

    @Get('predictions')
    async getPredictionSummary(
        @Req() req,
        @Query('timeframe') timeframe?: string
    ): Promise<{ success: boolean; data: any }> {
        const schoolId = req.user?.schoolId;
        return { success: true, data: {} };
    }

    @Get('interventions')
    async getInterventionSummary(
        @Req() req
    ): Promise<{ success: boolean; data: any }> {
        const schoolId = req.user?.schoolId;
        return { success: true, data: {} };
    }

    @Post('predictions/generate')
    async generatePredictions(
        @Req() req
    ): Promise<{ success: boolean; message: string; data: any }> {
        const schoolId = req.user?.schoolId;
        return { success: true, message: 'Predictions generated', data: {} };
    }

    @Get('export')
    async exportReport(
        @Req() req,
        @Res() res: Response,
        @Query('format') format: string,
        @Query('timeframe') timeframe?: string,
        @Query('classId') classId?: string,
    ): Promise<void> {
        const schoolId = req.user?.schoolId;
        const filename = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
        const buffer = Buffer.from(JSON.stringify({ message: 'Export placeholder' }));

        res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }
}
