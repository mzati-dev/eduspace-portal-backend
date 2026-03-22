// src/modules/teacher-messages/entities/teacher-message.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface MessageAttachment {
    name: string;
    size: string;
    url?: string;
}

@Entity('teacher_messages')
export class TeacherMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    teacherId: string;

    @Column()
    parentId: string;

    @Column()
    parentName: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ nullable: true })
    subject: string;

    @Column({ type: 'timestamp' })
    timestamp: Date;

    @Column({ default: false })
    read: boolean;

    @Column({ type: 'jsonb', nullable: true })
    attachments: MessageAttachment[];

    @Column()
    studentName: string;

    @Column()
    studentClass: string;

    @Column({ nullable: true })
    studentId: string;

    @Column({
        type: 'enum',
        enum: ['incoming', 'outgoing'],
        default: 'incoming'
    })
    direction: 'incoming' | 'outgoing';

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}