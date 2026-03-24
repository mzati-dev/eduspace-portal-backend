import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TimeSlot } from '../timetable/entities/time-slot.entity';
import { TimetableEntry } from '../timetable/entities/timetable-entry.entity';
import { Repository, Between, In } from 'typeorm';

type DayType = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

@Injectable()
export class TimetableTeacherService {
    constructor(
        @InjectRepository(TimetableEntry)
        private timetableEntryRepository: Repository<TimetableEntry>,
        @InjectRepository(TimeSlot)
        private timeSlotRepository: Repository<TimeSlot>,
    ) { }

    // Fetch teacher's timetable for a specific week
    async fetchTeacherTimetable(teacherId: string, weekStartDate?: string) {
        const whereCondition: any = { teacherId, isPublished: true };

        if (weekStartDate) {
            whereCondition.weekStart = weekStartDate;
        }

        const entries = await this.timetableEntryRepository.find({
            where: whereCondition,
            order: { day: 'ASC', period: 'ASC' },
        });

        // Group by day
        const daysMap = new Map();
        const days: DayType[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

        for (const day of days) {
            const dayEntries = entries.filter(e => e.day === day);

            const slots = dayEntries.map(entry => ({
                id: entry.id,
                subject: entry.subjectId,
                subjectId: entry.subjectId,
                class: entry.classId,
                classId: entry.classId,
                time: `${entry.startTime} - ${entry.endTime}`,
                startTime: entry.startTime,
                endTime: entry.endTime,
                duration: this.calculateDuration(entry.startTime, entry.endTime),
                room: entry.room,
                teacher: teacherId,
                teacherId: teacherId,
                dayOfWeek: this.getDayOfWeek(entry.day),
            }));

            daysMap.set(day, {
                day: day,
                date: weekStartDate ? this.getDateForDay(weekStartDate, day) : '',
                dayOfWeek: this.getDayOfWeek(day),
                slots: slots,
            });
        }

        // Return in correct order
        const result = days.map(day => daysMap.get(day)).filter(d => d && d.slots.length > 0);

        return { data: result };
    }

    // Fetch teacher's timetable for a specific day
    async fetchTeacherDayTimetable(teacherId: string, date: string) {
        // Extract weekStart from date (assuming date is YYYY-MM-DD)
        const weekStart = this.getWeekStartFromDate(date);
        const day = this.getDayOfWeekFromDate(date) as DayType;

        const entries = await this.timetableEntryRepository.find({
            where: {
                teacherId,
                weekStart,
                day: day as DayType,
                isPublished: true,
            },
            order: { period: 'ASC' },
        });

        const slots = entries.map(entry => ({
            id: entry.id,
            subject: entry.subjectId,
            subjectId: entry.subjectId,
            class: entry.classId,
            classId: entry.classId,
            time: `${entry.startTime} - ${entry.endTime}`,
            startTime: entry.startTime,
            endTime: entry.endTime,
            duration: this.calculateDuration(entry.startTime, entry.endTime),
            room: entry.room,
            teacher: teacherId,
            teacherId: teacherId,
        }));

        return {
            data: {
                day: day,
                date: date,
                dayOfWeek: this.getDayOfWeek(day),
                slots: slots,
            },
        };
    }

    // Get timetable statistics
    async fetchTimetableStats(teacherId: string, weekStartDate?: string) {
        const whereCondition: any = { teacherId, isPublished: true };

        if (weekStartDate) {
            whereCondition.weekStart = weekStartDate;
        }

        const entries = await this.timetableEntryRepository.find({
            where: whereCondition,
        });

        const uniqueClasses = new Set(entries.map(e => e.classId)).size;
        const uniqueSubjects = new Set(entries.map(e => e.subjectId)).size;

        // Calculate total hours
        let totalMinutes = 0;
        entries.forEach(entry => {
            const start = this.timeToMinutes(entry.startTime);
            const end = this.timeToMinutes(entry.endTime);
            totalMinutes += end - start;
        });
        const weeklyHours = Math.round(totalMinutes / 60);

        return {
            data: {
                totalClasses: entries.length,
                uniqueClasses: uniqueClasses,
                uniqueSubjects: uniqueSubjects,
                breakCount: 0,
                meetingCount: 0,
                weeklyHours: weeklyHours,
            },
        };
    }

    // Export timetable
    async exportTimetable(teacherId: string, format: 'pdf' | 'excel', weekStartDate?: string) {
        const entries = await this.fetchTeacherTimetable(teacherId, weekStartDate);
        return entries;
    }

    // Get upcoming alerts
    async fetchUpcomingAlerts(teacherId: string) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

        const today = this.getDayOfWeekFromNumber(now.getDay()) as DayType;
        const weekStart = this.getWeekStartFromDate(now.toISOString().split('T')[0]);

        const todayEntries = await this.timetableEntryRepository.find({
            where: {
                teacherId,
                weekStart,
                day: today,
                isPublished: true,
            },
            order: { period: 'ASC' },
        });

        // Find next upcoming class
        const upcoming = todayEntries.find(entry => entry.startTime > currentTime);

        const alerts: Array<{ id: string; message: string; time: string }> = [];
        if (upcoming) {
            alerts.push({
                id: '1',
                message: `Next class: ${upcoming.subjectId} at ${upcoming.startTime} in ${upcoming.room}`,
                time: upcoming.startTime,
            });
        }

        return { data: alerts };
    }

    // Helper methods
    private getDayOfWeek(day: DayType | string): number {
        const days: Record<DayType, number> = {
            Monday: 0,
            Tuesday: 1,
            Wednesday: 2,
            Thursday: 3,
            Friday: 4
        };
        return days[day as DayType] ?? 0;
    }

    private getDayOfWeekFromNumber(dayNumber: number): string {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        // dayNumber: 0=Sunday, 1=Monday, etc.
        if (dayNumber === 0) return days[4]; // Sunday -> Friday
        return days[dayNumber - 1];
    }

    private getDayOfWeekFromDate(dateStr: string): string {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const date = new Date(dateStr);
        const dayIndex = date.getDay();
        return dayIndex === 0 ? days[4] : days[dayIndex - 1];
    }

    private getWeekStartFromDate(dateStr: string): string {
        const date = new Date(dateStr);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date);
        monday.setDate(diff);
        return monday.toISOString().split('T')[0];
    }

    private getDateForDay(weekStart: string, day: DayType): string {
        const days: Record<DayType, number> = {
            Monday: 0,
            Tuesday: 1,
            Wednesday: 2,
            Thursday: 3,
            Friday: 4
        };
        const start = new Date(weekStart);
        start.setDate(start.getDate() + days[day]);
        return start.toISOString().split('T')[0];
    }

    private calculateDuration(start: string, end: string): string {
        const startMinutes = this.timeToMinutes(start);
        const endMinutes = this.timeToMinutes(end);
        const diffMinutes = endMinutes - startMinutes;
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }

    private timeToMinutes(time: string): number {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }
}