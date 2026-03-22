// src/modules/messaging/entities/message.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface MessageRecipients {
    groups: string[];
    total: number;
    recipientIds?: string[];
}

export interface MessageStats {
    delivered: number;
    failed: number;
    pending: number;
}

@Entity('messages')
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    subject: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'jsonb' })
    recipients: MessageRecipients;

    @Column({
        type: 'enum',
        enum: ['sent', 'scheduled', 'draft', 'failed'],
        default: 'draft'
    })
    status: 'sent' | 'scheduled' | 'draft' | 'failed';

    @Column({ nullable: true, type: 'timestamp' })
    sentAt: Date | null;

    @Column({ nullable: true, type: 'timestamp' })
    scheduledFor: Date | null;

    @Column({
        type: 'enum',
        enum: ['sms', 'email', 'whatsapp', 'push', 'broadcast']
    })
    type: 'sms' | 'email' | 'whatsapp' | 'push' | 'broadcast';

    @Column({ type: 'jsonb', nullable: true })
    stats: MessageStats;

    @Column({ nullable: true })
    createdBy: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}