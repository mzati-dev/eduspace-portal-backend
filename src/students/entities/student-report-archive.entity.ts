import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('student_report_archives')
export class StudentReportArchive {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    studentId!: string;

    @Column()
    studentName!: string;

    @Column()
    examNumber!: string;

    @Column()
    classId!: string;

    @Column()
    schoolId!: string;

    @Column()
    term!: string;

    @Column()
    academicYear!: string;  // ← ADD THIS LINE

    @Column()
    assessmentType!: string;

    @Column({ nullable: true })
    parentEmail?: string;

    @Column({ nullable: true })
    parentPhone?: string;

    @Column({ nullable: true })
    whatsappNumber?: string;

    @Column('jsonb')
    reportCardData: any;

    @Column({ default: false })
    sentViaEmail!: boolean;

    @Column({ default: false })
    sentViaWhatsApp!: boolean;

    @Column({ type: 'timestamp', nullable: true })
    sentAt?: Date;

    @CreateDateColumn()
    archivedAt!: Date;
}