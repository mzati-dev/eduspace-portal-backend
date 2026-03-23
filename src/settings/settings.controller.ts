// src/modules/settings/settings.controller.ts
import { Controller, Get, Post, Patch, Body, Param, Query, Res, UseGuards, Req } from '@nestjs/common';
import { Response } from 'express';
import { SettingsService } from './settings.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('settings')
@UseGuards(AuthGuard('jwt'))
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    // ============ GENERAL SETTINGS ============
    @Get()
    async getAllSettings(@Req() req) {
        const schoolId = req.user?.schoolId;
        const data = await this.settingsService.getAllSettings(schoolId);
        return { success: true, data };
    }

    @Get('school')
    async getSchoolProfile(@Req() req) {
        const schoolId = req.user?.schoolId;
        const data = await this.settingsService.getSchoolProfile(schoolId);
        return { success: true, data };
    }

    @Patch('school')
    async updateSchoolProfile(@Req() req, @Body() body: any) {
        const schoolId = req.user?.schoolId;
        const data = await this.settingsService.updateSchoolProfile(schoolId, body);
        return { success: true, data };
    }

    @Post('school/logo')
    async uploadSchoolLogo(@Req() req, @Body() body: any) {
        const schoolId = req.user?.schoolId;
        const data = await this.settingsService.uploadSchoolLogo(schoolId, body.logo);
        return { success: true, data };
    }

    // ============ NOTIFICATION SETTINGS ============
    @Get('notifications')
    async getNotificationSettings(@Req() req) {
        const schoolId = req.user?.schoolId;
        const data = await this.settingsService.getNotificationSettings(schoolId);
        return { success: true, data };
    }

    @Patch('notifications')
    async updateNotificationSettings(@Req() req, @Body() body: any) {
        const schoolId = req.user?.schoolId;
        const data = await this.settingsService.updateNotificationSettings(schoolId, body);
        return { success: true, data };
    }

    @Post('notifications/test/:channel')
    async testNotificationChannel(@Param('channel') channel: string, @Req() req) {
        const schoolId = req.user?.schoolId;
        await this.settingsService.testNotificationChannel(schoolId, channel);
        return { success: true, message: `${channel} connection test successful` };
    }

    // ============ SECURITY SETTINGS ============
    @Get('security')
    async getSecuritySettings(@Req() req) {
        const schoolId = req.user?.schoolId;
        const data = await this.settingsService.getSecuritySettings(schoolId);
        return { success: true, data };
    }

    @Patch('security')
    async updateSecuritySettings(@Req() req, @Body() body: any) {
        const schoolId = req.user?.schoolId;
        const data = await this.settingsService.updateSecuritySettings(schoolId, body);
        return { success: true, data };
    }

    // ============ ACADEMIC SETTINGS ============
    @Get('academic')
    async getAcademicSettings(@Req() req) {
        const schoolId = req.user?.schoolId;
        const data = await this.settingsService.getAcademicSettings(schoolId);
        return { success: true, data };
    }

    @Patch('academic')
    async updateAcademicSettings(@Req() req, @Body() body: any) {
        const schoolId = req.user?.schoolId;
        const data = await this.settingsService.updateAcademicSettings(schoolId, body);
        return { success: true, data };
    }

    // ============ FEE SETTINGS ============
    @Get('fees')
    async getFeeSettings(@Req() req) {
        const schoolId = req.user?.schoolId;
        const data = await this.settingsService.getFeeSettings(schoolId);
        return { success: true, data };
    }

    @Patch('fees')
    async updateFeeSettings(@Req() req, @Body() body: any) {
        const schoolId = req.user?.schoolId;
        const data = await this.settingsService.updateFeeSettings(schoolId, body);
        return { success: true, data };
    }

    // ============ BACKUP SETTINGS ============
    @Get('backup')
    async getBackupSettings(@Req() req) {
        const schoolId = req.user?.schoolId;
        const data = await this.settingsService.getBackupSettings(schoolId);
        return { success: true, data };
    }

    @Patch('backup')
    async updateBackupSettings(@Req() req, @Body() body: any) {
        const schoolId = req.user?.schoolId;
        const data = await this.settingsService.updateBackupSettings(schoolId, body);
        return { success: true, data };
    }

    @Get('backup/files')
    async getBackupFiles(@Req() req) {
        const schoolId = req.user?.schoolId;
        const data = await this.settingsService.getBackupFiles(schoolId);
        return { success: true, data };
    }

    @Post('backup/create')
    async createBackup(@Req() req) {
        const schoolId = req.user?.schoolId;
        const data = await this.settingsService.createBackup(schoolId);
        return { success: true, data };
    }

    @Post('backup/restore/:backupId')
    async restoreBackup(@Param('backupId') backupId: string, @Req() req) {
        const schoolId = req.user?.schoolId;
        await this.settingsService.restoreBackup(schoolId, backupId);
        return { success: true, message: 'System restored from backup' };
    }

    @Get('backup/download/:backupId')
    async downloadBackup(
        @Param('backupId') backupId: string,
        @Res() res: Response,
        @Req() req,
    ) {
        const schoolId = req.user?.schoolId;
        const { buffer, filename } = await this.settingsService.downloadBackup(schoolId, backupId);

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }

    // ============ RESTORE DEFAULTS ============
    @Post(':section/restore-default')
    async restoreSettingsToDefault(@Param('section') section: string, @Req() req) {
        const schoolId = req.user?.schoolId;
        const data = await this.settingsService.restoreSettingsToDefault(schoolId, section);
        return { success: true, data };
    }

    // ============ SUBJECT MAX MARKS ============
    @Get('subject-max-marks')
    async getSubjectMaxMarks(@Req() req, @Query('classId') classId?: string) {
        const schoolId = req.user?.schoolId;
        const data = await this.settingsService.getSubjectMaxMarks(schoolId, classId);
        return { success: true, data };
    }

    @Post('subject-max-marks')
    async updateSubjectMaxMarks(@Req() req, @Body() body: { classId: string; data: any[] }) {
        const schoolId = req.user?.schoolId;
        const data = await this.settingsService.updateSubjectMaxMarks(schoolId, body.classId, body.data);
        return { success: true, data };
    }

    // ============ ASSESSMENT NAMES ============
    @Get('assessment-names')
    async getAssessmentNames(@Req() req) {
        const schoolId = req.user?.schoolId;
        const data = await this.settingsService.getAssessmentNames(schoolId);
        return { success: true, data };
    }

    @Post('assessment-names')
    async updateAssessmentNames(@Req() req, @Body() body: any) {
        const schoolId = req.user?.schoolId;
        const data = await this.settingsService.updateAssessmentNames(schoolId, body);
        return { success: true, data };
    }

    // ============ ASSESSMENT TYPES ============
    @Post('assessment-types')
    async updateAssessmentTypes(@Req() req, @Body() body: { assessmentTypes: string[] }) {
        const schoolId = req.user?.schoolId;
        const data = await this.settingsService.updateAssessmentTypes(schoolId, body.assessmentTypes);
        return { success: true, data };
    }

    // ============ CHANGE PASSWORD ============
    @Post('change-password')
    async changePassword(@Req() req, @Body() body: { currentPassword: string; newPassword: string }) {
        const schoolId = req.user?.schoolId;
        const userId = req.user?.id;
        await this.settingsService.changePassword(schoolId, userId, body.currentPassword, body.newPassword);
        return { success: true, message: 'Password changed successfully' };
    }
}