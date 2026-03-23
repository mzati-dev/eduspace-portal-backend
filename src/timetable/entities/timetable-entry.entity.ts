// src/modules/timetable/entities/timetable-entry.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('timetable_entries')
export class TimetableEntry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    })
    day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

    @Column()
    period: number;

    @Column()
    classId: string;

    @Column()
    subjectId: string;

    @Column()
    teacherId: string;

    @Column()
    room: string;

    @Column()
    startTime: string;

    @Column()
    endTime: string;

    @Column({ nullable: true })
    academicYear: string;

    @Column({ nullable: true })
    term: string;

    @Column({ nullable: true })
    weekStart: string;

    @Column({ default: false })
    isPublished: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}