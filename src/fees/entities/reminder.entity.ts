// src/modules/fees/entities/reminder.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('reminders')
export class Reminder {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    studentId!: string;

    @Column({
        type: 'enum',
        enum: ['sms', 'email', 'push']
    })
    type!: 'sms' | 'email' | 'push';

    @Column({ type: 'timestamp' })
    sentAt!: Date;

    @Column({
        type: 'enum',
        enum: ['sent', 'failed', 'pending'],
        default: 'pending'
    })
    status!: 'sent' | 'failed' | 'pending';

    @Column({ type: 'text' })
    message!: string;

    @Column({ nullable: true })
    recipientCount!: number;

    @Column({ nullable: true })
    sentBy!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}