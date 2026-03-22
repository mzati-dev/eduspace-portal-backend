// src/modules/messaging/messaging.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { Message } from './entities/message.entity';
import { Event } from './entities/event.entity';
import { Broadcast } from './entities/broadcast.entity';

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(Broadcast)
    private broadcastRepository: Repository<Broadcast>,
  ) { }

  // ============ CONTACTS ============
  async getContacts(role?: string, classId?: string): Promise<Contact[]> {
    const where: any = { isActive: true };
    if (role) where.role = role;
    if (classId) where.classId = classId;
    return this.contactRepository.find({ where });
  }

  // ============ MESSAGES ============
  async getMessages(type?: string, status?: string): Promise<Message[]> {
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    return this.messageRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async getMessageDetails(messageId: string): Promise<Message> {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    return message;
  }

  async sendMessage(data: any, userId: string): Promise<Message> {
    const recipientCount = await this.getAudienceCount(data.audience, data.classId);

    const message = new Message();
    message.subject = data.subject;
    message.content = data.content;
    message.type = data.type;
    message.status = data.saveAsDraft ? 'draft' : data.scheduleFor ? 'scheduled' : 'sent';
    message.sentAt = !data.scheduleFor && !data.saveAsDraft ? new Date() : null;
    message.scheduledFor = data.scheduleFor ? new Date(data.scheduleFor) : null;
    message.createdBy = userId;
    message.recipients = {
      groups: data.audience,
      total: recipientCount,
      recipientIds: data.recipientIds || [],
    };
    message.stats = {
      delivered: 0,
      failed: 0,
      pending: recipientCount,
    };

    return await this.messageRepository.save(message);
  }

  async deleteMessage(messageId: string): Promise<void> {
    const result = await this.messageRepository.delete(messageId);
    if (result.affected === 0) throw new NotFoundException('Message not found');
  }

  async resendMessage(messageId: string): Promise<Message> {
    const message = await this.getMessageDetails(messageId);
    message.status = 'sent';
    message.sentAt = new Date();
    return await this.messageRepository.save(message);
  }

  // ============ EVENTS ============
  async getEvents(status?: string, fromDate?: string, toDate?: string): Promise<Event[]> {
    const where: any = {};
    if (status) where.status = status;
    if (fromDate && toDate) where.date = Between(fromDate, toDate);
    return this.eventRepository.find({ where, order: { date: 'ASC' } });
  }

  async createEvent(data: any, userId: string): Promise<Event> {
    const event = new Event();
    event.title = data.title;
    event.description = data.description;
    event.type = data.type;
    event.date = data.date;
    event.time = data.time;
    event.endDate = data.endDate;
    event.endTime = data.endTime;
    event.location = data.location;
    event.audience = data.audience;
    event.status = 'upcoming';
    event.reminders = {
      enabled: data.reminders?.enabled || false,
      daysBefore: data.reminders?.daysBefore || [1],
    };
    event.attachments = data.attachments;
    event.createdBy = userId;

    return await this.eventRepository.save(event);
  }

  async updateEvent(eventId: string, data: any): Promise<Event> {
    await this.eventRepository.update(eventId, data);
    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async deleteEvent(eventId: string): Promise<void> {
    const result = await this.eventRepository.delete(eventId);
    if (result.affected === 0) throw new NotFoundException('Event not found');
  }

  async sendEventReminders(eventId: string): Promise<void> {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    // Reminder logic here
  }

  // ============ BROADCASTS ============
  async getBroadcasts(status?: string): Promise<Broadcast[]> {
    const where: any = {};
    if (status) where.status = status;
    return this.broadcastRepository.find({ where, order: { sentAt: 'DESC' } });
  }

  async sendBroadcast(data: any, userId: string): Promise<Broadcast> {
    const broadcast = new Broadcast();
    broadcast.title = data.title;
    broadcast.message = data.message;
    broadcast.priority = data.priority;
    broadcast.channels = data.channels;
    broadcast.audience = data.audience;
    broadcast.sentAt = new Date();
    broadcast.status = 'active';
    broadcast.createdBy = userId;
    broadcast.stats = {
      delivered: 0,
      failed: 0,
      opened: 0,
    };

    return await this.broadcastRepository.save(broadcast);
  }

  // ============ STATS ============
  async getMessagingStats(): Promise<any> {
    const [totalContacts, messagesSent, upcomingEvents, activeBroadcasts, failedMessages] = await Promise.all([
      this.contactRepository.count({ where: { isActive: true } }),
      this.messageRepository.count({ where: { status: 'sent' } }),
      this.eventRepository.count({ where: { status: 'upcoming' } }),
      this.broadcastRepository.count({ where: { status: 'active' } }),
      this.messageRepository.count({ where: { status: 'failed' } }),
    ]);

    return {
      totalContacts,
      messagesSent,
      upcomingEvents,
      activeBroadcasts,
      pendingAlerts: failedMessages,
      deliveryRate: messagesSent > 0 ? 95 : 0,
      openRate: messagesSent > 0 ? 78 : 0,
    };
  }

  // ============ AUDIENCE COUNT ============
  async getAudienceCount(audience: string[], classId?: string): Promise<number> {
    if (!audience || audience.length === 0) return 0;

    let count = 0;
    for (const role of audience) {
      const where: any = { isActive: true };
      if (role !== 'all') where.role = role;
      if (classId && (role === 'students' || role === 'parents' || role === 'all')) {
        where.classId = classId;
      }
      count += await this.contactRepository.count({ where });
    }
    return count;
  }
}