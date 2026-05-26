// src/modules/reminders/entities/reminder.entity.ts

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('reminders')
export class Reminder {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'text' })
    message!: string;

    @Column({ type: 'varchar', length: 20 })
    type!: string; // 'info', 'warning', 'urgent'

    @Column({ type: 'varchar', length: 20 })
    audience!: string; // 'teachers', 'parents', 'both'

    @Column({ type: 'date', name: 'reminder_date' })
    reminderDate!: Date;

    @Column({ name: 'school_id', type: 'uuid', nullable: true })
    schoolId!: string;

    @Column({ name: 'created_by', type: 'uuid' })
    createdBy!: string;

    @Column({ name: 'created_by_role', type: 'varchar', length: 20 })
    createdByRole!: string;

    @Column({ name: 'is_sent', type: 'boolean', default: false })
    isSent!: boolean;

    @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
    sentAt!: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}