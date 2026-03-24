import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface MessageAttachment {
    name: string;
    size: string;
    url?: string;
}

export enum MessageRecipientType {
    PARENT = 'parent',
    ADMIN = 'admin',
    CLASS = 'class',
}

export enum AnnouncementType {
    GENERAL = 'general',
    ACADEMIC = 'academic',
    EVENT = 'event',
    EMERGENCY = 'emergency',
}

export enum AnnouncementAudience {
    ALL = 'all',
    PARENTS = 'parents',
    STAFF = 'staff',
    ADMIN = 'admin',
}

@Entity('teacher_messages')
export class TeacherMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    teacherId: string;

    @Column({ nullable: true })
    parentId: string;

    @Column({ nullable: true })
    parentName: string;

    @Column({ nullable: true })
    adminId: string;

    @Column({ nullable: true })
    adminName: string;

    @Column({ nullable: true })
    adminRole: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ nullable: true })
    subject: string;

    @Column({ type: 'timestamp' })
    timestamp: Date;

    @Column({ default: false })
    read: boolean;

    @Column({ type: 'jsonb', nullable: true })
    attachments: MessageAttachment[];

    @Column({ nullable: true })
    studentName: string;

    @Column({ nullable: true })
    studentClass: string;

    @Column({ nullable: true })
    studentId: string;

    @Column({ nullable: true })
    classId: string;

    @Column({
        type: 'enum',
        enum: ['incoming', 'outgoing'],
        default: 'incoming'
    })
    direction: 'incoming' | 'outgoing';

    @Column({
        type: 'enum',
        enum: MessageRecipientType,
        default: MessageRecipientType.PARENT
    })
    recipientType: MessageRecipientType;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

@Entity('teacher_parents')
export class TeacherParent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    studentName: string;

    @Column()
    studentClass: string;

    @Column()
    studentId: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    avatar: string;

    @Column({ nullable: true })
    teacherId: string;

    @Column({ nullable: true })
    classId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

// NEW ENTITY: Admins
@Entity('teacher_admins')
export class TeacherAdmin {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    email: string;

    @Column()
    role: string;

    @Column({ nullable: true })
    department: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    avatar: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

// NEW ENTITY: Announcements
@Entity('announcements')
export class Announcement {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({ type: 'text' })
    content: string;

    @Column({
        type: 'enum',
        enum: AnnouncementType,
        default: AnnouncementType.GENERAL
    })
    type: AnnouncementType;

    @Column({
        type: 'enum',
        enum: AnnouncementAudience,
        default: AnnouncementAudience.ALL
    })
    audience: AnnouncementAudience;

    @Column({ default: false })
    isPinned: boolean;

    @Column({ type: 'timestamp', nullable: true })
    scheduledDate: Date;

    @Column({ type: 'timestamp', nullable: true })
    expiresAt: Date;

    @Column({ type: 'jsonb', default: [] })
    readBy: string[];

    @Column({ type: 'jsonb', nullable: true })
    attachments: MessageAttachment[];

    @Column()
    createdById: string;

    @Column()
    createdByName: string;

    @Column()
    createdByRole: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

// // src/modules/teacher-messages/entities/teacher-message.entity.ts
// import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// export interface MessageAttachment {
//     name: string;
//     size: string;
//     url?: string;
// }

// @Entity('teacher_messages')
// export class TeacherMessage {
//     @PrimaryGeneratedColumn('uuid')
//     id: string;

//     @Column()
//     teacherId: string;

//     @Column()
//     parentId: string;

//     @Column()
//     parentName: string;

//     @Column({ type: 'text' })
//     content: string;

//     @Column({ nullable: true })
//     subject: string;

//     @Column({ type: 'timestamp' })
//     timestamp: Date;

//     @Column({ default: false })
//     read: boolean;

//     @Column({ type: 'jsonb', nullable: true })
//     attachments: MessageAttachment[];

//     @Column()
//     studentName: string;

//     @Column()
//     studentClass: string;

//     @Column({ nullable: true })
//     studentId: string;

//     @Column({
//         type: 'enum',
//         enum: ['incoming', 'outgoing'],
//         default: 'incoming'
//     })
//     direction: 'incoming' | 'outgoing';

//     @CreateDateColumn()
//     createdAt: Date;

//     @UpdateDateColumn()
//     updatedAt: Date;
// }