// src/students/entities/student.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Assessment } from './assessment.entity';
import { ReportCard } from './report-card.entity';
import { Class } from './class.entity';
import { School } from '../../schools/entities/school.entity';
import { Attendance } from '../../attendance/entities/attendance.entity';


@Entity('students')
export class Student {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    examNumber!: string;

    @Column()
    name!: string;

    // 👇 ADD THESE THREE FIELDS HERE
    @Column({ nullable: true })
    parentEmail?: string;

    @Column({ nullable: true })
    parentPhone?: string;

    @Column({ nullable: true })
    whatsappNumber?: string;

    // Add these fields to your existing Student entity class
    // Place them after the existing parentEmail, parentPhone, whatsappNumber fields

    @Column({ nullable: true })
    emisCode!: string;

    @Column({ nullable: true })
    parentName!: string;

    @Column({ nullable: true })
    parentNationalId!: string;

    @Column({ nullable: true })
    parentRelationship!: string;

    @Column({ nullable: true })
    parentAlternatePhone!: string;

    @Column({ nullable: true, type: 'text' })
    parentAddress!: string;

    @Column({ nullable: true })
    parentOccupation!: string;

    @Column({ nullable: true, default: 'sms' })
    preferredContact!: string;

    @Column({ nullable: true })
    emergencyContactName!: string;

    @Column({ nullable: true })
    emergencyContactPhone!: string;

    @Column({ nullable: true })
    emergencyContactRelationship!: string;

    @Column({ nullable: true })
    parentPassword!: string;

    @Column({ default: false })
    sendCredentials!: boolean;

    // CLASS RELATION
    @ManyToOne(() => Class, (cls) => cls.students,
        { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'class_id' })
    class?: Class; // Make optional

    // @Column({ nullable: true })
    // classId?: string; // ADD THIS COLUMN

    @Column({ nullable: true })
    photoUrl!: string;

    // SCHOOL RELATION - ADD THIS
    @ManyToOne(() => School, school => school.students, {
        nullable: true,
        onDelete: 'CASCADE'
    })
    @JoinColumn({ name: 'schoolId' })
    school?: School;

    @Column({ nullable: true })
    schoolId?: string;

    @OneToMany(() => Assessment, (assessment) => assessment.student)
    assessments!: Assessment[];

    @OneToMany(() => ReportCard, (reportCard) => reportCard.student)
    reportCards!: ReportCard[];
    @OneToMany(() => Attendance, (attendance) => attendance.student)
    attendances!: Attendance[];

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;
}
