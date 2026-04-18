import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Class } from '../../students/entities/class.entity';

@Entity('attendance_alerts')
export class AttendanceAlert {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Class)
    @JoinColumn({ name: 'class_id' })
    class!: Class;

    @Column({ name: 'class_id' })
    classId!: string;

    @Column({ type: 'date' })
    date!: string;

    @Column()
    method!: string; // 'sms' or 'email'

    @Column({ name: 'recipient_count' })
    recipientCount!: number;

    @Column({ name: 'student_ids', type: 'simple-array', nullable: true })
    studentIds!: string[];

    @Column({ nullable: true })
    subject!: string;

    @Column({ nullable: true, type: 'text' })
    message!: string;

    @Column({ default: 'sent' })
    status!: string;

    @Column({ name: 'sent_by' })
    sentBy!: string; // Teacher ID

    @CreateDateColumn({ name: 'sent_at' })
    sentAt!: Date;
}