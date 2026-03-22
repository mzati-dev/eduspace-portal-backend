// src/modules/fees/entities/fee-structure.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('fee_structures')
export class FeeStructure {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    term: string;

    @Column()
    academicYear: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    tuition: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    development: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    sports: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    library: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    transport: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    total: number;

    @Column()
    dueDate: string;

    @Column({ nullable: true })
    classId: string;

    @Column({ nullable: true })
    className: string;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}