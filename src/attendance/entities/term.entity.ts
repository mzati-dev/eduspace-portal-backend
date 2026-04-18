import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('terms')
export class Term {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 100 })
    name!: string;

    @Column({ type: 'date', name: 'start_date' })
    startDate!: string;

    @Column({ type: 'date', name: 'end_date' })
    endDate!: string;

    @Column({ type: 'boolean', default: false, name: 'is_current' })
    isCurrent!: boolean;

    @Column({ type: 'varchar', length: 50, nullable: true, name: 'school_id' })
    schoolId!: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}