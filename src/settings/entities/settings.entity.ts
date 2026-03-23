// src/modules/settings/entities/settings.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('settings')
export class Settings {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    schoolId: string;

    @Column({ type: 'jsonb', default: {} })
    schoolProfile: {
        name: string;
        motto: string;
        address: string;
        phone: string;
        alternativePhones?: string[];
        email: string;
        website: string;
        logo?: string;
        favicon?: string;
        established: string;
        registrationNumber: string;
        taxId: string;
        currency: string;
        timezone: string;
        language: string;
        academicYear: string;
        terms: string[];
    };

    @Column({ type: 'jsonb', default: {} })
    notificationSettings: {
        emailEnabled: boolean;
        smsEnabled: boolean;
        whatsappEnabled: boolean;
        pushEnabled: boolean;
        parentNotifications: {
            attendance: boolean;
            fees: boolean;
            results: boolean;
            events: boolean;
            announcements: boolean;
        };
        teacherNotifications: {
            attendance: boolean;
            results: boolean;
            meetings: boolean;
            announcements: boolean;
        };
        reminderTiming: {
            fees: number;
            events: number;
            meetings: number;
        };
    };

    @Column({ type: 'jsonb', default: {} })
    securitySettings: {
        twoFactorAuth: boolean;
        passwordPolicy: {
            minLength: number;
            requireNumbers: boolean;
            requireSymbols: boolean;
            requireUppercase: boolean;
            expiryDays: number;
        };
        sessionTimeout: number;
        ipWhitelist: string[];
        allowedDomains: string[];
        loginAttempts: number;
        lockoutDuration: number;
    };

    @Column({ type: 'jsonb', default: {} })
    academicSettings: {
        gradingSystem: string;
        gradeScale: {
            min: number;
            max: number;
            grade: string;
            points?: number;
        }[];
        subjects: string[];
        assessmentTypes: string[];
        passMark: number;
        rankCalculation: string;
        allowRetakes: boolean;
    };

    @Column({ type: 'jsonb', default: {} })
    feeSettings: {
        currency: string;
        paymentMethods: string[];
        lateFeePercentage: number;
        gracePeriod: number;
        discounts: {
            name: string;
            percentage: number;
            applicableTo: string[];
        }[];
        installments: {
            name: string;
            percentage: number;
            dueDate: string;
        }[];
        receiptPrefix: string;
        invoicePrefix: string;
    };

    @Column({ type: 'jsonb', default: {} })
    backupSettings: {
        autoBackup: boolean;
        frequency: string;
        time: string;
        retention: number;
        lastBackup?: string;
        backupLocation: string;
        includeMedia: boolean;
    };

    @Column({ type: 'jsonb', nullable: true })
    assessmentNames: {
        firstAssessment: string;
        secondAssessment: string;
        finalAssessment: string;
    };

    @Column({ type: 'jsonb', nullable: true })
    subjectMaxMarks: {
        classId: string;
        marks: { subjectId: string; subjectName: string; maxMarks: number }[];
    }[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}