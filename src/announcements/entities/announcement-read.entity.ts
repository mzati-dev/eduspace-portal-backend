// src/modules/announcements/entities/announcement-read.entity.ts

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('announcement_reads')
export class AnnouncementRead {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'announcement_id', type: 'uuid' })
    announcementId!: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId!: string;

    @Column({ name: 'user_role', type: 'varchar', length: 20 })
    userRole!: string;

    @Column({ name: 'school_id', type: 'uuid', nullable: true })
    schoolId!: string;

    @CreateDateColumn({ name: 'read_at' })
    readAt!: Date;
}