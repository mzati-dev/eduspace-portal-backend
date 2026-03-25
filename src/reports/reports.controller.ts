import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    Body,
    Res,
    StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Post('generate')
    async generateReport(@Body() body: any) {
        return this.reportsService.generateReport({
            classId: body.classId,
            term: body.term,
            reportType: body.reportType,
            format: body.format,
            generatedBy: body.generatedBy || 'teacher',
            generatedByName: body.generatedByName || 'Teacher',
        });
    }

    @Get('performance/:classId')
    async getClassPerformance(
        @Param('classId') classId: string,
        @Query('term') term: string,
    ) {
        return this.reportsService.getClassPerformance(classId, term);
    }

    @Get('attendance/:classId')
    async getAttendanceReport(
        @Param('classId') classId: string,
        @Query('term') term: string,
    ) {
        return this.reportsService.getAttendanceReport(classId, term);
    }

    @Get('recent')
    async getRecentReports() {
        return this.reportsService.getRecentReports();
    }

    @Get('download/:reportId')
    async downloadReport(
        @Param('reportId') reportId: string,
        @Query('format') format: string,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { buffer, filename, contentType } = await this.reportsService.downloadReport(reportId, format);

        res.set({
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
        });

        return new StreamableFile(buffer);
    }
}