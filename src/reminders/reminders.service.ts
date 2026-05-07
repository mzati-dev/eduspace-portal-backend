import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Reminder } from './entities/reminder.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RemindersService {
  constructor(
    @InjectRepository(Reminder)
    private reminderRepository: Repository<Reminder>,
  ) { }

  async findAll(schoolId?: string) {
    const query = this.reminderRepository
      .createQueryBuilder('reminder')
      .where('reminder.is_active = true')
      .orderBy('reminder.reminder_date', 'ASC');

    if (schoolId) {
      query.andWhere('reminder.schoolId = :schoolId', { schoolId });
    }

    return query.getMany();
  }

  async create(data: any, schoolId?: string) {
    const reminder = this.reminderRepository.create({
      message: data.message,
      type: data.type,
      reminder_date: data.reminder_date,
      is_active: true,
      schoolId: schoolId,
    });
    return this.reminderRepository.save(reminder);
  }

  async update(id: string, updates: any, schoolId?: string) {
    const reminder = await this.reminderRepository.findOne({
      where: { id, schoolId: schoolId }
    });
    if (!reminder) throw new NotFoundException('Reminder not found');

    if (updates.message) reminder.message = updates.message;
    if (updates.type) reminder.type = updates.type;
    if (updates.reminder_date) reminder.reminder_date = updates.reminder_date;
    if (updates.is_active !== undefined) reminder.is_active = updates.is_active;

    return this.reminderRepository.save(reminder);
  }

  async delete(id: string, schoolId?: string) {
    const reminder = await this.reminderRepository.findOne({
      where: { id, schoolId: schoolId }
    });
    if (!reminder) throw new NotFoundException('Reminder not found');
    return this.reminderRepository.remove(reminder);
  }
}