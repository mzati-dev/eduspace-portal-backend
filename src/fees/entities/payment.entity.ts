// src/modules/fees/entities/payment.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('payments')
export class Payment {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    studentId!: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount!: number;

    @Column({
        type: 'enum',
        enum: ['cash', 'card', 'bank', 'mobile']
    })
    method!: 'cash' | 'card' | 'bank' | 'mobile';

    @Column({ nullable: true })
    reference!: string;

    @Column({ unique: true })
    receiptNumber!: string;

    @Column({
        type: 'enum',
        enum: ['completed', 'pending', 'failed'],
        default: 'completed'
    })
    status!: 'completed' | 'pending' | 'failed';

    @Column({ nullable: true })
    recordedBy!: string;

    @Column({ nullable: true, type: 'text' })
    notes!: string;

    @Column({ type: 'date' })
    date!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}