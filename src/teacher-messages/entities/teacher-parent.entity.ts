// // src/modules/teacher-messages/entities/teacher-parent.entity.ts
// import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// @Entity('teacher_parents')
// export class TeacherParent {
//     @PrimaryGeneratedColumn('uuid')
//     id: string;

//     @Column()
//     name: string;

//     @Column()
//     studentName: string;

//     @Column()
//     studentClass: string;

//     @Column()
//     studentId: string;

//     @Column({ nullable: true })
//     email: string;

//     @Column({ nullable: true })
//     phone: string;

//     @Column({ nullable: true })
//     avatar: string;

//     @Column({ nullable: true })
//     teacherId: string;

//     @Column({ nullable: true })
//     classId: string;

//     @CreateDateColumn()
//     createdAt: Date;

//     @UpdateDateColumn()
//     updatedAt: Date;
// }