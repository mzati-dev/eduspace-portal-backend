import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, IsNull } from 'typeorm';
import { TeacherMessage, TeacherParent, TeacherAdmin, Announcement, MessageRecipientType, AnnouncementType, AnnouncementAudience } from './entities/teacher-message.entity';

@Injectable()
export class TeacherMessagesService {
  constructor(
    @InjectRepository(TeacherMessage)
    private messageRepository: Repository<TeacherMessage>,
    @InjectRepository(TeacherParent)
    private parentRepository: Repository<TeacherParent>,
    @InjectRepository(TeacherAdmin)
    private adminRepository: Repository<TeacherAdmin>,
    @InjectRepository(Announcement)
    private announcementRepository: Repository<Announcement>,
  ) { }

  // ============= PARENTS =============
  async getParents(teacherId: string): Promise<TeacherParent[]> {
    return this.parentRepository.find({
      where: { teacherId },
      order: { name: 'ASC' }
    });
  }

  // ============= ADMINS =============
  async getAdmins(): Promise<TeacherAdmin[]> {
    return this.adminRepository.find({
      order: { name: 'ASC' }
    });
  }

  // ============= INBOX =============
  async getInbox(teacherId: string): Promise<TeacherMessage[]> {
    return this.messageRepository.find({
      where: [
        { teacherId, direction: 'incoming', recipientType: MessageRecipientType.PARENT },
        { teacherId, direction: 'incoming', recipientType: MessageRecipientType.ADMIN }
      ],
      order: { timestamp: 'DESC' }
    });
  }

  // ============= SENT MESSAGES =============
  async getSentMessages(teacherId: string): Promise<TeacherMessage[]> {
    return this.messageRepository.find({
      where: { teacherId, direction: 'outgoing' },
      order: { timestamp: 'DESC' }
    });
  }

  // ============= SEND MESSAGE =============
  async sendMessage(data: any): Promise<TeacherMessage[]> {
    const { teacherId, recipientIds, classId, recipientType, subject, content, attachments } = data;

    const messages: TeacherMessage[] = [];

    if (recipientType === 'class' && classId) {
      // Send to entire class
      const parents = await this.parentRepository.find({ where: { teacherId, classId } });
      for (const parent of parents) {
        const message = this.messageRepository.create({
          teacherId,
          parentId: parent.id,
          parentName: parent.name,
          studentName: parent.studentName,
          studentClass: parent.studentClass,
          studentId: parent.studentId,
          classId,
          content,
          subject,
          timestamp: new Date(),
          direction: 'outgoing',
          read: false,
          recipientType: MessageRecipientType.CLASS,
          attachments: attachments?.map((f: any) => ({ name: f.originalname, size: `${f.size}`, url: '' })) || [],
        });
        messages.push(await this.messageRepository.save(message));
      }
    } else if (recipientType === 'admin' && recipientIds) {
      // Send to admins
      for (const adminId of recipientIds) {
        const admin = await this.adminRepository.findOne({ where: { id: adminId } });
        if (admin) {
          const message = this.messageRepository.create({
            teacherId,
            adminId: admin.id,
            adminName: admin.name,
            adminRole: admin.role,
            content,
            subject,
            timestamp: new Date(),
            direction: 'outgoing',
            read: false,
            recipientType: MessageRecipientType.ADMIN,
            attachments: attachments?.map((f: any) => ({ name: f.originalname, size: `${f.size}`, url: '' })) || [],
          });
          messages.push(await this.messageRepository.save(message));
        }
      }
    } else if (recipientType === 'parent' && recipientIds) {
      // Send to specific parents
      for (const parentId of recipientIds) {
        const parent = await this.parentRepository.findOne({ where: { id: parentId } });
        if (parent) {
          const message = this.messageRepository.create({
            teacherId,
            parentId: parent.id,
            parentName: parent.name,
            studentName: parent.studentName,
            studentClass: parent.studentClass,
            studentId: parent.studentId,
            content,
            subject,
            timestamp: new Date(),
            direction: 'outgoing',
            read: false,
            recipientType: MessageRecipientType.PARENT,
            attachments: attachments?.map((f: any) => ({ name: f.originalname, size: `${f.size}`, url: '' })) || [],
          });
          messages.push(await this.messageRepository.save(message));
        }
      }
    }

    return messages;
  }

  // ============= MARK MESSAGE AS READ =============
  async markAsRead(messageId: string): Promise<void> {
    await this.messageRepository.update(messageId, { read: true });
  }

  // ============= GET STATS =============
  async getStats(teacherId: string): Promise<any> {
    const [unread, totalParents, messagesSent] = await Promise.all([
      this.messageRepository.count({ 
        where: [
          { teacherId, direction: 'incoming', read: false, recipientType: MessageRecipientType.PARENT },
          { teacherId, direction: 'incoming', read: false, recipientType: MessageRecipientType.ADMIN }
        ] 
      }),
      this.parentRepository.count({ where: { teacherId } }),
      this.messageRepository.count({ where: { teacherId, direction: 'outgoing' } }),
    ]);

    return { unread, totalParents, messagesSent };
  }

  // ============= DELETE MESSAGE =============
  async deleteMessage(messageId: string): Promise<void> {
    const result = await this.messageRepository.delete(messageId);
    if (result.affected === 0) throw new NotFoundException('Message not found');
  }

  // ============= ANNOUNCEMENTS =============
  async getAnnouncements(userId: string, userRole: string): Promise<Announcement[]> {
    const now = new Date();
    const audienceValue = userRole === 'teacher' ? 'staff' : userRole;
    
    const announcements = await this.announcementRepository.find({
      where: [
        { scheduledDate: IsNull(), audience: In(['all', audienceValue]) },
        { scheduledDate: LessThan(now), audience: In(['all', audienceValue]) }
      ],
      order: { isPinned: 'DESC', createdAt: 'DESC' }
    });

    // Filter out expired announcements
    return announcements.filter(ann => {
      if (ann.expiresAt && new Date(ann.expiresAt) < now) return false;
      return true;
    });
  }

  // ============= CREATE ANNOUNCEMENT =============
  async createAnnouncement(data: any): Promise<Announcement> {
    const { userId, userRole, title, content, type, audience, isPinned, scheduledDate, expiresAt, attachments, userName } = data;

    const announcement = this.announcementRepository.create({
      title,
      content,
      type: type as AnnouncementType,
      audience: audience as AnnouncementAudience,
      isPinned: isPinned === 'true' || isPinned === true,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      attachments: attachments?.map((f: any) => ({ name: f.originalname, size: `${f.size}`, url: '' })) || [],
      createdById: userId,
      createdByName: userName || 'Unknown',
      createdByRole: userRole,
      readBy: [],
    });

    return this.announcementRepository.save(announcement);
  }

  // ============= UPDATE ANNOUNCEMENT =============
  async updateAnnouncement(announcementId: string, data: any): Promise<Announcement> {
    const announcement = await this.announcementRepository.findOne({ where: { id: announcementId } });
    if (!announcement) throw new NotFoundException('Announcement not found');

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.audience !== undefined) updateData.audience = data.audience;
    if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;
    if (data.scheduledDate !== undefined) updateData.scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : undefined;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : undefined;

    Object.assign(announcement, updateData);
    return this.announcementRepository.save(announcement);
  }

  // ============= DELETE ANNOUNCEMENT =============
  async deleteAnnouncement(announcementId: string): Promise<void> {
    const result = await this.announcementRepository.delete(announcementId);
    if (result.affected === 0) throw new NotFoundException('Announcement not found');
  }

  // ============= MARK ANNOUNCEMENT AS READ =============
  async markAnnouncementAsRead(announcementId: string, userId: string): Promise<void> {
    const announcement = await this.announcementRepository.findOne({ where: { id: announcementId } });
    if (!announcement) throw new NotFoundException('Announcement not found');

    if (!announcement.readBy.includes(userId)) {
      announcement.readBy.push(userId);
      await this.announcementRepository.save(announcement);
    }
  }

  // ============= GET ANNOUNCEMENT STATS =============
  async getAnnouncementStats(userId: string): Promise<any> {
    const now = new Date();
    
    const total = await this.announcementRepository.count({
      where: [
        { scheduledDate: IsNull() },
        { scheduledDate: LessThan(now) }
      ]
    });
    
    const pinned = await this.announcementRepository.count({ where: { isPinned: true } });
    
    const announcements = await this.announcementRepository.find();
    const unread = announcements.filter(ann => !ann.readBy.includes(userId)).length;

    return { total, unread, pinned };
  }
}

// import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository, In, LessThan } from 'typeorm';
// import { TeacherMessage, TeacherParent, TeacherAdmin, Announcement, MessageRecipientType, AnnouncementType, AnnouncementAudience } from './entities/teacher-message.entity';

// @Injectable()
// export class TeacherMessagesService {
//   constructor(
//     @InjectRepository(TeacherMessage)
//     private messageRepository: Repository<TeacherMessage>,
//     @InjectRepository(TeacherParent)
//     private parentRepository: Repository<TeacherParent>,
//     @InjectRepository(TeacherAdmin)
//     private adminRepository: Repository<TeacherAdmin>,
//     @InjectRepository(Announcement)
//     private announcementRepository: Repository<Announcement>,
//   ) { }

//   // ============= PARENTS =============
//   async getParents(teacherId: string): Promise<TeacherParent[]> {
//     return this.parentRepository.find({
//       where: { teacherId },
//       order: { name: 'ASC' }
//     });
//   }

//   // ============= ADMINS =============
//   async getAdmins(): Promise<TeacherAdmin[]> {
//     return this.adminRepository.find({
//       order: { name: 'ASC' }
//     });
//   }

//   // ============= INBOX =============
//   async getInbox(teacherId: string): Promise<TeacherMessage[]> {
//     return this.messageRepository.find({
//       where: [
//         { teacherId, direction: 'incoming', recipientType: MessageRecipientType.PARENT },
//         { teacherId, direction: 'incoming', recipientType: MessageRecipientType.ADMIN }
//       ],
//       order: { timestamp: 'DESC' }
//     });
//   }

//   // ============= SENT MESSAGES =============
//   async getSentMessages(teacherId: string): Promise<TeacherMessage[]> {
//     return this.messageRepository.find({
//       where: { teacherId, direction: 'outgoing' },
//       order: { timestamp: 'DESC' }
//     });
//   }

//   // ============= SEND MESSAGE =============
//   async sendMessage(data: any): Promise<TeacherMessage[]> {
//     const { teacherId, recipientIds, classId, recipientType, subject, content, attachments, teacherName } = data;

//     const messages: TeacherMessage[] = [];

//     if (recipientType === 'class' && classId) {
//       // Send to entire class
//       const parents = await this.parentRepository.find({ where: { teacherId, classId } });
//       for (const parent of parents) {
//         const message = this.messageRepository.create({
//           teacherId,
//           parentId: parent.id,
//           parentName: parent.name,
//           studentName: parent.studentName,
//           studentClass: parent.studentClass,
//           studentId: parent.studentId,
//           classId,
//           content,
//           subject,
//           timestamp: new Date(),
//           direction: 'outgoing',
//           read: false,
//           recipientType: MessageRecipientType.CLASS,
//           attachments: attachments?.map(f => ({ name: f.originalname, size: `${f.size}`, url: '' })) || [],
//         });
//         messages.push(await this.messageRepository.save(message));
//       }
//     } else if (recipientType === 'admin' && recipientIds) {
//       // Send to admins
//       for (const adminId of recipientIds) {
//         const admin = await this.adminRepository.findOne({ where: { id: adminId } });
//         if (admin) {
//           const message = this.messageRepository.create({
//             teacherId,
//             adminId: admin.id,
//             adminName: admin.name,
//             adminRole: admin.role,
//             content,
//             subject,
//             timestamp: new Date(),
//             direction: 'outgoing',
//             read: false,
//             recipientType: MessageRecipientType.ADMIN,
//             attachments: attachments?.map(f => ({ name: f.originalname, size: `${f.size}`, url: '' })) || [],
//           });
//           messages.push(await this.messageRepository.save(message));
//         }
//       }
//     } else if (recipientType === 'parent' && recipientIds) {
//       // Send to specific parents
//       for (const parentId of recipientIds) {
//         const parent = await this.parentRepository.findOne({ where: { id: parentId } });
//         if (parent) {
//           const message = this.messageRepository.create({
//             teacherId,
//             parentId: parent.id,
//             parentName: parent.name,
//             studentName: parent.studentName,
//             studentClass: parent.studentClass,
//             studentId: parent.studentId,
//             content,
//             subject,
//             timestamp: new Date(),
//             direction: 'outgoing',
//             read: false,
//             recipientType: MessageRecipientType.PARENT,
//             attachments: attachments?.map(f => ({ name: f.originalname, size: `${f.size}`, url: '' })) || [],
//           });
//           messages.push(await this.messageRepository.save(message));
//         }
//       }
//     }

//     return messages;
//   }

//   // ============= MARK MESSAGE AS READ =============
//   async markAsRead(messageId: string): Promise<void> {
//     await this.messageRepository.update(messageId, { read: true });
//   }

//   // ============= GET STATS =============
//   async getStats(teacherId: string): Promise<any> {
//     const [unread, totalParents, messagesSent] = await Promise.all([
//       this.messageRepository.count({ 
//         where: [
//           { teacherId, direction: 'incoming', read: false, recipientType: MessageRecipientType.PARENT },
//           { teacherId, direction: 'incoming', read: false, recipientType: MessageRecipientType.ADMIN }
//         ] 
//       }),
//       this.parentRepository.count({ where: { teacherId } }),
//       this.messageRepository.count({ where: { teacherId, direction: 'outgoing' } }),
//     ]);

//     return { unread, totalParents, messagesSent };
//   }

//   // ============= DELETE MESSAGE =============
//   async deleteMessage(messageId: string): Promise<void> {
//     const result = await this.messageRepository.delete(messageId);
//     if (result.affected === 0) throw new NotFoundException('Message not found');
//   }

//   // ============= ANNOUNCEMENTS =============
//   async getAnnouncements(userId: string, userRole: string): Promise<Announcement[]> {
//     const now = new Date();
    
//     const announcements = await this.announcementRepository.find({
//       where: [
//         { scheduledDate: null, audience: In(['all', userRole === 'teacher' ? 'staff' : userRole]) },
//         { scheduledDate: LessThan(now), audience: In(['all', userRole === 'teacher' ? 'staff' : userRole]) }
//       ],
//       order: { isPinned: 'DESC', createdAt: 'DESC' }
//     });

//     // Filter out expired announcements
//     return announcements.filter(ann => {
//       if (ann.expiresAt && new Date(ann.expiresAt) < now) return false;
//       return true;
//     });
//   }

//   // ============= CREATE ANNOUNCEMENT =============
//   async createAnnouncement(data: any): Promise<Announcement> {
//     const { userId, userRole, title, content, type, audience, isPinned, scheduledDate, expiresAt, attachments, userName } = data;

//     const announcement = this.announcementRepository.create({
//       title,
//       content,
//       type: type as AnnouncementType,
//       audience: audience as AnnouncementAudience,
//       isPinned: isPinned === 'true' || isPinned === true,
//       scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
//       expiresAt: expiresAt ? new Date(expiresAt) : null,
//       attachments: attachments?.map(f => ({ name: f.originalname, size: `${f.size}`, url: '' })) || [],
//       createdById: userId,
//       createdByName: userName || 'Unknown',
//       createdByRole: userRole,
//       readBy: [],
//     });

//     return this.announcementRepository.save(announcement);
//   }

//   // ============= UPDATE ANNOUNCEMENT =============
//   async updateAnnouncement(announcementId: string, data: any): Promise<Announcement> {
//     const announcement = await this.announcementRepository.findOne({ where: { id: announcementId } });
//     if (!announcement) throw new NotFoundException('Announcement not found');

//     Object.assign(announcement, {
//       ...(data.title && { title: data.title }),
//       ...(data.content && { content: data.content }),
//       ...(data.type && { type: data.type }),
//       ...(data.audience && { audience: data.audience }),
//       ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
//       ...(data.scheduledDate && { scheduledDate: new Date(data.scheduledDate) }),
//       ...(data.expiresAt && { expiresAt: new Date(data.expiresAt) }),
//     });

//     return this.announcementRepository.save(announcement);
//   }

//   // ============= DELETE ANNOUNCEMENT =============
//   async deleteAnnouncement(announcementId: string): Promise<void> {
//     const result = await this.announcementRepository.delete(announcementId);
//     if (result.affected === 0) throw new NotFoundException('Announcement not found');
//   }

//   // ============= MARK ANNOUNCEMENT AS READ =============
//   async markAnnouncementAsRead(announcementId: string, userId: string): Promise<void> {
//     const announcement = await this.announcementRepository.findOne({ where: { id: announcementId } });
//     if (!announcement) throw new NotFoundException('Announcement not found');

//     if (!announcement.readBy.includes(userId)) {
//       announcement.readBy.push(userId);
//       await this.announcementRepository.save(announcement);
//     }
//   }

//   // ============= GET ANNOUNCEMENT STATS =============
//   async getAnnouncementStats(userId: string): Promise<any> {
//     const now = new Date();
    
//     const total = await this.announcementRepository.count({
//       where: [
//         { scheduledDate: null },
//         { scheduledDate: LessThan(now) }
//       ]
//     });
    
//     const pinned = await this.announcementRepository.count({ where: { isPinned: true } });
    
//     const announcements = await this.announcementRepository.find();
//     const unread = announcements.filter(ann => !ann.readBy.includes(userId)).length;

//     return { total, unread, pinned };
//   }
// }

// // src/modules/teacher-messages/teacher-messages.service.ts
// import { Injectable, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { TeacherMessage } from './entities/teacher-message.entity';
// import { TeacherParent } from './entities/teacher-parent.entity';

// @Injectable()
// export class TeacherMessagesService {
//   constructor(
//     @InjectRepository(TeacherMessage)
//     private messageRepository: Repository<TeacherMessage>,
//     @InjectRepository(TeacherParent)
//     private parentRepository: Repository<TeacherParent>,
//   ) { }

//   async getParents(teacherId: string): Promise<TeacherParent[]> {
//     return this.parentRepository.find({
//       where: { teacherId },
//       order: { name: 'ASC' }
//     });
//   }

//   async getInbox(teacherId: string): Promise<TeacherMessage[]> {
//     return this.messageRepository.find({
//       where: { teacherId, direction: 'incoming' },
//       order: { timestamp: 'DESC' }
//     });
//   }

//   async getSentMessages(teacherId: string): Promise<TeacherMessage[]> {
//     return this.messageRepository.find({
//       where: { teacherId, direction: 'outgoing' },
//       order: { timestamp: 'DESC' }
//     });
//   }

//   async sendMessage(data: any): Promise<TeacherMessage> {
//     const { teacherId, recipientIds, classId, subject, content, attachments } = data;

//     const messages: TeacherMessage[] = [];

//     if (classId) {
//       // Send to entire class
//       const parents = await this.parentRepository.find({ where: { teacherId, classId } });
//       for (const parent of parents) {
//         const message = this.messageRepository.create({
//           teacherId,
//           parentId: parent.id,
//           parentName: parent.name,
//           studentName: parent.studentName,
//           studentClass: parent.studentClass,
//           studentId: parent.studentId,
//           content,
//           subject,
//           timestamp: new Date(),
//           direction: 'outgoing',
//           read: false,
//           attachments: attachments?.map(f => ({ name: f.originalname, size: `${f.size}`, url: '' })) || [],
//         });
//         messages.push(message);
//       }
//     } else if (recipientIds) {
//       // Send to specific parents
//       for (const parentId of recipientIds) {
//         const parent = await this.parentRepository.findOne({ where: { id: parentId } });
//         if (parent) {
//           const message = this.messageRepository.create({
//             teacherId,
//             parentId: parent.id,
//             parentName: parent.name,
//             studentName: parent.studentName,
//             studentClass: parent.studentClass,
//             studentId: parent.studentId,
//             content,
//             subject,
//             timestamp: new Date(),
//             direction: 'outgoing',
//             read: false,
//             attachments: attachments?.map(f => ({ name: f.originalname, size: `${f.size}`, url: '' })) || [],
//           });
//           messages.push(message);
//         }
//       }
//     }

//     return this.messageRepository.save(messages[0]);
//   }

//   async markAsRead(messageId: string): Promise<void> {
//     await this.messageRepository.update(messageId, { read: true });
//   }

//   async getStats(teacherId: string): Promise<any> {
//     const [unread, totalParents, messagesSent] = await Promise.all([
//       this.messageRepository.count({ where: { teacherId, direction: 'incoming', read: false } }),
//       this.parentRepository.count({ where: { teacherId } }),
//       this.messageRepository.count({ where: { teacherId, direction: 'outgoing' } }),
//     ]);

//     return { unread, totalParents, messagesSent };
//   }

//   async deleteMessage(messageId: string): Promise<void> {
//     const result = await this.messageRepository.delete(messageId);
//     if (result.affected === 0) throw new NotFoundException('Message not found');
//   }
// }