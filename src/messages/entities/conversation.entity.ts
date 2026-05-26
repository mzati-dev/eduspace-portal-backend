// src/modules/messages/entities/conversation.entity.ts

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('conversations')
export class Conversation {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'participant_one_id', type: 'uuid' })
    participantOneId!: string;

    @Column({ name: 'participant_one_role', type: 'varchar', length: 20 })
    participantOneRole!: string;

    @Column({ name: 'participant_two_id', type: 'uuid' })
    participantTwoId!: string;

    @Column({ name: 'participant_two_role', type: 'varchar', length: 20 })
    participantTwoRole!: string;

    @Column({ name: 'school_id', type: 'uuid', nullable: true })
    schoolId!: string;

    @Column({ name: 'last_message', type: 'text', nullable: true })
    lastMessage!: string | null;

    @Column({ name: 'last_message_at', type: 'timestamp', nullable: true })
    lastMessageAt!: Date | null;

    @Column({ name: 'unread_count_p1', type: 'int', default: 0 })
    unreadCountP1!: number;

    @Column({ name: 'unread_count_p2', type: 'int', default: 0 })
    unreadCountP2!: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}