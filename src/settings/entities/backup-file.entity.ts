// src/modules/settings/entities/backup-file.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('backup_files')
export class BackupFile {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    schoolId: string;

    @Column()
    name: string;

    @Column()
    filePath: string;

    @Column({ type: 'bigint' })
    size: number;

    @Column({ type: 'jsonb', nullable: true })
    metadata: {
        type: 'full' | 'partial';
        includesMedia: boolean;
        version: string;
    };

    @CreateDateColumn()
    createdAt: Date;
}