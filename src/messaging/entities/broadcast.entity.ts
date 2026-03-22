// src/modules/messaging/entities/broadcast.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface BroadcastStats {
    delivered: number;
    failed: number;
    opened: number;
}

@Entity('broadcasts')
export class Broadcast {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({ type: 'text' })
    message: string;

    @Column({
        type: 'enum',
        enum: ['high', 'medium', 'low']
    })
    priority: 'high' | 'medium' | 'low';

    @Column({ type: 'simple-array' })
    channels: string[];

    @Column({ type: 'simple-array' })
    audience: string[];

    @Column({ type: 'timestamp' })
    sentAt: Date;

    @Column({
        type: 'enum',
        enum: ['active', 'ended', 'cancelled'],
        default: 'active'
    })
    status: 'active' | 'ended' | 'cancelled';

    @Column({ type: 'jsonb', nullable: true })
    stats: BroadcastStats;

    @Column({ nullable: true })
    createdBy: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}