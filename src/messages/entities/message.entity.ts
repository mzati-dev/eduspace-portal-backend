// src/modules/messages/entities/message.entity.ts

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('messages')
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'sender_id', type: 'uuid' })
    senderId!: string;

    @Column({ name: 'sender_role', type: 'varchar', length: 20 })
    senderRole!: string; // 'admin', 'teacher', 'parent'

    @Column({ name: 'recipient_id', type: 'uuid' })
    recipientId!: string;

    @Column({ name: 'recipient_role', type: 'varchar', length: 20 })
    recipientRole!: string; // 'admin', 'teacher', 'parent'

    @Column({ type: 'varchar', length: 255, nullable: true })
    subject!: string | null;

    @Column({ type: 'text' })
    content!: string;

    @Column({ type: 'varchar', length: 20, default: 'sms' })
    type!: string; // 'sms', 'email', 'both'

    @Column({ type: 'boolean', default: false })
    read!: boolean;

    @Column({ name: 'read_at', type: 'timestamp', nullable: true })
    readAt!: Date | null;

    @Column({ name: 'school_id', type: 'uuid', nullable: true })
    schoolId!: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
}