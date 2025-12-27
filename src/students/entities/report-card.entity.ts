// src/students/entities/report-card.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Student } from './student.entity';


@Entity('report_cards')
export class ReportCard {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    term: string;

    @Column({ default: 0 })
    classRank: number;

    // ADD THESE 2 FIELDS:
    @Column({ default: 0 })
    qa1Rank: number;

    @Column({ default: 0 })
    qa2Rank: number;

    @Column({ default: 0 })
    totalStudents: number;

    @Column({ default: 0 })
    daysPresent: number;

    @Column({ default: 0 })
    daysAbsent: number;

    @Column({ default: 0 })
    daysLate: number;

    @Column({ type: 'text', nullable: true })
    teacherRemarks: string;

    @ManyToOne(() => Student, (student) => student.reportCards)
    student: Student;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt: Date;
}

// @Entity('report_cards')
// export class ReportCard {
//     @PrimaryGeneratedColumn('uuid')
//     id: string;

//     @Column()
//     term: string;

//     @Column({ default: 0 })
//     classRank: number;

//     @Column({ default: 0 })
//     totalStudents: number;

//     @Column({ default: 0 })
//     daysPresent: number;

//     @Column({ default: 0 })
//     daysAbsent: number;

//     @Column({ default: 0 })
//     daysLate: number;

//     @Column({ type: 'text', nullable: true })
//     teacherRemarks: string;

//     @ManyToOne(() => Student, (student) => student.reportCards)
//     student: Student;

//     @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
//     createdAt: Date;

//     @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
//     updatedAt: Date;
// }