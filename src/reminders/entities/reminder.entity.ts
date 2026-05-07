import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('general_reminders')
export class Reminder {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ nullable: true })
    schoolId!: string;

    @Column()
    message!: string;

    @Column({ type: 'varchar', length: 20 })
    type!: 'urgent' | 'warning' | 'info';

    @Column({ type: 'date' })
    reminder_date!: Date;

    @Column({ default: true })
    is_active!: boolean;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}