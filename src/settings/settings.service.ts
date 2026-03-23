// src/modules/settings/settings.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { Settings } from './entities/settings.entity';
import { BackupFile } from './entities/backup-file.entity';
import { Student } from '../students/entities/student.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Class } from '../students/entities/class.entity';
import { Subject } from '../students/entities/subject.entity';

@Injectable()
export class SettingsService {
    constructor(
        @InjectRepository(Settings)
        private settingsRepository: Repository<Settings>,
        @InjectRepository(BackupFile)
        private backupRepository: Repository<BackupFile>,
        @InjectRepository(Student)
        private studentRepository: Repository<Student>,
        @InjectRepository(Teacher)
        private teacherRepository: Repository<Teacher>,
        @InjectRepository(Class)
        private classRepository: Repository<Class>,
        @InjectRepository(Subject)
        private subjectRepository: Repository<Subject>,
    ) { }

    // ============ HELPER METHODS ============
    private async getOrCreateSettings(schoolId: string): Promise<Settings> {
        let settings = await this.settingsRepository.findOne({ where: { schoolId } });

        if (!settings) {
            settings = this.settingsRepository.create({
                schoolId,
                schoolProfile: {
                    name: '',
                    motto: '',
                    address: '',
                    phone: '',
                    alternativePhones: [],
                    email: '',
                    website: '',
                    established: '',
                    registrationNumber: '',
                    taxId: '',
                    currency: 'MWK',
                    timezone: 'Africa/Blantyre',
                    language: 'en',
                    academicYear: '',
                    terms: ['Term 1', 'Term 2', 'Term 3'],
                },
                notificationSettings: {
                    emailEnabled: false,
                    smsEnabled: false,
                    whatsappEnabled: false,
                    pushEnabled: false,
                    parentNotifications: {
                        attendance: false,
                        fees: false,
                        results: false,
                        events: false,
                        announcements: false,
                    },
                    teacherNotifications: {
                        attendance: false,
                        results: false,
                        meetings: false,
                        announcements: false,
                    },
                    reminderTiming: {
                        fees: 7,
                        events: 3,
                        meetings: 1,
                    },
                },
                securitySettings: {
                    twoFactorAuth: false,
                    passwordPolicy: {
                        minLength: 6,
                        requireNumbers: false,
                        requireSymbols: false,
                        requireUppercase: false,
                        expiryDays: 90,
                    },
                    sessionTimeout: 30,
                    ipWhitelist: [],
                    allowedDomains: [],
                    loginAttempts: 5,
                    lockoutDuration: 15,
                },
                academicSettings: {
                    gradingSystem: 'percentage',
                    gradeScale: [],
                    subjects: [],
                    assessmentTypes: ['Test 1', 'Test 2', 'Exam'],
                    passMark: 50,
                    rankCalculation: 'average',
                    allowRetakes: false,
                },
                feeSettings: {
                    currency: 'MWK',
                    paymentMethods: ['cash', 'card', 'bank', 'mobile'],
                    lateFeePercentage: 5,
                    gracePeriod: 7,
                    discounts: [],
                    installments: [],
                    receiptPrefix: 'RCP',
                    invoicePrefix: 'INV',
                },
                backupSettings: {
                    autoBackup: false,
                    frequency: 'daily',
                    time: '00:00',
                    retention: 30,
                    backupLocation: 'local',
                    includeMedia: false,
                },
                assessmentNames: {
                    firstAssessment: 'Quick Assessment 1',
                    secondAssessment: 'Quick Assessment 2',
                    finalAssessment: 'End of Term Examination',
                },
                subjectMaxMarks: [],
            });
            settings = await this.settingsRepository.save(settings);
        }

        return settings;
    }

    // ============ GENERAL SETTINGS ============
    async getAllSettings(schoolId: string): Promise<any> {
        const settings = await this.getOrCreateSettings(schoolId);
        return {
            school: settings.schoolProfile,
            notifications: settings.notificationSettings,
            security: settings.securitySettings,
            academic: settings.academicSettings,
            fees: settings.feeSettings,
            backup: settings.backupSettings,
        };
    }

    async getSchoolProfile(schoolId: string): Promise<any> {
        const settings = await this.getOrCreateSettings(schoolId);
        return settings.schoolProfile;
    }

    async updateSchoolProfile(schoolId: string, data: any): Promise<any> {
        const settings = await this.getOrCreateSettings(schoolId);
        settings.schoolProfile = { ...settings.schoolProfile, ...data };
        await this.settingsRepository.save(settings);
        return settings.schoolProfile;
    }

    async uploadSchoolLogo(schoolId: string, logo: string): Promise<{ logoUrl: string }> {
        const settings = await this.getOrCreateSettings(schoolId);
        settings.schoolProfile.logo = logo;
        await this.settingsRepository.save(settings);
        return { logoUrl: logo };
    }

    // ============ NOTIFICATION SETTINGS ============
    async getNotificationSettings(schoolId: string): Promise<any> {
        const settings = await this.getOrCreateSettings(schoolId);
        return settings.notificationSettings;
    }

    async updateNotificationSettings(schoolId: string, data: any): Promise<any> {
        const settings = await this.getOrCreateSettings(schoolId);
        settings.notificationSettings = { ...settings.notificationSettings, ...data };
        await this.settingsRepository.save(settings);
        return settings.notificationSettings;
    }

    async testNotificationChannel(schoolId: string, channel: string): Promise<void> {
        // TODO: Implement actual notification testing
        console.log(`Testing ${channel} notification for school ${schoolId}`);
    }

    // ============ SECURITY SETTINGS ============
    async getSecuritySettings(schoolId: string): Promise<any> {
        const settings = await this.getOrCreateSettings(schoolId);
        return settings.securitySettings;
    }

    async updateSecuritySettings(schoolId: string, data: any): Promise<any> {
        const settings = await this.getOrCreateSettings(schoolId);
        settings.securitySettings = { ...settings.securitySettings, ...data };
        await this.settingsRepository.save(settings);
        return settings.securitySettings;
    }

    // ============ ACADEMIC SETTINGS ============
    async getAcademicSettings(schoolId: string): Promise<any> {
        const settings = await this.getOrCreateSettings(schoolId);
        return settings.academicSettings;
    }

    async updateAcademicSettings(schoolId: string, data: any): Promise<any> {
        const settings = await this.getOrCreateSettings(schoolId);
        settings.academicSettings = { ...settings.academicSettings, ...data };
        await this.settingsRepository.save(settings);
        return settings.academicSettings;
    }

    // ============ FEE SETTINGS ============
    async getFeeSettings(schoolId: string): Promise<any> {
        const settings = await this.getOrCreateSettings(schoolId);
        return settings.feeSettings;
    }

    async updateFeeSettings(schoolId: string, data: any): Promise<any> {
        const settings = await this.getOrCreateSettings(schoolId);
        settings.feeSettings = { ...settings.feeSettings, ...data };
        await this.settingsRepository.save(settings);
        return settings.feeSettings;
    }

    // ============ BACKUP SETTINGS ============
    async getBackupSettings(schoolId: string): Promise<any> {
        const settings = await this.getOrCreateSettings(schoolId);
        return settings.backupSettings;
    }

    async updateBackupSettings(schoolId: string, data: any): Promise<any> {
        const settings = await this.getOrCreateSettings(schoolId);
        settings.backupSettings = { ...settings.backupSettings, ...data };
        await this.settingsRepository.save(settings);
        return settings.backupSettings;
    }

    async getBackupFiles(schoolId: string): Promise<BackupFile[]> {
        return this.backupRepository.find({ where: { schoolId }, order: { createdAt: 'DESC' } });
    }

    async createBackup(schoolId: string): Promise<{ backupId: string; message: string }> {
        const settings = await this.getOrCreateSettings(schoolId);

        const backupData: Partial<BackupFile> = {
            schoolId,
            name: `backup-${new Date().toISOString()}.json`,
            filePath: `/backups/${schoolId}/backup-${Date.now()}.json`,
            size: 0,
            metadata: {
                type: 'full',
                includesMedia: settings.backupSettings.includeMedia,
                version: '1.0',
            },
        };

        const backup = this.backupRepository.create(backupData);
        const saved = await this.backupRepository.save(backup);

        // Update last backup time
        settings.backupSettings = {
            ...settings.backupSettings,
            lastBackup: new Date().toISOString()
        };
        await this.settingsRepository.save(settings);

        return { backupId: saved.id, message: 'Backup created successfully' };
    }

    async restoreBackup(schoolId: string, backupId: string): Promise<void> {
        const backup = await this.backupRepository.findOne({ where: { id: backupId, schoolId } });
        if (!backup) {
            throw new NotFoundException('Backup not found');
        }
        // TODO: Implement actual restore logic
    }

    async downloadBackup(schoolId: string, backupId: string): Promise<{ buffer: Buffer; filename: string }> {
        const backup = await this.backupRepository.findOne({ where: { id: backupId, schoolId } });
        if (!backup) {
            throw new NotFoundException('Backup not found');
        }

        const buffer = Buffer.from(JSON.stringify(backup, null, 2));
        return { buffer, filename: backup.name };
    }

    // ============ RESTORE DEFAULTS ============
    async restoreSettingsToDefault(schoolId: string, section: string): Promise<any> {
        const settings = await this.getOrCreateSettings(schoolId);

        switch (section) {
            case 'general':
                settings.schoolProfile = {
                    name: settings.schoolProfile.name,
                    motto: '',
                    address: '',
                    phone: '',
                    alternativePhones: [],
                    email: settings.schoolProfile.email,
                    website: '',
                    established: '',
                    registrationNumber: '',
                    taxId: '',
                    currency: 'MWK',
                    timezone: 'Africa/Blantyre',
                    language: 'en',
                    academicYear: '',
                    terms: ['Term 1', 'Term 2', 'Term 3'],
                };
                break;
            case 'academic':
                settings.academicSettings = {
                    gradingSystem: 'percentage',
                    gradeScale: [],
                    subjects: [],
                    assessmentTypes: ['Test 1', 'Test 2', 'Exam'],
                    passMark: 50,
                    rankCalculation: 'average',
                    allowRetakes: false,
                };
                settings.assessmentNames = {
                    firstAssessment: 'Quick Assessment 1',
                    secondAssessment: 'Quick Assessment 2',
                    finalAssessment: 'End of Term Examination',
                };
                settings.subjectMaxMarks = [];
                break;
            case 'notifications':
                settings.notificationSettings = {
                    emailEnabled: false,
                    smsEnabled: false,
                    whatsappEnabled: false,
                    pushEnabled: false,
                    parentNotifications: {
                        attendance: false,
                        fees: false,
                        results: false,
                        events: false,
                        announcements: false,
                    },
                    teacherNotifications: {
                        attendance: false,
                        results: false,
                        meetings: false,
                        announcements: false,
                    },
                    reminderTiming: {
                        fees: 7,
                        events: 3,
                        meetings: 1,
                    },
                };
                break;
            case 'security':
                settings.securitySettings = {
                    twoFactorAuth: false,
                    passwordPolicy: {
                        minLength: 6,
                        requireNumbers: false,
                        requireSymbols: false,
                        requireUppercase: false,
                        expiryDays: 90,
                    },
                    sessionTimeout: 30,
                    ipWhitelist: [],
                    allowedDomains: [],
                    loginAttempts: 5,
                    lockoutDuration: 15,
                };
                break;
            case 'fees':
                settings.feeSettings = {
                    currency: 'MWK',
                    paymentMethods: ['cash', 'card', 'bank', 'mobile'],
                    lateFeePercentage: 5,
                    gracePeriod: 7,
                    discounts: [],
                    installments: [],
                    receiptPrefix: 'RCP',
                    invoicePrefix: 'INV',
                };
                break;
            case 'backup':
                settings.backupSettings = {
                    autoBackup: false,
                    frequency: 'daily',
                    time: '00:00',
                    retention: 30,
                    backupLocation: 'local',
                    includeMedia: false,
                };
                break;
        }

        await this.settingsRepository.save(settings);
        return { message: `${section} settings restored to defaults` };
    }

    // ============ SUBJECT MAX MARKS ============
    async getSubjectMaxMarks(schoolId: string, classId?: string): Promise<any[]> {
        const settings = await this.getOrCreateSettings(schoolId);

        if (classId) {
            const classData = settings.subjectMaxMarks?.find(c => c.classId === classId);
            return classData?.marks || [];
        }

        return settings.subjectMaxMarks || [];
    }

    async updateSubjectMaxMarks(schoolId: string, classId: string, data: any[]): Promise<any> {
        const settings = await this.getOrCreateSettings(schoolId);

        const existingIndex = settings.subjectMaxMarks?.findIndex(c => c.classId === classId) ?? -1;

        if (existingIndex >= 0) {
            settings.subjectMaxMarks[existingIndex] = { classId, marks: data };
        } else {
            if (!settings.subjectMaxMarks) settings.subjectMaxMarks = [];
            settings.subjectMaxMarks.push({ classId, marks: data });
        }

        await this.settingsRepository.save(settings);
        return { classId, marks: data };
    }

    // ============ ASSESSMENT NAMES ============
    async getAssessmentNames(schoolId: string): Promise<any> {
        const settings = await this.getOrCreateSettings(schoolId);
        return settings.assessmentNames || {
            firstAssessment: 'Quick Assessment 1',
            secondAssessment: 'Quick Assessment 2',
            finalAssessment: 'End of Term Examination',
        };
    }

    async updateAssessmentNames(schoolId: string, data: any): Promise<any> {
        const settings = await this.getOrCreateSettings(schoolId);
        settings.assessmentNames = data;
        await this.settingsRepository.save(settings);
        return settings.assessmentNames;
    }

    // ============ ASSESSMENT TYPES ============
    async updateAssessmentTypes(schoolId: string, assessmentTypes: string[]): Promise<any> {
        const settings = await this.getOrCreateSettings(schoolId);
        settings.academicSettings.assessmentTypes = assessmentTypes;
        await this.settingsRepository.save(settings);
        return settings.academicSettings.assessmentTypes;
    }

    // ============ CHANGE PASSWORD ============
    async changePassword(schoolId: string, userId: string, currentPassword: string, newPassword: string): Promise<void> {
        // Find the school admin (teacher or user)
        const admin = await this.teacherRepository.findOne({
            where: { id: userId, school_id: schoolId }
        });

        if (!admin) {
            throw new NotFoundException('Admin not found');
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
        if (!isPasswordValid) {
            throw new BadRequestException('Current password is incorrect');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        admin.password = hashedPassword;
        await this.teacherRepository.save(admin);
    }
}