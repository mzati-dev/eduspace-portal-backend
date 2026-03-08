import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Class } from './class.entity';

@Entity('archives')
export class Archive {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Class, { onDelete: 'CASCADE' })
    class: Class;

    @Column()
    classId: string;

    @Column()
    term: string;

    @Column()
    academicYear: string;

    @Column('jsonb')
    results: any; // Stores the full class results JSON

    @Column({ default: false })
    is_published: boolean;

    @Column({ default: false })
    locked_by_admin: boolean;

    @CreateDateColumn()
    archivedAt: Date;
}