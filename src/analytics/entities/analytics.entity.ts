// src/modules/analytics/entities/analytics.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('analytics_data')
export class AnalyticsData {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    studentId: string;

    @Column()
    studentName: string;

    @Column()
    examNumber: string;

    @Column({ nullable: true })
    classId: string;

    @Column({ nullable: true })
    className: string;

    @Column({ type: 'float', default: 0 })
    academicScore: number;

    @Column({ type: 'float', default: 0 })
    attendanceRate: number;

    @Column({ type: 'float', default: 0 })
    behaviorScore: number;

    @Column({ type: 'jsonb', nullable: true })
    riskFactors: string[];

    @Column({ type: 'float', default: 0 })
    riskScore: number;

    @Column({
        type: 'enum',
        enum: ['high', 'medium', 'low'],
        nullable: true
    })
    riskLevel: string;

    @Column({ nullable: true })
    predictedGrade: string;

    @Column({ type: 'jsonb', nullable: true })
    subjectScores: Record<string, number>;

    @Column({ type: 'jsonb', nullable: true })
    trendData: Record<string, any>;

    @Column({ type: 'timestamp', nullable: true })
    predictionGeneratedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}