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

    // 👇 ADD THESE NEW PROFILE FIELDS
    @Column({ nullable: true })
    phone?: string;

    @Column({ nullable: true, type: 'text' })
    address?: string;

    @Column({
        nullable: true,
        type: 'enum',
        enum: ['male', 'female', 'other']
    })
    gender?: string;

    @Column({ nullable: true, name: 'dateofbirth' })
    dateOfBirth?: string;

    @Column({ nullable: true, name: 'profileimage' })
    profileImage?: string;

    @Column({ nullable: true, name: 'emergencycontactname' })
    emergencyContactName?: string;

    @Column({ nullable: true, name: 'emergencycontactphone' })
    emergencyContactPhone?: string;

    @Column({ nullable: true, name: 'emergencycontactrelation' })
    emergencyContactRelation?: string;

    @Column({ nullable: true, name: 'lastlogin' })
    lastLogin?: Date;
    // 👆 END NEW PROFILE FIELDS

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