// src/attendance/attendance.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { AttendanceAlert } from './entities/attendance-alert.entity';
import { Student } from '../students/entities/student.entity';
import { Class } from '../students/entities/class.entity';
import { TeacherClassSubject } from '../teachers/entities/teacher-class-subject.entity';

import { PublicHoliday } from './entities/public-holiday.entity';
import { SchoolHoliday } from './entities/school-holiday.entity';
import { Term } from './entities/term.entity';

@Injectable()
export class AttendanceService {
    constructor(
        @InjectRepository(Attendance)
        private attendanceRepo: Repository<Attendance>,

        @InjectRepository(AttendanceAlert)
        private alertRepo: Repository<AttendanceAlert>,

        @InjectRepository(Student)
        private studentRepo: Repository<Student>,

        @InjectRepository(Class)
        private classRepo: Repository<Class>,

        @InjectRepository(TeacherClassSubject)
        private teacherClassSubjectRepo: Repository<TeacherClassSubject>,

        @InjectRepository(Term)
        private termRepo: Repository<Term>,

        @InjectRepository(SchoolHoliday)
        private schoolHolidayRepo: Repository<SchoolHoliday>,

        @InjectRepository(PublicHoliday)
        private publicHolidayRepo: Repository<PublicHoliday>,
    ) { }

    private async verifyTeacherAccess(teacherId: string, classId: string): Promise<boolean> {
        const assignment = await this.teacherClassSubjectRepo.findOne({
            where: { teacherId: teacherId, classId: classId }
        });
        if (assignment) return true;

        const classEntity = await this.classRepo.findOne({
            where: { id: classId, classTeacherId: teacherId }
        });
        return !!classEntity;
    }

    // ========== ATTENDANCE CRUD ==========

    async getByClassAndDate(classId: string, date: string): Promise<Attendance[]> {
        const records = await this.attendanceRepo.find({
            where: { classId: classId, date: date },
            relations: ['student']
        });
        return records;
    }

    async saveSingle(data: any): Promise<Attendance> {
        const existing = await this.attendanceRepo.findOne({
            where: { studentId: data.studentId, date: data.date }
        });

        if (existing) {
            existing.status = data.status;
            existing.checkInTime = data.checkInTime || existing.checkInTime;
            existing.notes = data.notes || existing.notes;
            return this.attendanceRepo.save(existing);
        }

        const attendance = this.attendanceRepo.create({
            studentId: data.studentId,
            classId: data.classId,
            date: data.date,
            status: data.status,
            checkInTime: data.checkInTime,
            notes: data.notes,
        });
        return this.attendanceRepo.save(attendance);
    }

    async saveBatch(records: any[]): Promise<Attendance[]> {
        if (records.length === 0) return [];

        const classId = records[0].classId;
        const date = records[0].date;

        // Get ALL students in this class
        const allStudents = await this.studentRepo.find({
            where: { class: { id: classId } }
        });

        const submittedStudentIds = records.map(r => r.studentId);

        // Auto-mark present for unsubmitted students
        for (const student of allStudents) {
            if (!submittedStudentIds.includes(student.id)) {
                records.push({
                    studentId: student.id,
                    classId: classId,
                    date: date,
                    status: 'present',
                    checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    notes: 'Auto-marked present'
                });
            }
        }

        const savedRecords: Attendance[] = [];
        for (const record of records) {
            const saved = await this.saveSingle(record);
            savedRecords.push(saved);
        }
        return savedRecords;
    }

    async markAllPresent(classId: string, date: string, studentIds: string[]): Promise<Attendance[]> {
        const checkInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const records: Attendance[] = [];

        for (const studentId of studentIds) {
            const existing = await this.attendanceRepo.findOne({
                where: { studentId: studentId, date: date }
            });

            if (existing) {
                existing.status = 'present';
                existing.checkInTime = checkInTime;
                records.push(await this.attendanceRepo.save(existing));
            } else {
                const attendance = this.attendanceRepo.create({
                    studentId: studentId,
                    classId: classId,
                    date: date,
                    status: 'present',
                    checkInTime: checkInTime,
                });
                records.push(await this.attendanceRepo.save(attendance));
            }
        }
        return records;
    }

    // ========== ATTENDANCE STATS ==========

    async getWeeklyStats(classId: string, startDate: string, endDate: string): Promise<any[]> {
        const totalStudents = await this.studentRepo.count({
            where: { class: { id: classId } }
        });

        const attendances = await this.attendanceRepo.find({
            where: { classId: classId, date: Between(startDate, endDate) }
        });

        const dateMap = new Map();
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        attendances.forEach(att => {
            if (!dateMap.has(att.date)) {
                dateMap.set(att.date, { present: 0, late: 0, absent: 0, excused: 0 });
            }
            const dayStat = dateMap.get(att.date);
            dayStat[att.status] = (dayStat[att.status] || 0) + 1;
        });

        const stats: any[] = [];
        dateMap.forEach((stat: any, date: string) => {
            const dayIndex = new Date(date).getDay();
            const present = (stat.present || 0) + (stat.late || 0);
            const rate = totalStudents > 0 ? Number(((present / totalStudents) * 100).toFixed(1)) : 0;

            stats.push({
                date: date,
                day: days[dayIndex],
                rate: rate,
                present: stat.present || 0,
                total: totalStudents
            });
        });

        return stats.sort((a, b) => a.date.localeCompare(b.date));
    }

    async getMonthlyStats(classId: string, year: number, month: number): Promise<any[]> {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

        const weeklyStats = await this.getWeeklyStats(classId, startDate, endDate);

        // Group by week
        const weekMap = new Map();
        for (const stat of weeklyStats) {
            const date = new Date(stat.date);
            const weekNumber = this.getWeekNumber(date);
            const weekKey = `Week ${weekNumber}`;

            if (!weekMap.has(weekKey)) {
                weekMap.set(weekKey, { totalRate: 0, count: 0 });
            }
            const week = weekMap.get(weekKey);
            week.totalRate += stat.rate;
            week.count++;
        }

        const monthlyStats: any[] = [];
        weekMap.forEach((week, weekName) => {
            monthlyStats.push({
                weekName: weekName,
                rate: week.count > 0 ? Number((week.totalRate / week.count).toFixed(1)) : 0,
                present: 0,
                total: 0,
                date: startDate
            });
        });

        return monthlyStats;
    }

    async getTermStats(classId: string, termName: string): Promise<any> {
        const term = await this.termRepo.findOne({
            where: { name: termName }
        });

        if (!term) {
            return {
                averageRate: 0,
                highestRate: 0,
                lowestRate: 0,
                totalDays: 0,
                termName: termName
            };
        }

        const weeklyStats = await this.getWeeklyStats(classId, term.startDate, term.endDate);

        let totalRate = 0;
        let highestRate = 0;
        let lowestRate = 100;

        for (const stat of weeklyStats) {
            totalRate += stat.rate;
            if (stat.rate > highestRate) highestRate = stat.rate;
            if (stat.rate < lowestRate) lowestRate = stat.rate;
        }

        return {
            averageRate: weeklyStats.length > 0 ? Number((totalRate / weeklyStats.length).toFixed(1)) : 0,
            highestRate,
            lowestRate: lowestRate === 100 ? 0 : lowestRate,
            totalDays: weeklyStats.length,
            termName: termName
        };
    }

    async getClassSummaries(teacherId: string): Promise<any[]> {
        const assignments = await this.teacherClassSubjectRepo.find({
            where: { teacherId: teacherId },
            relations: ['class']
        });

        const classIds = [...new Set(assignments.map(a => a.classId))];

        const classTeacherClasses = await this.classRepo.find({
            where: { classTeacherId: teacherId }
        });
        classTeacherClasses.forEach(cls => {
            if (!classIds.includes(cls.id)) classIds.push(cls.id);
        });

        const summaries: any[] = [];
        for (const classId of classIds) {
            const classEntity = await this.classRepo.findOne({ where: { id: classId } });
            if (!classEntity) continue;

            const totalStudents = await this.studentRepo.count({
                where: { class: { id: classId } }
            });

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const startDate = thirtyDaysAgo.toISOString().split('T')[0];
            const endDate = new Date().toISOString().split('T')[0];

            const weeklyStats = await this.getWeeklyStats(classId, startDate, endDate);
            let totalRate = 0;
            for (const stat of weeklyStats) {
                totalRate += stat.rate;
            }
            const averageRate = weeklyStats.length > 0 ? Number((totalRate / weeklyStats.length).toFixed(1)) : 0;

            summaries.push({
                classId: classId,
                className: classEntity.name,
                averageRate: averageRate,
                totalStudents: totalStudents
            });
        }
        return summaries;
    }

    async getStudentPerformance(classId: string, type: 'best' | 'needs-improvement'): Promise<any[]> {
        const students = await this.studentRepo.find({
            where: { class: { id: classId } }
        });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const startDate = thirtyDaysAgo.toISOString().split('T')[0];
        const endDate = new Date().toISOString().split('T')[0];

        const attendances = await this.attendanceRepo.find({
            where: { classId: classId, date: Between(startDate, endDate) }
        });

        const studentRates = students.map(student => {
            const studentAttendances = attendances.filter(a => a.studentId === student.id);
            if (studentAttendances.length === 0) {
                return {
                    id: student.id,
                    name: student.name,
                    examNumber: student.examNumber,
                    attendanceRate: 0,
                    parentPhone: student.parentPhone,
                    parentEmail: student.parentEmail
                };
            }
            const presentDays = studentAttendances.filter(a => a.status === 'present' || a.status === 'late').length;
            const rate = Number(((presentDays / studentAttendances.length) * 100).toFixed(1));
            return {
                id: student.id,
                name: student.name,
                examNumber: student.examNumber,
                attendanceRate: rate,
                parentPhone: student.parentPhone,
                parentEmail: student.parentEmail
            };
        });

        if (type === 'best') {
            return studentRates.filter(s => s.attendanceRate >= 90);
        } else {
            return studentRates.filter(s => s.attendanceRate > 0 && s.attendanceRate < 70);
        }
    }

    // ========== ATTENDANCE ALERTS ==========

    async sendAlerts(data: any): Promise<{ sent: number; message: string }> {
        let studentIds = data.studentIds;

        if (!studentIds) {
            const attendances = await this.attendanceRepo.find({
                where: { classId: data.classId, date: data.date, status: In(['absent', 'late']) }
            });
            studentIds = attendances.map(a => a.studentId);
        }

        if (studentIds.length === 0) {
            return { sent: 0, message: 'No students to alert' };
        }

        const students = await this.studentRepo.find({ where: { id: In(studentIds) } });
        let validContacts = 0;
        if (data.method === 'sms') {
            validContacts = students.filter(s => s.parentPhone).length;
        } else if (data.method === 'email') {
            validContacts = students.filter(s => s.parentEmail).length;
        }

        const alert = this.alertRepo.create({
            classId: data.classId,
            date: data.date,
            method: data.method,
            recipientCount: validContacts,
            studentIds: studentIds,
            subject: `Attendance Alert for ${data.date}`,
            message: `Your child was marked ${studentIds.length > 1 ? 'absent/late' : 'absent or late'} on ${data.date}`,
            status: 'sent'
        });
        await this.alertRepo.save(alert);

        return { sent: validContacts, message: `Alerts sent to ${validContacts} parents` };
    }

    async getAlertHistory(classId?: string, limit: number = 10): Promise<any[]> {
        const where: any = {};
        if (classId) where.classId = classId;

        const alerts = await this.alertRepo.find({
            where: where,
            relations: ['class'],
            order: { sentAt: 'DESC' },
            take: limit
        });
        return alerts;
    }

    // ========== ATTENDANCE PATTERNS & ANALYTICS ==========

    async getAttendancePatterns(classId: string, startDate: string, endDate: string): Promise<any> {
        const attendances = await this.attendanceRepo.find({
            where: { classId: classId, date: Between(startDate, endDate) }
        });

        const dailyPatterns: any[] = [];
        const dateMap = new Map();
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        attendances.forEach(att => {
            if (!dateMap.has(att.date)) {
                dateMap.set(att.date, { present: 0, absent: 0, late: 0, excused: 0, total: 0 });
            }
            const dayData = dateMap.get(att.date);
            dayData[att.status]++;
            dayData.total++;
        });

        dateMap.forEach((stats: any, date: string) => {
            const dayIndex = new Date(date).getDay();
            const present = stats.present + stats.late;
            const rate = stats.total > 0 ? Number(((present / stats.total) * 100).toFixed(1)) : 0;
            dailyPatterns.push({
                date: date,
                day: days[dayIndex],
                present: stats.present,
                absent: stats.absent,
                late: stats.late,
                excused: stats.excused,
                total: stats.total,
                rate: rate
            });
        });

        const totalStudents = await this.studentRepo.count({ where: { class: { id: classId } } });
        const classEntity = await this.classRepo.findOne({ where: { id: classId } });

        let averageRate = 0;
        if (dailyPatterns.length > 0) {
            const sum = dailyPatterns.reduce((acc, curr) => acc + curr.rate, 0);
            averageRate = Number((sum / dailyPatterns.length).toFixed(1));
        }

        const classPerformance = [{
            classId,
            className: classEntity?.name || '',
            averageRate: averageRate,
            totalStudents,
            trend: 'stable' as 'up' | 'down' | 'stable'
        }];

        const lateTimes = attendances
            .filter(a => a.status === 'late' && a.checkInTime)
            .map(a => a.checkInTime);

        const timeCount: any = {};
        lateTimes.forEach(time => { if (time) timeCount[time] = (timeCount[time] || 0) + 1; });

        let peakLateTime = '8:45 AM';
        let maxCount = 0;
        Object.entries(timeCount).forEach(([time, count]: [string, any]) => {
            if (count > maxCount) { maxCount = count; peakLateTime = time; }
        });

        return { dailyPatterns, classPerformance, peakLateTimes: [{ time: peakLateTime, count: lateTimes.length, day: 'Monday' }] };
    }
    async getAttendanceAnalytics(classId: string): Promise<any> {
        // Get the class to find its term dates
        const classEntity = await this.classRepo.findOne({ where: { id: classId } });

        if (!classEntity || !classEntity.start_date || !classEntity.end_date) {
            return {
                summary: {
                    averageAttendance: 0,
                    totalDays: 0,
                    totalPresent: 0,
                    totalAbsent: 0,
                    totalLate: 0,
                    totalExcused: 0,
                    perfectAttendance: 0,
                    criticalRisk: 0
                },
                trends: { weekly: [], labels: [] },
                topPerformers: [],
                bottomPerformers: [],
                dayAnalysis: [
                    { day: 'Monday', rate: 0, absent: 0 },
                    { day: 'Tuesday', rate: 0, absent: 0 },
                    { day: 'Wednesday', rate: 0, absent: 0 },
                    { day: 'Thursday', rate: 0, absent: 0 },
                    { day: 'Friday', rate: 0, absent: 0 }
                ],
                alerts: { critical: [], warning: [] }
            };
        }

        // Use class term dates for the date range
        const startDate = classEntity.start_date;
        const endDate = classEntity.end_date;

        // Get all attendance records for this class within the term
        const attendances = await this.attendanceRepo.find({
            where: { classId: classId, date: Between(startDate, endDate) }
        });

        // Get all students in this class
        const students = await this.studentRepo.find({
            where: { class: { id: classId } }
        });

        if (students.length === 0 || attendances.length === 0) {
            const termStart = new Date(classEntity.start_date);
            const termEnd = new Date(classEntity.end_date);
            const todayDate = new Date();

            const totalDaysInTerm = Math.ceil((termEnd.getTime() - termStart.getTime()) / (1000 * 60 * 60 * 24));
            const totalWeeksInTerm = Math.max(1, Math.ceil(totalDaysInTerm / 7));

            const daysSinceStart = Math.max(0, Math.ceil((todayDate.getTime() - termStart.getTime()) / (1000 * 60 * 60 * 24)));
            const currentWeekNumber = Math.min(totalWeeksInTerm, Math.max(1, Math.ceil(daysSinceStart / 7)));

            const weeklyRates = new Array(totalWeeksInTerm).fill(0);
            const weekLabels: string[] = [];

            for (let i = 1; i <= totalWeeksInTerm; i++) {
                if (i === currentWeekNumber) {
                    weekLabels.push('This Week');
                } else {
                    weekLabels.push(`Week ${i}`);
                }
            }

            return {
                summary: {
                    averageAttendance: 0,
                    totalDays: 0,
                    totalPresent: 0,
                    totalAbsent: 0,
                    totalLate: 0,
                    totalExcused: 0,
                    perfectAttendance: 0,
                    criticalRisk: 0
                },
                trends: {
                    weekly: weeklyRates,
                    labels: weekLabels
                },
                topPerformers: [],
                bottomPerformers: [],
                dayAnalysis: [
                    { day: 'Monday', rate: 0, absent: 0 },
                    { day: 'Tuesday', rate: 0, absent: 0 },
                    { day: 'Wednesday', rate: 0, absent: 0 },
                    { day: 'Thursday', rate: 0, absent: 0 },
                    { day: 'Friday', rate: 0, absent: 0 }
                ],
                alerts: { critical: [], warning: [] }
            };
        }

        // Calculate summary
        const totalPresent = attendances.filter(a => a.status === 'present' || a.status === 'late').length;
        const totalAbsent = attendances.filter(a => a.status === 'absent').length;
        const totalLate = attendances.filter(a => a.status === 'late').length;
        const totalExcused = attendances.filter(a => a.status === 'excused').length;

        const uniqueDates = [...new Set(attendances.map(a => a.date))];
        const totalDays = uniqueDates.length;

        // Calculate average attendance rate per day
        let totalRate = 0;
        for (const date of uniqueDates) {
            const dayAttendances = attendances.filter(a => a.date === date);
            const presentCount = dayAttendances.filter(a => a.status === 'present' || a.status === 'late').length;
            const rate = dayAttendances.length > 0 ? (presentCount / dayAttendances.length) * 100 : 0;
            totalRate += rate;
        }
        const averageAttendance = uniqueDates.length > 0 ? Math.round(totalRate / uniqueDates.length) : 0;

        // Calculate perfect attendance and student rates
        let perfectAttendance = 0;
        const studentRates: { name: string; rate: number }[] = [];

        for (const student of students) {
            const studentAttendances = attendances.filter(a => a.studentId === student.id);
            if (studentAttendances.length > 0) {
                const presentCount = studentAttendances.filter(a => a.status === 'present' || a.status === 'late').length;
                const rate = (presentCount / studentAttendances.length) * 100;
                studentRates.push({ name: student.name, rate });
                if (rate === 100) perfectAttendance++;
            }
        }

        const criticalRisk = studentRates.filter(s => s.rate < 50).length;

        // Top and bottom performers
        const sortedRates = [...studentRates].sort((a, b) => b.rate - a.rate);
        const topPerformers = sortedRates.slice(0, 3).map(s => ({ name: s.name, rate: Math.round(s.rate) }));
        const bottomPerformers = sortedRates.slice(-3).reverse().map(s => ({ name: s.name, rate: Math.round(s.rate) }));

        // Day analysis
        const dayMap = new Map<string, { total: number; absent: number; rate: number }>();
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

        for (const att of attendances) {
            const date = new Date(att.date);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
            if (!dayMap.has(dayName)) {
                dayMap.set(dayName, { total: 0, absent: 0, rate: 0 });
            }
            const dayData = dayMap.get(dayName)!;
            dayData.total++;
            if (att.status === 'absent') dayData.absent++;
        }

        for (const [day, data] of dayMap) {
            data.rate = data.total > 0 ? ((data.total - data.absent) / data.total) * 100 : 0;
        }

        const dayAnalysis = daysOfWeek.map(day => ({
            day,
            rate: Math.round(dayMap.get(day)?.rate || 0),
            absent: Math.round((dayMap.get(day)?.absent || 0) / (uniqueDates.length || 1))
        }));

        // Alerts
        const critical = studentRates.filter(s => s.rate < 50).slice(0, 5).map(s => ({ name: s.name, attendanceRate: Math.round(s.rate) }));
        const warning = studentRates.filter(s => s.rate >= 50 && s.rate < 70).slice(0, 5).map(s => ({ name: s.name, attendanceRate: Math.round(s.rate) }));

        // Weekly trends - DYNAMIC based on term dates
        const termStart = new Date(classEntity.start_date);
        const termEnd = new Date(classEntity.end_date);
        const todayDate = new Date();

        const totalDaysInTerm = Math.ceil((termEnd.getTime() - termStart.getTime()) / (1000 * 60 * 60 * 24));
        const totalWeeksInTerm = Math.max(1, Math.ceil(totalDaysInTerm / 7));

        const daysSinceStart = Math.max(0, Math.ceil((todayDate.getTime() - termStart.getTime()) / (1000 * 60 * 60 * 24)));
        const currentWeekNumber = Math.min(totalWeeksInTerm, Math.max(1, Math.ceil(daysSinceStart / 7)));

        const weeklyRates: number[] = [];
        const weekLabels: string[] = [];

        for (let weekNum = 1; weekNum <= totalWeeksInTerm; weekNum++) {
            const weekStart = new Date(termStart);
            weekStart.setDate(termStart.getDate() + (weekNum - 1) * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            const weekAttendances = attendances.filter(a => {
                const attDate = new Date(a.date);
                return attDate >= weekStart && attDate <= weekEnd;
            });

            let weekRate = 0;
            if (weekAttendances.length > 0) {
                const weekDates = [...new Set(weekAttendances.map(a => a.date))];
                let totalWeekRate = 0;
                for (const date of weekDates) {
                    const dayAttendances = weekAttendances.filter(a => a.date === date);
                    const presentCount = dayAttendances.filter(a => a.status === 'present' || a.status === 'late').length;
                    const rate = dayAttendances.length > 0 ? (presentCount / dayAttendances.length) * 100 : 0;
                    totalWeekRate += rate;
                }
                weekRate = weekDates.length > 0 ? Math.round(totalWeekRate / weekDates.length) : 0;
            }

            weeklyRates.push(weekRate);

            if (weekNum === currentWeekNumber) {
                weekLabels.push('This Week');
            } else {
                weekLabels.push(`Week ${weekNum}`);
            }
        }

        return {
            summary: {
                averageAttendance,
                totalDays,
                totalPresent,
                totalAbsent,
                totalLate,
                totalExcused,
                perfectAttendance,
                criticalRisk
            },
            trends: {
                weekly: weeklyRates,
                labels: weekLabels
            },
            topPerformers,
            bottomPerformers,
            dayAnalysis,
            alerts: {
                critical,
                warning
            }
        };
    }

    // ========== STUDENT ATTENDANCE RATES ==========

    async getStudentAttendanceRate(studentId: string): Promise<{ attendanceRate: number; presentCount: number; totalDays: number }> {
        const attendances = await this.attendanceRepo.find({ where: { studentId: studentId } });
        const presentCount = attendances.filter(a => a.status === 'present' || a.status === 'late').length;
        const totalDays = attendances.length;
        const attendanceRate = totalDays > 0 ? Number(((presentCount / totalDays) * 100).toFixed(1)) : 0;
        return { attendanceRate, presentCount, totalDays };
    }

    async getAllStudentsAttendanceRates(): Promise<any[]> {
        const students = await this.studentRepo.find({ relations: ['class'] });
        const results: any[] = [];

        for (const student of students) {
            const rate = await this.getStudentAttendanceRate(student.id);
            results.push({
                studentId: student.id,
                studentName: student.name,
                examNumber: student.examNumber,
                classId: student.class?.id,
                className: student.class?.name,
                attendanceRate: rate.attendanceRate,
                presentCount: rate.presentCount,
                totalDays: rate.totalDays
            });
        }
        return results;
    }

    async getClassStudentsAttendanceRates(classId: string): Promise<any[]> {
        const students = await this.studentRepo.find({ where: { class: { id: classId } }, relations: ['class'] });
        const results: any[] = [];

        for (const student of students) {
            const rate = await this.getStudentAttendanceRate(student.id);
            results.push({
                studentId: student.id,
                studentName: student.name,
                examNumber: student.examNumber,
                classId: classId,
                className: student.class?.name,
                attendanceRate: rate.attendanceRate,
                presentCount: rate.presentCount,
                totalDays: rate.totalDays
            });
        }
        return results;
    }

    async getStudentAttendanceHistory(studentId: string, startDate: string, endDate: string): Promise<any[]> {
        const records = await this.attendanceRepo.find({
            where: { studentId: studentId, date: Between(startDate, endDate) },
            order: { date: 'DESC' }
        });
        return records;
    }

    // ========== TERMS & HOLIDAYS ==========

    async getCurrentTerm(schoolId?: string): Promise<any> {
        const today = new Date().toISOString().split('T')[0];

        const whereCondition: any = {
            start_date: LessThanOrEqual(today),
            end_date: MoreThanOrEqual(today)
        };

        if (schoolId) {
            whereCondition.schoolId = schoolId;
        }

        const activeClass = await this.classRepo.findOne({
            where: whereCondition
        });

        if (!activeClass) return null;

        return {
            id: activeClass.id,
            name: activeClass.term,
            startDate: activeClass.start_date,
            endDate: activeClass.end_date,
            className: activeClass.name
        };
    }

    async getAllTerms(schoolId?: string): Promise<any[]> {
        const whereCondition = schoolId ? { schoolId: schoolId } : {};

        const classes = await this.classRepo.find({
            where: whereCondition,
            order: { start_date: 'DESC' }
        });

        // Get unique terms from classes
        const termsMap = new Map();
        for (const cls of classes) {
            const key = `${cls.term}-${cls.academic_year}`;
            if (!termsMap.has(key)) {
                termsMap.set(key, {
                    id: cls.id,
                    name: cls.term,
                    academicYear: cls.academic_year,
                    startDate: cls.start_date,
                    endDate: cls.end_date
                });
            }
        }

        return Array.from(termsMap.values());
    }



    async getClassComparisons(schoolId?: string): Promise<any[]> {
        const whereCondition = schoolId ? { schoolId: schoolId } : {};
        const classes = await this.classRepo.find({
            where: whereCondition,
            relations: ['students']
        });
        const comparisons: any[] = [];

        for (const cls of classes) {
            const totalStudents = cls.students.length;
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const startDate = thirtyDaysAgo.toISOString().split('T')[0];
            const endDate = new Date().toISOString().split('T')[0];

            const weeklyStats = await this.getWeeklyStats(cls.id, startDate, endDate);
            let totalRate = 0;
            for (const stat of weeklyStats) totalRate += stat.rate;
            const averageRate = weeklyStats.length > 0 ? Number((totalRate / weeklyStats.length).toFixed(1)) : 0;

            comparisons.push({
                classId: cls.id,
                name: cls.name,
                attendanceRate: averageRate,
                totalStudents: totalStudents,
                trend: 'stable',
                rank: 0,
                isCurrent: false
            });
        }

        // Sort by attendance rate and assign ranks
        comparisons.sort((a, b) => b.attendanceRate - a.attendanceRate);
        comparisons.forEach((c, i) => c.rank = i + 1);

        return comparisons;
    }

    // async getClassComparisons(): Promise<any[]> {
    //     const classes = await this.classRepo.find({ relations: ['students'] });
    //     const comparisons: any[] = [];

    //     for (const cls of classes) {
    //         const totalStudents = cls.students.length;
    //         const thirtyDaysAgo = new Date();
    //         thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    //         const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    //         const endDate = new Date().toISOString().split('T')[0];

    //         const weeklyStats = await this.getWeeklyStats(cls.id, startDate, endDate);
    //         let totalRate = 0;
    //         for (const stat of weeklyStats) totalRate += stat.rate;
    //         const averageRate = weeklyStats.length > 0 ? Number((totalRate / weeklyStats.length).toFixed(1)) : 0;

    //         comparisons.push({
    //             classId: cls.id,
    //             name: cls.name,
    //             attendanceRate: averageRate,
    //             totalStudents: totalStudents,
    //             trend: 'stable',
    //             rank: 0,
    //             isCurrent: false
    //         });
    //     }

    //     // Sort by attendance rate and assign ranks
    //     comparisons.sort((a, b) => b.attendanceRate - a.attendanceRate);
    //     comparisons.forEach((c, i) => c.rank = i + 1);

    //     return comparisons;
    // }

    async getClassTerm(classId: string): Promise<any> {
        const classEntity = await this.classRepo.findOne({ where: { id: classId } });
        if (!classEntity) return null;

        return {
            id: classEntity.id,
            name: classEntity.term,
            startDate: classEntity.start_date,
            endDate: classEntity.end_date,
            className: classEntity.name
        };
    }

    async getSchoolHolidays(): Promise<SchoolHoliday[]> {
        return this.schoolHolidayRepo.find();
    }

    async getSchoolHolidaysByClass(classId: string): Promise<SchoolHoliday[]> {
        return this.schoolHolidayRepo.find({ where: { classId: classId } });
    }

    async getPublicHolidays(): Promise<PublicHoliday[]> {
        return this.publicHolidayRepo.find();
    }

    async getRecordedDaysCount(classId: string): Promise<number> {
        const attendances = await this.attendanceRepo.find({ where: { classId: classId } });
        const uniqueDates = new Set(attendances.map(a => a.date));
        return uniqueDates.size;
    }

    async addSchoolHoliday(date: string, classId: string, reason: string): Promise<void> {
        const holiday = this.schoolHolidayRepo.create({ date, classId, reason });
        await this.schoolHolidayRepo.save(holiday);
    }

    async removeSchoolHoliday(date: string, classId: string): Promise<void> {
        await this.schoolHolidayRepo.delete({ date, classId });
    }

    async getByStudentId(studentId: string): Promise<any[]> {
        const records = await this.attendanceRepo.find({
            where: { studentId: studentId },
            order: { date: 'DESC' }
        });
        return records.map(record => ({
            id: record.id,
            date: record.date,
            status: record.status,
            checkInTime: record.checkInTime,
            remarks: record.notes
        }));
    }

    private getWeekNumber(date: Date): number {
        const startDate = new Date(date.getFullYear(), 0, 1);
        const days = Math.floor((date.getTime() - startDate.getTime()) / 86400000);
        return Math.ceil((days + startDate.getDay() + 1) / 7);
    }
}