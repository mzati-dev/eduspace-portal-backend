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

  async create(data: any, userId: string, userRole: string, schoolId?: string): Promise<Reminder> {
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

  async findAll(schoolId?: string): Promise<Reminder[]> {
    const query = this.reminderRepository.createQueryBuilder('reminder');
    if (schoolId) {
      query.where('reminder.schoolId = :schoolId', { schoolId });
    }
    return query.orderBy('reminder.reminderDate', 'ASC').addOrderBy('reminder.createdAt', 'DESC').getMany();
  }

  async findOne(id: string, schoolId?: string): Promise<Reminder> {
    const query = this.reminderRepository.createQueryBuilder('reminder').where('reminder.id = :id', { id });
    if (schoolId) {
      query.andWhere('reminder.schoolId = :schoolId', { schoolId });
    }
    const reminder = await query.getOne();
    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }
    return reminder;
  }

  async remove(id: string, schoolId?: string): Promise<void> {
    const query = this.reminderRepository.createQueryBuilder('reminder').delete().where('id = :id', { id });
    if (schoolId) {
      query.andWhere('schoolId = :schoolId', { schoolId });
    }
    const result = await query.execute();
    if (result.affected === 0) {
      throw new NotFoundException('Reminder not found');
    }
  }
}