// src/modules/reminders/reminders.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reminder } from './entities/reminder.entity';

@Injectable()
export class RemindersService {
  constructor(
    @InjectRepository(Reminder)
    private reminderRepository: Repository<Reminder>,
  ) { }

  async create(data: any, userId: string, userRole: string, schoolId: string): Promise<Reminder> {
    const reminder = this.reminderRepository.create({
      message: data.message,
      type: data.type,
      audience: data.audience,
      reminderDate: new Date(data.reminder_date),
      schoolId: schoolId,
      createdBy: userId,
      createdByRole: userRole,
    });
    return await this.reminderRepository.save(reminder);
  }

  async findAll(schoolId: string): Promise<Reminder[]> {
    return await this.reminderRepository.find({
      where: { schoolId },
      order: { reminderDate: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string, schoolId: string): Promise<Reminder> {
    const reminder = await this.reminderRepository.findOne({
      where: { id, schoolId }
    });
    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }
    return reminder;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    const result = await this.reminderRepository.delete({ id, schoolId });
    if (result.affected === 0) {
      throw new NotFoundException('Reminder not found');
    }
  }
}