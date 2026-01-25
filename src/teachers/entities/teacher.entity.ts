import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { TeacherClassSubject } from './teacher-class-subject.entity';
import { School } from '../../schools/entities/school.entity';

@Entity('teachers')
export class Teacher {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @ManyToOne(() => School, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'school_id' })
    school: School;

    @Column()
    school_id: string;

    @Column({ default: true })
    is_active: boolean;

    // ADD THIS - The relationship to the link table
    @OneToMany(() => TeacherClassSubject, teacherClassSubject => teacherClassSubject.teacher,)
    classSubjects: TeacherClassSubject[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}