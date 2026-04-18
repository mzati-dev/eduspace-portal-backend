// src/students/entities/report-card.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Student } from './student.entity';


@Entity('report_cards')
export class ReportCard {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    term!: string;

    @Column({ default: 0 })
    classRank!: number;

    @Column({ default: 0 })
    qa1Rank!: number;

    @Column({ default: 0 })
    qa2Rank!: number;

    @Column({ default: 0 })
    totalStudents!: number;

    @Column({ default: 0 })
    daysPresent!: number;

    @Column({ default: 0 })
    daysAbsent!: number;

    @Column({ default: 0 })
    daysLate!: number;

    @Column({ type: 'text', nullable: true })
    teacherRemarks!: string;

    @ManyToOne(() => Student, (student) => student.reportCards, {
        onDelete: 'CASCADE'
    })
    student!: Student;

    // ADD THESE 2 NEW FIELDS ▼
    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    overallAverage!: number;

    @Column({ type: 'varchar', length: 2, nullable: true })
    overallGrade!: string;
    // In report-card.entity.ts add:
    @Column({ default: false })
    qa1_published!: boolean;

    @Column({ default: false })
    qa2_published!: boolean;

    @Column({ default: false })
    endOfTerm_published!: boolean;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;
}

