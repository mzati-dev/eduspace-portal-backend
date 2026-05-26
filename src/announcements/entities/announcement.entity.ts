// src/modules/announcements/entities/announcement.entity.ts

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('announcements')
export class Announcement {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255 })
    title!: string;

    @Column({ type: 'text' })
    content!: string;

    @Column({ type: 'varchar', length: 20 })
    type!: string;

    @Column({ type: 'varchar', length: 20 })
    audience!: string;

    @Column({ type: 'varchar', length: 20, default: 'medium' })
    priority!: string;

    @Column({ name: 'is_pinned', type: 'boolean', default: false })
    isPinned!: boolean;

    @Column({ name: 'school_id', type: 'uuid', nullable: true })
    schoolId!: string;

    @Column({ name: 'published_by', type: 'uuid' })
    publishedBy!: string;

    @Column({ name: 'published_by_role', type: 'varchar', length: 20 })
    publishedByRole!: string;

    @Column({ name: 'publish_date', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    publishDate!: Date;

    @Column({ name: 'expiry_date', type: 'timestamp', nullable: true })
    expiryDate!: Date | null;  // ← CHANGE: Add | null

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}