// src/modules/timetable/entities/time-slot.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('time_slots')
export class TimeSlot {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    period: number;

    @Column()
    startTime: string;

    @Column()
    endTime: string;

    @Column({ default: false })
    break: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}