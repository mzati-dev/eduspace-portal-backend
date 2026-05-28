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
      school_admin: ['teacher', 'parent'],
      teacher: ['admin', 'parent', 'school_admin'],
      parent: ['teacher', 'admin', 'school_admin'],
    };

    return allowed[senderRole]?.includes(recipientRole) || false;
  }
  // private canMessage(senderRole: string, recipientRole: string): boolean {
  //   const allowed: Record<string, string[]> = {
  //     admin: ['teacher', 'parent'],
  //     teacher: ['admin', 'parent'],
  //     parent: ['teacher', 'admin'],
  //   };

  //   return allowed[senderRole]?.includes(recipientRole) || false;
  // }

  async sendMessage(data: any, senderId: string, senderRole: string, schoolId?: string): Promise<Message> {
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
        unreadCountP1: 0,
        unreadCountP2: 0,
      });
    }

    conversation.lastMessage = data.content;
    conversation.lastMessageAt = new Date();

    // Increment unread count for recipient
    // Increment unread count for recipient
    if (conversation.participantOneId === data.recipientId) {
      conversation.unreadCountP1 = (conversation.unreadCountP1 || 0) + 1;
    } else {
      conversation.unreadCountP2 = (conversation.unreadCountP2 || 0) + 1;
    }

    await this.conversationRepository.save(conversation);

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

    // Verify user is part of this conversation
    if (conversation.participantOneId !== userId && conversation.participantTwoId !== userId) {
      throw new NotFoundException('Conversation not found');
    }

    // Mark messages as read for this user
    const updateQuery = this.messageRepository.createQueryBuilder()
      .update(Message)
      .set({ read: true, readAt: new Date() })
      .where('recipientId = :userId', { userId })
      .andWhere('read = false');

    if (schoolId) {
      updateQuery.andWhere('schoolId = :schoolId', { schoolId });
    }

    await updateQuery.execute();

    // Reset unread count for this user
    if (conversation.participantOneId === userId) {
      conversation.unreadCountP1 = 0;
    } else {
      conversation.unreadCountP2 = 0;
    }
    await this.conversationRepository.save(conversation);

    // Get all messages between the two participants
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

    // Only sender or recipient can delete
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