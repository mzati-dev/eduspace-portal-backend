// src/modules/messaging/entities/event.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface EventReminders {
    enabled: boolean;
    daysBefore: number[];
}

@Entity('events')
export class Event {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({ type: 'text' })
    description: string;

    @Column({
        type: 'enum',
        enum: ['parent_teacher', 'sports', 'academic', 'holiday', 'emergency', 'general']
    })
    type: 'parent_teacher' | 'sports' | 'academic' | 'holiday' | 'emergency' | 'general';

    @Column()
    date: string;

    @Column()
    time: string;

    @Column({ nullable: true })
    endDate: string;

    @Column({ nullable: true })
    endTime: string;

    @Column()
    location: string;

    @Column({ type: 'simple-array' })
    audience: string[];

    @Column({
        type: 'enum',
        enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
        default: 'upcoming'
    })
    status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

    @Column({ type: 'jsonb' })
    reminders: EventReminders;

    @Column({ type: 'simple-array', nullable: true })
    attachments: string[];

    @Column({ nullable: true })
    createdBy: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}