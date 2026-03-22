// src/modules/messaging/entities/contact.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('contacts')
export class Contact {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    whatsapp: string;

    @Column({
        type: 'enum',
        enum: ['parent', 'teacher', 'student', 'admin'],
        default: 'parent'
    })
    role: 'parent' | 'teacher' | 'student' | 'admin';

    @Column({ nullable: true })
    class: string;

    @Column({ nullable: true })
    classId: string;

    @Column({ nullable: true })
    studentId: string;

    @Column({ nullable: true })
    parentOf: string;

    @Column({ nullable: true })
    avatar: string;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}