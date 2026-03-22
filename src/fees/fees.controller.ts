// src/modules/fees/fees.controller.ts
import { Controller, Get, Post, Body, Param, Query, Res, UseGuards, Req, Delete, Patch } from '@nestjs/common';
import { Response } from 'express';
import { FeesService } from './fees.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('fees')
@UseGuards(AuthGuard('jwt'))
export class FeesController {
    constructor(private readonly feesService: FeesService) { }

    @Get('structures')
    async getFeeStructures(
        @Req() req,
        @Query('term') term?: string,
        @Query('academicYear') academicYear?: string,
    ) {
        const schoolId = req.user?.schoolId;
        const data = await this.feesService.getFeeStructures(schoolId, term, academicYear);
        return { success: true, data };
    }

    @Post('structures')
    async createFeeStructure(
        @Req() req,
        @Body() body: any,
    ) {
        const schoolId = req.user?.schoolId;
        const data = await this.feesService.createFeeStructure(schoolId, body);
        return { success: true, data };
    }

    @Patch('structures/:id')
    async updateFeeStructure(
        @Req() req,
        @Param('id') id: string,
        @Body() body: any,
    ) {
        const schoolId = req.user?.schoolId;
        const data = await this.feesService.updateFeeStructure(schoolId, id, body);
        return { success: true, data };
    }

    @Delete('structures/:id')
    async deleteFeeStructure(
        @Req() req,
        @Param('id') id: string,
    ) {
        const schoolId = req.user?.schoolId;
        await this.feesService.deleteFeeStructure(schoolId, id);
        return { success: true, message: 'Fee structure deleted' };
    }

    @Get('students')
    async getStudentFees(
        @Req() req,
        @Query('classId') classId?: string,
        @Query('term') term?: string,
        @Query('status') status?: string,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
    ) {
        const schoolId = req.user?.schoolId;
        const data = await this.feesService.getStudentFees(schoolId, {
            classId,
            term,
            status,
            fromDate,
            toDate,
        });
        return { success: true, data };
    }

    @Get('summary')
    async getFeeSummary(
        @Req() req,
        @Query('term') term?: string,
        @Query('classId') classId?: string,
    ) {
        const schoolId = req.user?.schoolId;
        const data = await this.feesService.getFeeSummary(schoolId, term, classId);
        return { success: true, data };
    }

    @Post('payments')
    async recordPayment(
        @Req() req,
        @Body() body: {
            studentId: string;
            amount: number;
            method: string;
            reference?: string;
            notes?: string;
            date?: string;
        },
    ) {
        const userId = req.user?.id;
        const data = await this.feesService.recordPayment(body, userId);
        return { success: true, data };
    }

    @Post('reminders/send')
    async sendReminders(
        @Req() req,
        @Body() body: {
            studentIds: string[];
            type: 'sms' | 'email' | 'push';
            customMessage?: string;
        },
    ) {
        const userId = req.user?.id;
        const data = await this.feesService.sendReminders(body, userId);
        return { success: true, data };
    }

    @Get('payments/history')
    async getPaymentHistory(
        @Req() req,
        @Query('studentId') studentId?: string,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
    ) {
        const schoolId = req.user?.schoolId;
        const data = await this.feesService.getPaymentHistory(schoolId, studentId, fromDate, toDate);
        return { success: true, data };
    }

    @Get('reminders/history')
    async getReminderHistory(
        @Req() req,
        @Query('studentId') studentId?: string,
    ) {
        const schoolId = req.user?.schoolId;
        const data = await this.feesService.getReminderHistory(schoolId, studentId);
        return { success: true, data };
    }

    @Get('receipts/download/:receiptNumber')
    async downloadReceipt(
        @Param('receiptNumber') receiptNumber: string,
        @Res() res: Response,
    ) {
        const { buffer, filename } = await this.feesService.generateReceipt(receiptNumber);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }

    @Get('receipts/:paymentId')
    async generateReceipt(
        @Param('paymentId') paymentId: string,
        @Res() res: Response,
    ) {
        const { buffer, filename } = await this.feesService.generateReceiptByPaymentId(paymentId);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }

    @Get('export')
    async exportReport(
        @Req() req,
        @Res() res: Response,
        @Query('format') format: string,
        @Query('classId') classId?: string,
        @Query('term') term?: string,
        @Query('status') status?: string,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
    ) {
        const schoolId = req.user?.schoolId;
        const { buffer, filename } = await this.feesService.exportReport(
            schoolId,
            format,
            { classId, term, status, fromDate, toDate }
        );

        const contentType = format === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }
}