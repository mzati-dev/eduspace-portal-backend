// src/analytics/analytics.controller.ts
import { Controller, Get, Post, Query, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { AnalyticsService, AtRiskStudent, ClassPerformance, SubjectPerformance, TrendData } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('at-risk')
    async getAtRiskStudents(
        @Query('classId') classId?: string,
        @Query('timeframe') timeframe?: string,
    ): Promise<{ success: boolean; data: AtRiskStudent[] }> {
        const data = await this.analyticsService.getAtRiskStudents(classId, timeframe);
        return { success: true, data };
    }

    @Get('classes')
    async getClassPerformance(
        @Query('timeframe') timeframe?: string
    ): Promise<{ success: boolean; data: ClassPerformance[] }> {
        const data = await this.analyticsService.getClassPerformance(timeframe);
        return { success: true, data };
    }

    @Get('subjects')
    async getSubjectPerformance(
        @Query('timeframe') timeframe?: string
    ): Promise<{ success: boolean; data: SubjectPerformance[] }> {
        const data = await this.analyticsService.getSubjectPerformance(timeframe);
        return { success: true, data };
    }

    @Get('trends/:metric')
    async getTrendData(
        @Param('metric') metric: string,
        @Query('timeframe') timeframe: string,
        @Query('classId') classId?: string,
    ): Promise<{ success: boolean; data: TrendData[] }> {
        const data = await this.analyticsService.getTrendData(metric, timeframe, classId);
        return { success: true, data };
    }

    @Get('metrics')
    async getKeyMetrics(
        @Query('timeframe') timeframe?: string,
        @Query('classId') classId?: string,
    ): Promise<{ success: boolean; data: any }> {
        const data = await this.analyticsService.getKeyMetrics(timeframe, classId);
        return { success: true, data };
    }

    @Get('predictions')
    async getPredictionSummary(
        @Query('timeframe') timeframe?: string
    ): Promise<{ success: boolean; data: any }> {
        const data = await this.analyticsService.getPredictionSummary(timeframe);
        return { success: true, data };
    }

    @Get('interventions')
    async getInterventionSummary(): Promise<{ success: boolean; data: any }> {
        const data = await this.analyticsService.getInterventionSummary();
        return { success: true, data };
    }

    @Post('predictions/generate')
    async generatePredictions(): Promise<{ success: boolean; message: string; data: any }> {
        const data = await this.analyticsService.generatePredictions();
        return { success: true, message: 'Predictions generated successfully', data };
    }

    @Get('export')
    async exportReport(
        @Res() res: Response,
        @Query('format') format: string,
        @Query('timeframe') timeframe?: string,
        @Query('classId') classId?: string,
    ): Promise<void> {
        const { buffer, filename } = await this.analyticsService.exportReport(
            format,
            timeframe,
            classId,
        );

        res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }
}