// src/students/entities/assessment.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique } from 'typeorm';
import { Student } from './student.entity';
import { Subject } from './subject.entity';
import { Class } from './class.entity';

@Entity('assessments')
@Unique(['student', 'subject', 'assessmentType', 'class']) // Add class to unique constraint
export class Assessment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    assessmentType: 'qa1' | 'qa2' | 'end_of_term';

    // @Column('int')
    // score: number;
    // 🔴 CHANGE 1: Make score nullable (allows null for empty fields)
    @Column('int', { nullable: true })  // 👈 Add nullable: true
    score: number | null;  // 👈 Change type to allow null

    @Column({ default: false })
    isAbsent: boolean;

    // @Column()
    // grade: string;
    // 🔴 CHANGE 2: Make grade nullable (allows null when no score)
    @Column({ type: 'varchar', nullable: true })  // 👈 Add type: 'varchar'
    grade: string | null;  // 👈 Change type to allow null

    @ManyToOne(() => Student, (student) => student.assessments, { onDelete: 'CASCADE' })
    student: Student;

    @ManyToOne(() => Subject, (subject) => subject.assessments, { onDelete: 'CASCADE' })
    subject: Subject;

    @ManyToOne(() => Class, (cls) => cls.assessments, { onDelete: 'CASCADE' })
    class: Class; // ADD THIS LINE

    @Column({ nullable: true })
    lock_reason: string; // 'fee' or ' 'teacher'

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt: Date;

    @Column({ default: false })
    is_locked: boolean;
}
