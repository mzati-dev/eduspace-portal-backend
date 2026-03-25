import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('reports')
export class Report {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({
        type: 'enum',
        enum: ['academic', 'attendance', 'behavior', 'summary']
    })
    type: 'academic' | 'attendance' | 'behavior' | 'summary';

    @Column({
        type: 'enum',
        enum: ['pdf', 'excel', 'csv']
    })
    format: 'pdf' | 'excel' | 'csv';

    @Column({ nullable: true })
    classId: string;

    @Column({ nullable: true })
    className: string;

    @Column({ nullable: true })
    term: string;

    @Column()
    filePath: string;

    @Column()
    fileSize: string;

    @Column()
    generatedBy: string;

    @Column()
    generatedByName: string;

    @CreateDateColumn()
    generatedAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}