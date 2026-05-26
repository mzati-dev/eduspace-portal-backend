// src/modules/messages/messages.service.ts

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { Conversation } from './entities/conversation.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
  ) { }

  // Role validation: who can message whom
  private canMessage(senderRole: string, recipientRole: string): boolean {
    const allowed: Record<string, string[]> = {
      admin: ['teacher', 'parent'],
      teacher: ['admin', 'parent'],
      parent: ['teacher', 'admin'],
    };

    return allowed[senderRole]?.includes(recipientRole) || false;
  }

  async sendMessage(data: any, senderId: string, senderRole: string, schoolId: string): Promise<Message> {
    // Validate role permission
    if (!this.canMessage(senderRole, data.recipientRole)) {
      throw new ForbiddenException(`${senderRole} cannot message ${data.recipientRole}`);
    }

    // Create the message
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

    // Update or create conversation
    let conversation = await this.conversationRepository.findOne({
      where: [
        {
          participantOneId: senderId,
          participantTwoId: data.recipientId,
          schoolId: schoolId,
        },
        {
          participantOneId: data.recipientId,
          participantTwoId: senderId,
          schoolId: schoolId,
        },
      ],
    });

    if (!conversation) {
      conversation = this.conversationRepository.create({
        participantOneId: senderId,
        participantOneRole: senderRole,
        participantTwoId: data.recipientId,
        participantTwoRole: data.recipientRole,
        schoolId: schoolId,
      });
    }

    conversation.lastMessage = data.content;
    conversation.lastMessageAt = new Date();

    // Increment unread count for recipient
    if (conversation.participantOneId === data.recipientId) {
      conversation.unreadCountP1 += 1;
    } else {
      conversation.unreadCountP2 += 1;
    }

    await this.conversationRepository.save(conversation);

    return savedMessage;
  }

  async getConversations(userId: string, userRole: string, schoolId: string): Promise<any[]> {
    const conversations = await this.conversationRepository.find({
      where: [
        { participantOneId: userId, schoolId: schoolId },
        { participantTwoId: userId, schoolId: schoolId },
      ],
      order: { lastMessageAt: 'DESC' },
    });

    // Return conversations with recipient info
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

  async getConversationMessages(conversationId: string, userId: string, schoolId: string): Promise<Message[]> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, schoolId: schoolId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Verify user is part of this conversation
    if (conversation.participantOneId !== userId && conversation.participantTwoId !== userId) {
      throw new NotFoundException('Conversation not found');
    }

    // Mark messages as read for this user
    await this.messageRepository.update(
      {
        recipientId: userId,
        read: false,
        schoolId: schoolId,
      },
      { read: true, readAt: new Date() }
    );

    // Reset unread count for this user
    if (conversation.participantOneId === userId) {
      conversation.unreadCountP1 = 0;
    } else {
      conversation.unreadCountP2 = 0;
    }
    await this.conversationRepository.save(conversation);

    // Get all messages between the two participants
    return await this.messageRepository.find({
      where: [
        {
          senderId: conversation.participantOneId,
          recipientId: conversation.participantTwoId,
          schoolId: schoolId,
        },
        {
          senderId: conversation.participantTwoId,
          recipientId: conversation.participantOneId,
          schoolId: schoolId,
        },
      ],
      order: { createdAt: 'ASC' },
    });
  }

  async getUnreadCount(userId: string, schoolId: string): Promise<number> {
    return await this.messageRepository.count({
      where: {
        recipientId: userId,
        read: false,
        schoolId: schoolId,
      },
    });
  }

  async deleteMessage(messageId: string, userId: string, schoolId: string): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId, schoolId: schoolId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Only sender or recipient can delete
    if (message.senderId !== userId && message.recipientId !== userId) {
      throw new NotFoundException('Message not found');
    }

    await this.messageRepository.delete({ id: messageId, schoolId: schoolId });
  }
}

// // src/modules/messages/messages.service.ts

// import { Injectable, NotFoundException } from '@nestjs/common';
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

//   async sendMessage(data: any, senderId: string, senderRole: string, schoolId: string): Promise<Message> {
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
//       });
//     }

//     conversation.lastMessage = data.content;
//     conversation.lastMessageAt = new Date();

//     // Increment unread count for recipient
//     if (conversation.participantOneId === data.recipientId) {
//       conversation.unreadCountP1 += 1;
//     } else {
//       conversation.unreadCountP2 += 1;
//     }

//     await this.conversationRepository.save(conversation);

//     return savedMessage;
//   }

//   async getConversations(userId: string, schoolId: string): Promise<Conversation[]> {
//     return await this.conversationRepository.find({
//       where: [
//         { participantOneId: userId, schoolId: schoolId },
//         { participantTwoId: userId, schoolId: schoolId },
//       ],
//       order: { lastMessageAt: 'DESC' },
//     });
//   }

//   async getConversationMessages(conversationId: string, userId: string, schoolId: string): Promise<Message[]> {
//     const conversation = await this.conversationRepository.findOne({
//       where: { id: conversationId, schoolId: schoolId },
//     });

//     if (!conversation) {
//       throw new NotFoundException('Conversation not found');
//     }

//     // Mark messages as read
//     await this.messageRepository.update(
//       {
//         recipientId: userId,
//         read: false,
//         schoolId: schoolId,
//       },
//       { read: true, readAt: new Date() }
//     );

//     // Reset unread count for this user
//     if (conversation.participantOneId === userId) {
//       conversation.unreadCountP1 = 0;
//     } else {
//       conversation.unreadCountP2 = 0;
//     }
//     await this.conversationRepository.save(conversation);

//     // Get all messages between the two participants
//     return await this.messageRepository.find({
//       where: [
//         {
//           senderId: conversation.participantOneId,
//           recipientId: conversation.participantTwoId,
//           schoolId: schoolId,
//         },
//         {
//           senderId: conversation.participantTwoId,
//           recipientId: conversation.participantOneId,
//           schoolId: schoolId,
//         },
//       ],
//       order: { createdAt: 'ASC' },
//     });
//   }

//   async getUnreadCount(userId: string, schoolId: string): Promise<number> {
//     return await this.messageRepository.count({
//       where: {
//         recipientId: userId,
//         read: false,
//         schoolId: schoolId,
//       },
//     });
//   }

//   async deleteMessage(messageId: string, userId: string, schoolId: string): Promise<void> {
//     const message = await this.messageRepository.findOne({
//       where: { id: messageId, schoolId: schoolId },
//     });

//     if (!message) {
//       throw new NotFoundException('Message not found');
//     }

//     // Only sender or recipient can delete
//     if (message.senderId !== userId && message.recipientId !== userId) {
//       throw new NotFoundException('Message not found');
//     }

//     await this.messageRepository.delete({ id: messageId, schoolId: schoolId });
//   }
// }