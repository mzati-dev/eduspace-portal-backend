// src/modules/teacher-messages/teacher-messages.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherMessage } from './entities/teacher-message.entity';
import { TeacherParent } from './entities/teacher-parent.entity';

@Injectable()
export class TeacherMessagesService {
  constructor(
    @InjectRepository(TeacherMessage)
    private messageRepository: Repository<TeacherMessage>,
    @InjectRepository(TeacherParent)
    private parentRepository: Repository<TeacherParent>,
  ) { }

  async getParents(teacherId: string): Promise<TeacherParent[]> {
    return this.parentRepository.find({
      where: { teacherId },
      order: { name: 'ASC' }
    });
  }

  async getInbox(teacherId: string): Promise<TeacherMessage[]> {
    return this.messageRepository.find({
      where: { teacherId, direction: 'incoming' },
      order: { timestamp: 'DESC' }
    });
  }

  async getSentMessages(teacherId: string): Promise<TeacherMessage[]> {
    return this.messageRepository.find({
      where: { teacherId, direction: 'outgoing' },
      order: { timestamp: 'DESC' }
    });
  }

  async sendMessage(data: any): Promise<TeacherMessage> {
    const { teacherId, recipientIds, classId, subject, content, attachments } = data;

    const messages: TeacherMessage[] = [];

    if (classId) {
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
          content,
          subject,
          timestamp: new Date(),
          direction: 'outgoing',
          read: false,
          attachments: attachments?.map(f => ({ name: f.originalname, size: `${f.size}`, url: '' })) || [],
        });
        messages.push(message);
      }
    } else if (recipientIds) {
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
            attachments: attachments?.map(f => ({ name: f.originalname, size: `${f.size}`, url: '' })) || [],
          });
          messages.push(message);
        }
      }
    }

    return this.messageRepository.save(messages[0]);
  }

  async markAsRead(messageId: string): Promise<void> {
    await this.messageRepository.update(messageId, { read: true });
  }

  async getStats(teacherId: string): Promise<any> {
    const [unread, totalParents, messagesSent] = await Promise.all([
      this.messageRepository.count({ where: { teacherId, direction: 'incoming', read: false } }),
      this.parentRepository.count({ where: { teacherId } }),
      this.messageRepository.count({ where: { teacherId, direction: 'outgoing' } }),
    ]);

    return { unread, totalParents, messagesSent };
  }

  async deleteMessage(messageId: string): Promise<void> {
    const result = await this.messageRepository.delete(messageId);
    if (result.affected === 0) throw new NotFoundException('Message not found');
  }
}