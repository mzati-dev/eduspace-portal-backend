import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('public_holidays')
export class PublicHoliday {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'date' })
    date!: string;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ type: 'varchar', length: 50, nullable: true, name: 'school_id' })
    schoolId!: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
}