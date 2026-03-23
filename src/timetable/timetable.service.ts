// src/modules/timetable/timetable.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { TimeSlot } from './entities/time-slot.entity';
import { TimetableEntry } from './entities/timetable-entry.entity';
import { TimetableTemplate } from './entities/timetable-template.entity';
import { Student } from '../students/entities/student.entity';
import { Class } from '../students/entities/class.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Subject } from '../students/entities/subject.entity';

@Injectable()
export class TimetableService {
    constructor(
        @InjectRepository(TimeSlot)
        private timeSlotRepository: Repository<TimeSlot>,
        @InjectRepository(TimetableEntry)
        private entryRepository: Repository<TimetableEntry>,
        @InjectRepository(TimetableTemplate)
        private templateRepository: Repository<TimetableTemplate>,
        @InjectRepository(Student)
        private studentRepository: Repository<Student>,
        @InjectRepository(Class)
        private classRepository: Repository<Class>,
        @InjectRepository(Teacher)
        private teacherRepository: Repository<Teacher>,
        @InjectRepository(Subject)
        private subjectRepository: Repository<Subject>,
    ) { }

    // ============ TIME SLOTS ============
    async getTimeSlots(): Promise<TimeSlot[]> {
        return this.timeSlotRepository.find({ order: { period: 'ASC' } });
    }

    // ============ TIMETABLE ENTRIES ============
    async getTimetableEntries(schoolId: string, filters: any): Promise<TimetableEntry[]> {
        const where: any = {};

        // Get all classes in this school
        const classes = await this.classRepository.find({
            where: { schoolId: schoolId }
        });
        const classIds = classes.map(c => c.id);

        if (classIds.length > 0) {
            where.classId = In(classIds);
        }

        if (filters.classId) {
            where.classId = filters.classId;
        }
        if (filters.term) {
            where.term = filters.term;
        }
        if (filters.weekStart) {
            where.weekStart = filters.weekStart;
        }
        if (filters.teacherId) {
            where.teacherId = filters.teacherId;
        }

        return this.entryRepository.find({
            where,
            order: { day: 'ASC', period: 'ASC' }
        });
    }

    async createTimetableEntry(schoolId: string, data: any): Promise<TimetableEntry> {
        // Verify class belongs to this school
        const classEntity = await this.classRepository.findOne({
            where: { id: data.classId, schoolId: schoolId }
        });
        if (!classEntity) {
            throw new BadRequestException('Class not found in your school');
        }

        // Verify teacher exists
        const teacher = await this.teacherRepository.findOne({
            where: { id: data.teacherId }
        });
        if (!teacher) {
            throw new BadRequestException('Teacher not found');
        }

        // Verify subject exists
        const subject = await this.subjectRepository.findOne({
            where: { id: data.subjectId }
        });
        if (!subject) {
            throw new BadRequestException('Subject not found');
        }

        // Check for conflicts
        const conflict = await this.checkSingleConflict(data);
        if (conflict) {
            throw new BadRequestException(`Conflict detected: ${conflict.message}`);
        }

        // Fix: Explicitly type the data to prevent TypeORM from returning an array
        const entryData: Partial<TimetableEntry> = {
            ...data,
            academicYear: classEntity.academic_year,
            term: data.term || classEntity.term,
            isPublished: false,
        };

        const entry = this.entryRepository.create(entryData);

        return this.entryRepository.save(entry);
    }

    async updateTimetableEntry(schoolId: string, id: string, data: any): Promise<TimetableEntry> {
        const entry = await this.entryRepository.findOne({ where: { id } });
        if (!entry) {
            throw new NotFoundException('Timetable entry not found');
        }

        // Verify class belongs to this school if classId is being changed
        if (data.classId && data.classId !== entry.classId) {
            const classEntity = await this.classRepository.findOne({
                where: { id: data.classId, schoolId: schoolId }
            });
            if (!classEntity) {
                throw new BadRequestException('Class not found in your school');
            }
        }

        // Check for conflicts with updated data
        const updatedData = { ...entry, ...data };
        const conflict = await this.checkSingleConflict(updatedData);
        if (conflict) {
            throw new BadRequestException(`Conflict detected: ${conflict.message}`);
        }

        Object.assign(entry, data);
        return this.entryRepository.save(entry);
    }

    async deleteTimetableEntry(schoolId: string, id: string): Promise<void> {
        const entry = await this.entryRepository.findOne({ where: { id } });
        if (!entry) {
            throw new NotFoundException('Timetable entry not found');
        }

        await this.entryRepository.delete(id);
    }

    async bulkCreateEntries(schoolId: string, entries: any[]): Promise<TimetableEntry[]> {
        const savedEntries: TimetableEntry[] = [];

        for (const entryData of entries) {
            try {
                const saved = await this.createTimetableEntry(schoolId, entryData);
                savedEntries.push(saved);
            } catch (error) {
                console.error(`Failed to create entry: ${error.message}`);
            }
        }

        return savedEntries;
    }

    // ============ COPY WEEK ============
    async copyTimetableWeek(schoolId: string, sourceWeek: string, targetWeek: string, classId?: string): Promise<{ copied: number }> {
        const where: any = { weekStart: sourceWeek };
        if (classId) {
            where.classId = classId;
        } else {
            const classes = await this.classRepository.find({ where: { schoolId: schoolId } });
            where.classId = In(classes.map(c => c.id));
        }

        const sourceEntries = await this.entryRepository.find({ where });

        const newEntries = sourceEntries.map(entry => ({
            ...entry,
            id: undefined,
            weekStart: targetWeek,
            isPublished: false,
            createdAt: undefined,
            updatedAt: undefined,
        }));

        for (const entry of newEntries) {
            await this.entryRepository.save(entry);
        }

        return { copied: newEntries.length };
    }

    // ============ PUBLISH ============
    async publishTimetable(schoolId: string, classId: string, term: string, weekStart?: string): Promise<void> {
        const where: any = { classId, term };
        if (weekStart) {
            where.weekStart = weekStart;
        }

        await this.entryRepository.update(where, { isPublished: true });
    }

    // ============ STATS ============
    async getTimetableStats(schoolId: string, filters: any): Promise<any> {
        const where: any = {};

        const classes = await this.classRepository.find({ where: { schoolId: schoolId } });
        const classIds = classes.map(c => c.id);

        if (classIds.length > 0) {
            where.classId = In(classIds);
        }

        if (filters.classId) {
            where.classId = filters.classId;
        }
        if (filters.term) {
            where.term = filters.term;
        }
        if (filters.weekStart) {
            where.weekStart = filters.weekStart;
        }

        const entries = await this.entryRepository.find({ where });

        const uniqueTeachers = [...new Set(entries.map(e => e.teacherId))];
        const uniqueRooms = [...new Set(entries.map(e => e.room))];

        const conflicts = await this.checkConflicts(schoolId, filters);

        return {
            totalEntries: entries.length,
            totalClasses: filters.classId ? 1 : classes.length,
            totalTeachers: uniqueTeachers.length,
            totalRooms: uniqueRooms.length,
            conflicts: conflicts.length,
        };
    }

    // ============ CONFLICTS ============
    // ============ CONFLICTS ============
    async checkConflicts(schoolId: string, filters: any): Promise<any[]> {
        const entries = await this.getTimetableEntries(schoolId, filters);
        const conflicts: any[] = [];

        // Check teacher conflicts only (same teacher at same time)
        const teacherSchedule = new Map<string, TimetableEntry>();

        for (const entry of entries) {
            const key = `${entry.teacherId}-${entry.day}-${entry.period}`;
            if (teacherSchedule.has(key)) {
                conflicts.push({
                    type: 'teacher',
                    teacherId: entry.teacherId,
                    day: entry.day,
                    period: entry.period,
                    existingEntry: teacherSchedule.get(key),
                    conflictingEntry: entry,
                    message: `Teacher is scheduled in multiple classes at the same time`,
                });
            } else {
                teacherSchedule.set(key, entry);
            }
        }

        return conflicts;
    }

    private async checkSingleConflict(entry: any): Promise<any> {
        const existingEntries = await this.entryRepository.find({
            where: {
                day: entry.day,
                period: entry.period,
                weekStart: entry.weekStart,
            }
        });

        for (const existing of existingEntries) {
            if (existing.id === entry.id) continue;

            if (existing.teacherId === entry.teacherId) {
                return {
                    message: `Teacher already has a class at this time`,
                };
            }
        }

        return null;
    }

    // ============ EXPORT/IMPORT ============
    async exportTimetable(schoolId: string, format: string, filters: any): Promise<{ buffer: Buffer; filename: string }> {
        const entries = await this.getTimetableEntries(schoolId, filters);

        const exportData = {
            generatedAt: new Date().toISOString(),
            filters,
            entries,
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const buffer = Buffer.from(jsonString);
        const filename = `timetable-export-${new Date().toISOString().split('T')[0]}.json`;

        return { buffer, filename };
    }

    async importTimetable(schoolId: string, classId: string, term: string, weekStart: string, file: any): Promise<{ imported: number }> {
        // Simplified import - in real implementation, parse CSV/Excel
        // For now, return mock
        return { imported: 0 };
    }

    // ============ TEMPLATES ============
    async getTemplates(schoolId: string): Promise<TimetableTemplate[]> {
        // For now, return all templates (no school filtering for templates)
        return this.templateRepository.find({ order: { createdAt: 'DESC' } });
    }

    async createTemplate(schoolId: string, userId: string, name: string, data: any): Promise<TimetableTemplate> {
        const template = this.templateRepository.create({
            name,
            data,
            createdBy: userId,
        });

        return this.templateRepository.save(template);
    }

    async generateFromTemplate(
        schoolId: string,
        templateId: string,
        classId: string,
        term: string,
        weekStart?: string,
    ): Promise<{ generated: number }> {
        const template = await this.templateRepository.findOne({ where: { id: templateId } });
        if (!template) {
            throw new NotFoundException('Template not found');
        }

        const classEntity = await this.classRepository.findOne({
            where: { id: classId, schoolId: schoolId }
        });
        if (!classEntity) {
            throw new BadRequestException('Class not found in your school');
        }

        const entries: any[] = [];
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

        for (const day of days) {
            const dayEntries = template.data[day.toLowerCase()] || [];

            for (const templateEntry of dayEntries) {
                if (templateEntry.defaultSubjectId && templateEntry.defaultTeacherId) {
                    entries.push({
                        day,
                        period: templateEntry.period,
                        classId,
                        subjectId: templateEntry.defaultSubjectId,
                        teacherId: templateEntry.defaultTeacherId,
                        room: templateEntry.defaultRoom || '',
                        startTime: '',
                        endTime: '',
                        term,
                        weekStart,
                        academicYear: classEntity.academic_year,
                    });
                }
            }
        }

        // Get time slots to fill start/end times
        const timeSlots = await this.timeSlotRepository.find();
        for (const entry of entries) {
            const slot = timeSlots.find(s => s.period === entry.period);
            if (slot) {
                entry.startTime = slot.startTime;
                entry.endTime = slot.endTime;
            }
        }

        let generated = 0;
        for (const entry of entries) {
            try {
                await this.createTimetableEntry(schoolId, entry);
                generated++;
            } catch (error) {
                console.error(`Failed to create entry: ${error.message}`);
            }
        }

        return { generated };
    }

    async deleteTemplate(schoolId: string, id: string): Promise<void> {
        const template = await this.templateRepository.findOne({ where: { id } });
        if (!template) {
            throw new NotFoundException('Template not found');
        }

        await this.templateRepository.delete(id);
    }

    async updateTimeSlot(id: string, data: { startTime: string; endTime: string; break: boolean }): Promise<TimeSlot> {
        const slot = await this.timeSlotRepository.findOne({ where: { id } });
        if (!slot) {
            throw new NotFoundException('Time slot not found');
        }

        Object.assign(slot, data);
        return this.timeSlotRepository.save(slot);
    }
}