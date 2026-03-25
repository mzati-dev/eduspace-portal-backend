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

    @Column({ name: 'class_id', nullable: true })  // ← Add name mapping
    classId: string;

    @Column({ name: 'class_name', nullable: true })  // ← Add name mapping
    className: string;

    @Column({ nullable: true })
    term: string;

    @Column({ name: 'file_path' })  // ← Add name mapping
    filePath: string;

    @Column({ name: 'file_size' })  // ← Add name mapping
    fileSize: string;

    @Column({ name: 'generated_by' })  // ← Add name mapping
    generatedBy: string;

    @Column({ name: 'generated_by_name' })  // ← Add name mapping
    generatedByName: string;

    @CreateDateColumn({ name: 'generated_at' })
    generatedAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

// import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// @Entity('reports')
// export class Report {
//     @PrimaryGeneratedColumn('uuid')
//     id: string;

//     @Column()
//     title: string;

//     @Column({
//         type: 'enum',
//         enum: ['academic', 'attendance', 'behavior', 'summary']
//     })
//     type: 'academic' | 'attendance' | 'behavior' | 'summary';

//     @Column({
//         type: 'enum',
//         enum: ['pdf', 'excel', 'csv']
//     })
//     format: 'pdf' | 'excel' | 'csv';

//     @Column({ nullable: true })
//     classId: string;

//     @Column({ nullable: true })
//     className: string;

//     @Column({ nullable: true })
//     term: string;

//     @Column()
//     filePath: string;

//     @Column()
//     fileSize: string;

//     @Column()
//     generatedBy: string;

//     @Column()
//     generatedByName: string;

//     @CreateDateColumn()
//     generatedAt: Date;

//     @UpdateDateColumn()
//     updatedAt: Date;
// }