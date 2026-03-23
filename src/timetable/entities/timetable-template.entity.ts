// src/modules/timetable/entities/timetable-template.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('timetable_templates')
export class TimetableTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ type: 'jsonb' })
    data: {
        monday: TemplateEntry[];
        tuesday: TemplateEntry[];
        wednesday: TemplateEntry[];
        thursday: TemplateEntry[];
        friday: TemplateEntry[];
    };

    @Column({ nullable: true })
    createdBy: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

export interface TemplateEntry {
    period: number;
    defaultSubjectId?: string;
    defaultTeacherId?: string;
    defaultRoom?: string;
}