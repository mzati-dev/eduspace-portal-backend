// src/students/entities/class.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { Student } from './student.entity';

@Entity('classes')
export class Class {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;  // e.g., "Grade 8A", "Form 3B"

    @Column()
    academic_year: string;  // e.g., "2024/2025"

    @Column()
    term: string;  // e.g., "Term 1", "Term 2", "Term 3"

    @Column({ unique: true })
    class_code: string;  // Auto-generated: e.g., "GR8A-2025-T1"

    @OneToMany(() => Student, (student) => student.class)
    students: Student[];

    @CreateDateColumn()
    created_at: Date;
}