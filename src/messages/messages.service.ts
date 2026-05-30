// src/modules/messages/messages.service.ts

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { Conversation } from './entities/conversation.entity';
import * as nodemailer from 'nodemailer';
import { Student } from '../students/entities/student.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { School } from '../schools/entities/school.entity';

@Injectable()
export class MessagesService {
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Teacher)
    private teacherRepository: Repository<Teacher>,
    @InjectRepository(School)
    private schoolRepository: Repository<School>,
  ) {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      this.emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    } else {
      this.emailTransporter = null;
    }
  }

  private canMessage(senderRole: string, recipientRole: string): boolean {
    const allowed: Record<string, string[]> = {
      admin: ['teacher', 'parent'],
      school_admin: ['teacher', 'parent'],
      teacher: ['admin', 'parent', 'school_admin'],
      parent: ['teacher', 'admin', 'school_admin'],
    };
    return allowed[senderRole]?.includes(recipientRole) || false;
  }

  private async getRecipientContact(recipientId: string, recipientRole: string): Promise<{ phone: string | null; email: string | null; name: string }> {
    if (recipientRole === 'parent') {
      const student = await this.studentRepository.findOne({
        where: { id: recipientId },
        select: ['parentPhone', 'parentEmail', 'name']
      });
      return {
        phone: student?.parentPhone || null,
        email: student?.parentEmail || null,
        name: student?.name || 'Parent'
      };
    }
    if (recipientRole === 'teacher') {
      const teacher = await this.teacherRepository.findOne({
        where: { id: recipientId },
        select: ['phone', 'email', 'name']
      });
      return {
        phone: teacher?.phone || null,
        email: teacher?.email || null,
        name: teacher?.name || 'Teacher'
      };
    }
    return { phone: null, email: null, name: 'Recipient' };
  }

  private async sendEmailNotification(
    to: string,
    subject: string,
    content: string,
    senderName: string,
    senderRole: string,
    fromEmail: string,
    fromName: string
  ): Promise<void> {
    if (!this.emailTransporter) {
      console.log('Email not configured. Skipping email send.');
      return;
    }
    try {
      await this.emailTransporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: to,
        subject: subject || `New message from ${senderName}`,
        text: content,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">New Message from ${senderName} (${senderRole})</h2>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
              ${subject ? `<p style="font-weight: bold; margin-bottom: 10px;">Subject: ${subject}</p>` : ''}
              <p style="margin: 0; white-space: pre-wrap;">${content.replace(/\n/g, '<br>')}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              Reply to this message by logging into the EduSpace portal.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">
              This is an automated notification from EduSpace.
            </p>
          </div>
        `,
      });
      console.log(`Email sent to ${to}`);
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }

  async getWhatsAppLink(recipientId: string, recipientRole: string, message: string): Promise<{ link: string | null; phone: string | null }> {
    const recipient = await this.getRecipientContact(recipientId, recipientRole);
    if (!recipient.phone) {
      return { link: null, phone: null };
    }
    let cleanPhone = recipient.phone.replace(/\D/g, '');
    if (cleanPhone.length === 9) {
      cleanPhone = '265' + cleanPhone;
    }
    const link = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    return { link, phone: recipient.phone };
  }

  async sendMessage(data: any, senderId: string, senderRole: string, schoolId?: string): Promise<Message> {
    if (!this.canMessage(senderRole, data.recipientRole)) {
      throw new ForbiddenException(`${senderRole} cannot message ${data.recipientRole}`);
    }

    const message = this.messageRepository.create({
      senderId: senderId,
      senderRole: senderRole,
      recipientId: data.recipientId,
      recipientRole: data.recipientRole,
      subject: data.subject || null,
      content: data.content,
      type: data.type || 'sms',
      schoolId: schoolId,
    });

    const savedMessage = await this.messageRepository.save(message);

    let conversation = await this.conversationRepository.findOne({
      where: [
        { participantOneId: senderId, participantTwoId: data.recipientId, schoolId: schoolId },
        { participantOneId: data.recipientId, participantTwoId: senderId, schoolId: schoolId },
      ],
    });

    if (!conversation) {
      conversation = this.conversationRepository.create({
        participantOneId: senderId,
        participantOneRole: senderRole,
        participantTwoId: data.recipientId,
        participantTwoRole: data.recipientRole,
        schoolId: schoolId,
        unreadCountP1: 0,
        unreadCountP2: 0,
      });
    }

    conversation.lastMessage = data.content;
    conversation.lastMessageAt = new Date();

    if (conversation.participantOneId === data.recipientId) {
      conversation.unreadCountP1 = (conversation.unreadCountP1 || 0) + 1;
    } else {
      conversation.unreadCountP2 = (conversation.unreadCountP2 || 0) + 1;
    }

    await this.conversationRepository.save(conversation);

    // Send email notification using school's email
    if (data.type === 'email' || data.type === 'both') {
      const recipient = await this.getRecipientContact(data.recipientId, data.recipientRole);
      if (recipient.email && schoolId) {
        const school = await this.schoolRepository.findOne({
          where: { id: schoolId },
          select: ['email', 'name']
        });

        const senderName = senderRole === 'teacher' ? 'Teacher' : senderRole === 'admin' ? 'Admin' : 'School';
        const fromEmail = school?.email || process.env.FALLBACK_EMAIL || process.env.EMAIL_USER || '';
        const fromName = school?.name || 'EduSpace';

        await this.sendEmailNotification(
          recipient.email,
          data.subject || 'New Message',
          data.content,
          senderName,
          senderRole,
          fromEmail,
          fromName
        );
      }
    }

    return savedMessage;
  }

  async getConversations(userId: string, userRole: string, schoolId?: string): Promise<any[]> {
    const query = this.conversationRepository.createQueryBuilder('conversation')
      .where('conversation.participantOneId = :userId', { userId })
      .orWhere('conversation.participantTwoId = :userId', { userId })
      .orderBy('conversation.lastMessageAt', 'DESC');

    if (schoolId) {
      query.andWhere('conversation.schoolId = :schoolId', { schoolId });
    }

    const conversations = await query.getMany();

    return conversations.map(conv => {
      const isParticipantOne = conv.participantOneId === userId;
      return {
        id: conv.id,
        recipientId: isParticipantOne ? conv.participantTwoId : conv.participantOneId,
        recipientRole: isParticipantOne ? conv.participantTwoRole : conv.participantOneRole,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: isParticipantOne ? conv.unreadCountP1 : conv.unreadCountP2,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      };
    });
  }

  async getConversationMessages(conversationId: string, userId: string, schoolId?: string): Promise<Message[]> {
    const query = this.conversationRepository.createQueryBuilder('conversation')
      .where('conversation.id = :conversationId', { conversationId });

    if (schoolId) {
      query.andWhere('conversation.schoolId = :schoolId', { schoolId });
    }

    const conversation = await query.getOne();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.participantOneId !== userId && conversation.participantTwoId !== userId) {
      throw new NotFoundException('Conversation not found');
    }

    const updateQuery = this.messageRepository.createQueryBuilder()
      .update(Message)
      .set({ read: true, readAt: new Date() })
      .where('recipientId = :userId', { userId })
      .andWhere('read = false');

    if (schoolId) {
      updateQuery.andWhere('schoolId = :schoolId', { schoolId });
    }

    await updateQuery.execute();

    if (conversation.participantOneId === userId) {
      conversation.unreadCountP1 = 0;
    } else {
      conversation.unreadCountP2 = 0;
    }
    await this.conversationRepository.save(conversation);

    const messagesQuery = this.messageRepository.createQueryBuilder('message')
      .where(
        '(message.senderId = :participantOneId AND message.recipientId = :participantTwoId) OR (message.senderId = :participantTwoId AND message.recipientId = :participantOneId)',
        {
          participantOneId: conversation.participantOneId,
          participantTwoId: conversation.participantTwoId,
        }
      )
      .orderBy('message.createdAt', 'ASC');

    if (schoolId) {
      messagesQuery.andWhere('message.schoolId = :schoolId', { schoolId });
    }

    return await messagesQuery.getMany();
  }

  async getUnreadCount(userId: string, schoolId?: string): Promise<number> {
    const query = this.messageRepository.createQueryBuilder('message')
      .where('message.recipientId = :userId', { userId })
      .andWhere('message.read = false');

    if (schoolId) {
      query.andWhere('message.schoolId = :schoolId', { schoolId });
    }

    return await query.getCount();
  }

  async deleteMessage(messageId: string, userId: string, schoolId?: string): Promise<void> {
    const query = this.messageRepository.createQueryBuilder('message')
      .where('message.id = :messageId', { messageId });

    if (schoolId) {
      query.andWhere('message.schoolId = :schoolId', { schoolId });
    }

    const message = await query.getOne();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId && message.recipientId !== userId) {
      throw new NotFoundException('Message not found');
    }

    const deleteQuery = this.messageRepository.createQueryBuilder()
      .delete()
      .where('id = :messageId', { messageId });

    if (schoolId) {
      deleteQuery.andWhere('schoolId = :schoolId', { schoolId });
    }

    await deleteQuery.execute();
  }
}

// // src/modules/messages/messages.service.ts

// import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { Message } from './entities/message.entity';
// import { Conversation } from './entities/conversation.entity';

// @Injectable()
// export class MessagesService {
//   constructor(
//     @InjectRepository(Message)
//     private messageRepository: Repository<Message>,
//     @InjectRepository(Conversation)
//     private conversationRepository: Repository<Conversation>,
//   ) { }

//   // Role validation: who can message whom
//   private canMessage(senderRole: string, recipientRole: string): boolean {
//     const allowed: Record<string, string[]> = {
//       admin: ['teacher', 'parent'],
//       school_admin: ['teacher', 'parent'],
//       teacher: ['admin', 'parent', 'school_admin'],
//       parent: ['teacher', 'admin', 'school_admin'],
//     };

//     return allowed[senderRole]?.includes(recipientRole) || false;
//   }
//   // private canMessage(senderRole: string, recipientRole: string): boolean {
//   //   const allowed: Record<string, string[]> = {
//   //     admin: ['teacher', 'parent'],
//   //     teacher: ['admin', 'parent'],
//   //     parent: ['teacher', 'admin'],
//   //   };

//   //   return allowed[senderRole]?.includes(recipientRole) || false;
//   // }

//   async sendMessage(data: any, senderId: string, senderRole: string, schoolId?: string): Promise<Message> {
//     // Validate role permission
//     if (!this.canMessage(senderRole, data.recipientRole)) {
//       throw new ForbiddenException(`${senderRole} cannot message ${data.recipientRole}`);
//     }

//     // Create the message
//     const message = this.messageRepository.create({
//       senderId: senderId,
//       senderRole: senderRole,
//       recipientId: data.recipientId,
//       recipientRole: data.recipientRole,
//       subject: data.subject || null,
//       content: data.content,
//       type: data.type || 'sms',
//       schoolId: schoolId,
//     });

//     const savedMessage = await this.messageRepository.save(message);

//     // Update or create conversation
//     let conversation = await this.conversationRepository.findOne({
//       where: [
//         {
//           participantOneId: senderId,
//           participantTwoId: data.recipientId,
//           schoolId: schoolId,
//         },
//         {
//           participantOneId: data.recipientId,
//           participantTwoId: senderId,
//           schoolId: schoolId,
//         },
//       ],
//     });

//     if (!conversation) {
//       conversation = this.conversationRepository.create({
//         participantOneId: senderId,
//         participantOneRole: senderRole,
//         participantTwoId: data.recipientId,
//         participantTwoRole: data.recipientRole,
//         schoolId: schoolId,
//         unreadCountP1: 0,
//         unreadCountP2: 0,
//       });
//     }

//     conversation.lastMessage = data.content;
//     conversation.lastMessageAt = new Date();

//     // Increment unread count for recipient
//     // Increment unread count for recipient
//     if (conversation.participantOneId === data.recipientId) {
//       conversation.unreadCountP1 = (conversation.unreadCountP1 || 0) + 1;
//     } else {
//       conversation.unreadCountP2 = (conversation.unreadCountP2 || 0) + 1;
//     }

//     await this.conversationRepository.save(conversation);

//     return savedMessage;
//   }

//   async getConversations(userId: string, userRole: string, schoolId?: string): Promise<any[]> {
//     const query = this.conversationRepository.createQueryBuilder('conversation')
//       .where('conversation.participantOneId = :userId', { userId })
//       .orWhere('conversation.participantTwoId = :userId', { userId })
//       .orderBy('conversation.lastMessageAt', 'DESC');

//     if (schoolId) {
//       query.andWhere('conversation.schoolId = :schoolId', { schoolId });
//     }

//     const conversations = await query.getMany();

//     // Return conversations with recipient info
//     return conversations.map(conv => {
//       const isParticipantOne = conv.participantOneId === userId;
//       return {
//         id: conv.id,
//         recipientId: isParticipantOne ? conv.participantTwoId : conv.participantOneId,
//         recipientRole: isParticipantOne ? conv.participantTwoRole : conv.participantOneRole,
//         lastMessage: conv.lastMessage,
//         lastMessageAt: conv.lastMessageAt,
//         unreadCount: isParticipantOne ? conv.unreadCountP1 : conv.unreadCountP2,
//         createdAt: conv.createdAt,
//         updatedAt: conv.updatedAt,
//       };
//     });
//   }

//   async getConversationMessages(conversationId: string, userId: string, schoolId?: string): Promise<Message[]> {
//     const query = this.conversationRepository.createQueryBuilder('conversation')
//       .where('conversation.id = :conversationId', { conversationId });

//     if (schoolId) {
//       query.andWhere('conversation.schoolId = :schoolId', { schoolId });
//     }

//     const conversation = await query.getOne();

//     if (!conversation) {
//       throw new NotFoundException('Conversation not found');
//     }

//     // Verify user is part of this conversation
//     if (conversation.participantOneId !== userId && conversation.participantTwoId !== userId) {
//       throw new NotFoundException('Conversation not found');
//     }

//     // Mark messages as read for this user
//     const updateQuery = this.messageRepository.createQueryBuilder()
//       .update(Message)
//       .set({ read: true, readAt: new Date() })
//       .where('recipientId = :userId', { userId })
//       .andWhere('read = false');

//     if (schoolId) {
//       updateQuery.andWhere('schoolId = :schoolId', { schoolId });
//     }

//     await updateQuery.execute();

//     // Reset unread count for this user
//     if (conversation.participantOneId === userId) {
//       conversation.unreadCountP1 = 0;
//     } else {
//       conversation.unreadCountP2 = 0;
//     }
//     await this.conversationRepository.save(conversation);

//     // Get all messages between the two participants
//     const messagesQuery = this.messageRepository.createQueryBuilder('message')
//       .where(
//         '(message.senderId = :participantOneId AND message.recipientId = :participantTwoId) OR (message.senderId = :participantTwoId AND message.recipientId = :participantOneId)',
//         {
//           participantOneId: conversation.participantOneId,
//           participantTwoId: conversation.participantTwoId,
//         }
//       )
//       .orderBy('message.createdAt', 'ASC');

//     if (schoolId) {
//       messagesQuery.andWhere('message.schoolId = :schoolId', { schoolId });
//     }

//     return await messagesQuery.getMany();
//   }

//   async getUnreadCount(userId: string, schoolId?: string): Promise<number> {
//     const query = this.messageRepository.createQueryBuilder('message')
//       .where('message.recipientId = :userId', { userId })
//       .andWhere('message.read = false');

//     if (schoolId) {
//       query.andWhere('message.schoolId = :schoolId', { schoolId });
//     }

//     return await query.getCount();
//   }

//   async deleteMessage(messageId: string, userId: string, schoolId?: string): Promise<void> {
//     const query = this.messageRepository.createQueryBuilder('message')
//       .where('message.id = :messageId', { messageId });

//     if (schoolId) {
//       query.andWhere('message.schoolId = :schoolId', { schoolId });
//     }

//     const message = await query.getOne();

//     if (!message) {
//       throw new NotFoundException('Message not found');
//     }

//     // Only sender or recipient can delete
//     if (message.senderId !== userId && message.recipientId !== userId) {
//       throw new NotFoundException('Message not found');
//     }

//     const deleteQuery = this.messageRepository.createQueryBuilder()
//       .delete()
//       .where('id = :messageId', { messageId });

//     if (schoolId) {
//       deleteQuery.andWhere('schoolId = :schoolId', { schoolId });
//     }

//     await deleteQuery.execute();
//   }
// }