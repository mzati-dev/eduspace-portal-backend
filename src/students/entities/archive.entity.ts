import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { Class } from './class.entity';

@Entity('archives')
@Index(['classId', 'term', 'academicYear'])
export class Archive {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    classId!: string;

    @Column()
    className!: string;  //

    @Column()  // ← ADD THIS
    schoolId!: string;  // ← ADD THIS

    @Column()
    term!: string;

    @Column()
    academicYear!: string;

    @Column('jsonb')
    results!: {
        overall: any[];
        qa1: any[];
        qa2: any[];
        endOfTerm: any[];
        metadata: {
            archivedAt: Date;
            term: string;
            academicYear: string;
            className: string;
            totalStudents: number;
        };
    };

    @Column({ default: false })
    is_published!: boolean;

    @Column({ default: false })
    locked_by_admin!: boolean;

    @CreateDateColumn()
    archivedAt!: Date;
}