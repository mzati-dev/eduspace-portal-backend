// src/analytics/analytics.controller.ts
import { Controller, Get, Post, Query, Param, Res, Req, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AnalyticsService, AtRiskStudent, ClassPerformance, SubjectPerformance, TrendData } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('at-risk')
    async getAtRiskStudents(
        @Req() req,
        @Query('classId') classId?: string,
        @Query('timeframe') timeframe?: string,
    ): Promise<{ success: boolean; data: AtRiskStudent[] }> {
        const schoolId = req.user?.schoolId;
        const data = await this.analyticsService.getAtRiskStudents(schoolId, classId, timeframe);
        return { success: true, data };
    }

    @Get('classes')
    async getClassPerformance(
        @Req() req,
        @Query('timeframe') timeframe?: string
    ): Promise<{ success: boolean; data: ClassPerformance[] }> {
        const schoolId = req.user?.schoolId;
        const data = await this.analyticsService.getClassPerformance(schoolId, timeframe);
        return { success: true, data };
    }

    @Get('subjects')
    async getSubjectPerformance(
        @Req() req,
        @Query('timeframe') timeframe?: string
    ): Promise<{ success: boolean; data: SubjectPerformance[] }> {
        const schoolId = req.user?.schoolId;
        const data = await this.analyticsService.getSubjectPerformance(schoolId, timeframe);
        return { success: true, data };
    }

    @Get('trends/:metric')
    async getTrendData(
        @Req() req,
        @Param('metric') metric: string,
        @Query('timeframe') timeframe: string,
        @Query('classId') classId?: string,
    ): Promise<{ success: boolean; data: TrendData[] }> {
        const schoolId = req.user?.schoolId;
        const data = await this.analyticsService.getTrendData(schoolId, metric, timeframe, classId);
        return { success: true, data };
    }

    @Get('metrics')
    async getKeyMetrics(
        @Req() req,
        @Query('timeframe') timeframe?: string,
        @Query('classId') classId?: string,
    ): Promise<{ success: boolean; data: any }> {
        const schoolId = req.user?.schoolId;
        const data = await this.analyticsService.getKeyMetrics(schoolId, timeframe, classId);
        return { success: true, data };
    }

    @Get('predictions')
    async getPredictionSummary(
        @Req() req,
        @Query('timeframe') timeframe?: string
    ): Promise<{ success: boolean; data: any }> {
        const schoolId = req.user?.schoolId;
        const data = await this.analyticsService.getPredictionSummary(schoolId, timeframe);
        return { success: true, data };
    }

    @Get('interventions')
    async getInterventionSummary(
        @Req() req
    ): Promise<{ success: boolean; data: any }> {
        const schoolId = req.user?.schoolId;
        const data = await this.analyticsService.getInterventionSummary(schoolId);
        return { success: true, data };
    }

    @Post('predictions/generate')
    async generatePredictions(
        @Req() req
    ): Promise<{ success: boolean; message: string; data: any }> {
        const schoolId = req.user?.schoolId;
        const data = await this.analyticsService.generatePredictions(schoolId);
        return { success: true, message: 'Predictions generated successfully', data };
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
        const { buffer, filename } = await this.analyticsService.exportReport(
            schoolId,
            format,
            timeframe,
            classId,
        );

        res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }
}


// // src/analytics/analytics.controller.ts
// import { Controller, Get, Post, Query, Param, Res } from '@nestjs/common';
// import { Response } from 'express';
// import { AnalyticsService, AtRiskStudent, ClassPerformance, SubjectPerformance, TrendData } from './analytics.service';

// @Controller('analytics')
// export class AnalyticsController {
//     constructor(private readonly analyticsService: AnalyticsService) { }

//     @Get('at-risk')
//     async getAtRiskStudents(
//         @Query('schoolId') schoolId: string,
//         @Query('classId') classId?: string,
//         @Query('timeframe') timeframe?: string,
//     ): Promise<{ success: boolean; data: AtRiskStudent[] }> {
//         const data = await this.analyticsService.getAtRiskStudents(schoolId, classId, timeframe);
//         return { success: true, data };
//     }

//     @Get('classes')
//     async getClassPerformance(
//         @Query('schoolId') schoolId: string,
//         @Query('timeframe') timeframe?: string
//     ): Promise<{ success: boolean; data: ClassPerformance[] }> {
//         const data = await this.analyticsService.getClassPerformance(schoolId, timeframe);
//         return { success: true, data };
//     }

//     @Get('subjects')
//     async getSubjectPerformance(
//         @Query('schoolId') schoolId: string,
//         @Query('timeframe') timeframe?: string
//     ): Promise<{ success: boolean; data: SubjectPerformance[] }> {
//         const data = await this.analyticsService.getSubjectPerformance(schoolId, timeframe);
//         return { success: true, data };
//     }

//     @Get('trends/:metric')
//     async getTrendData(
//         @Query('schoolId') schoolId: string,
//         @Param('metric') metric: string,
//         @Query('timeframe') timeframe: string,
//         @Query('classId') classId?: string,
//     ): Promise<{ success: boolean; data: TrendData[] }> {
//         const data = await this.analyticsService.getTrendData(schoolId, metric, timeframe, classId);
//         return { success: true, data };
//     }

//     @Get('metrics')
//     async getKeyMetrics(
//         @Query('schoolId') schoolId: string,
//         @Query('timeframe') timeframe?: string,
//         @Query('classId') classId?: string,
//     ): Promise<{ success: boolean; data: any }> {
//         const data = await this.analyticsService.getKeyMetrics(schoolId, timeframe, classId);
//         return { success: true, data };
//     }

//     @Get('predictions')
//     async getPredictionSummary(
//         @Query('schoolId') schoolId: string,
//         @Query('timeframe') timeframe?: string
//     ): Promise<{ success: boolean; data: any }> {
//         const data = await this.analyticsService.getPredictionSummary(schoolId, timeframe);
//         return { success: true, data };
//     }

//     @Get('interventions')
//     async getInterventionSummary(
//         @Query('schoolId') schoolId: string
//     ): Promise<{ success: boolean; data: any }> {
//         const data = await this.analyticsService.getInterventionSummary(schoolId);
//         return { success: true, data };
//     }

//     @Post('predictions/generate')
//     async generatePredictions(
//         @Query('schoolId') schoolId: string
//     ): Promise<{ success: boolean; message: string; data: any }> {
//         const data = await this.analyticsService.generatePredictions(schoolId);
//         return { success: true, message: 'Predictions generated successfully', data };
//     }

//     @Get('export')
//     async exportReport(
//         @Res() res: Response,
//         @Query('schoolId') schoolId: string,
//         @Query('format') format: string,
//         @Query('timeframe') timeframe?: string,
//         @Query('classId') classId?: string,
//     ): Promise<void> {
//         const { buffer, filename } = await this.analyticsService.exportReport(
//             schoolId,
//             format,
//             timeframe,
//             classId,
//         );

//         res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//         res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
//         res.send(buffer);
//     }
// }

// // src/analytics/analytics.controller.ts
// import { Controller, Get, Post, Query, Param, Res } from '@nestjs/common';
// import { Response } from 'express';
// import { AnalyticsService, AtRiskStudent, ClassPerformance, SubjectPerformance, TrendData } from './analytics.service';

// @Controller('analytics')
// export class AnalyticsController {
//     constructor(private readonly analyticsService: AnalyticsService) { }

//     @Get('at-risk')
//     async getAtRiskStudents(
//         @Query('classId') classId?: string,
//         @Query('timeframe') timeframe?: string,
//     ): Promise<{ success: boolean; data: AtRiskStudent[] }> {
//         const data = await this.analyticsService.getAtRiskStudents(classId, timeframe);
//         return { success: true, data };
//     }

//     @Get('classes')
//     async getClassPerformance(
//         @Query('timeframe') timeframe?: string
//     ): Promise<{ success: boolean; data: ClassPerformance[] }> {
//         const data = await this.analyticsService.getClassPerformance(timeframe);
//         return { success: true, data };
//     }

//     @Get('subjects')
//     async getSubjectPerformance(
//         @Query('timeframe') timeframe?: string
//     ): Promise<{ success: boolean; data: SubjectPerformance[] }> {
//         const data = await this.analyticsService.getSubjectPerformance(timeframe);
//         return { success: true, data };
//     }

//     @Get('trends/:metric')
//     async getTrendData(
//         @Param('metric') metric: string,
//         @Query('timeframe') timeframe: string,
//         @Query('classId') classId?: string,
//     ): Promise<{ success: boolean; data: TrendData[] }> {
//         const data = await this.analyticsService.getTrendData(metric, timeframe, classId);
//         return { success: true, data };
//     }

//     @Get('metrics')
//     async getKeyMetrics(
//         @Query('timeframe') timeframe?: string,
//         @Query('classId') classId?: string,
//     ): Promise<{ success: boolean; data: any }> {
//         const data = await this.analyticsService.getKeyMetrics(timeframe, classId);
//         return { success: true, data };
//     }

//     @Get('predictions')
//     async getPredictionSummary(
//         @Query('timeframe') timeframe?: string
//     ): Promise<{ success: boolean; data: any }> {
//         const data = await this.analyticsService.getPredictionSummary(timeframe);
//         return { success: true, data };
//     }

//     @Get('interventions')
//     async getInterventionSummary(): Promise<{ success: boolean; data: any }> {
//         const data = await this.analyticsService.getInterventionSummary();
//         return { success: true, data };
//     }

//     @Post('predictions/generate')
//     async generatePredictions(): Promise<{ success: boolean; message: string; data: any }> {
//         const data = await this.analyticsService.generatePredictions();
//         return { success: true, message: 'Predictions generated successfully', data };
//     }

//     @Get('export')
//     async exportReport(
//         @Res() res: Response,
//         @Query('format') format: string,
//         @Query('timeframe') timeframe?: string,
//         @Query('classId') classId?: string,
//     ): Promise<void> {
//         const { buffer, filename } = await this.analyticsService.exportReport(
//             format,
//             timeframe,
//             classId,
//         );

//         res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//         res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
//         res.send(buffer);
//     }
// }