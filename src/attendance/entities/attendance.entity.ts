import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { Class } from '../../students/entities/class.entity';

@Entity('attendances')
export class Attendance {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'student_id' })
    studentId: string;

    @Column({ name: 'class_id' })
    classId: string;

    @Column({ type: 'date' })
    date: string;

    @Column({
        type: 'enum',
        enum: ['present', 'absent', 'late', 'excused'],
        default: 'present'
    })
    status: string;

    @Column({ name: 'check_in_time', nullable: true })
    checkInTime: string;

    @Column({ nullable: true })
    notes: string;

    @Column({ name: 'marked_by', nullable: true })
    markedBy: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relations (optional for queries)
    @ManyToOne(() => Student, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'student_id' })
    student?: Student;

    @ManyToOne(() => Class, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'class_id' })
    class?: Class;
}