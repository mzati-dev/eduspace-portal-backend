import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('school_holidays')
export class SchoolHoliday {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'date' })
    date!: string;

    @Column({ type: 'varchar', length: 255, name: 'class_id' })
    classId!: string;

    @Column({ type: 'varchar', length: 255 })
    reason!: string;

    @Column({ type: 'varchar', length: 50, nullable: true, name: 'school_id' })
    schoolId!: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
}