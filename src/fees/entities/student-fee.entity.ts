// src/modules/fees/entities/student-fee.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('student_fees')
export class StudentFee {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    studentId: string;

    @Column()
    studentName: string;

    @Column()
    examNumber: string;

    @Column()
    class: string;

    @Column()
    classId: string;

    @Column({ nullable: true })
    parentPhone: string;

    @Column({ nullable: true })
    parentEmail: string;

    @Column({ nullable: true })
    parentId: string;

    @Column()
    feeStructureId: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    paid: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    balance: number;

    @Column({
        type: 'enum',
        enum: ['paid', 'partial', 'unpaid', 'overdue'],
        default: 'unpaid'
    })
    status: 'paid' | 'partial' | 'unpaid' | 'overdue';

    @Column({ type: 'jsonb', nullable: true })
    lastPayment: {
        date: string;
        amount: number;
        method: string;
        reference: string;
    };

    @Column({ type: 'jsonb', nullable: true })
    feeStructure: {
        id: string;
        term: string;
        academicYear: string;
        tuition: number;
        development: number;
        sports: number;
        library: number;
        transport: number;
        total: number;
        dueDate: string;
        classId?: string;
        className?: string;
    };

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}