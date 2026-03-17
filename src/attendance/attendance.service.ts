import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { AttendanceAlert } from './entities/attendance-alert.entity';
import { Student } from '../students/entities/student.entity';
import { Class } from '../students/entities/class.entity';
import { TeacherClassSubject } from '../teachers/entities/teacher-class-subject.entity';

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
    ) { }

    /**
     * Check if teacher has access to a class
     */
    private async verifyTeacherAccess(teacherId: string, classId: string): Promise<boolean> {
        // Check if teacher is assigned to any subject in this class
        const assignment = await this.teacherClassSubjectRepo.findOne({
            where: { teacherId: teacherId, classId: classId }
        });

        if (assignment) return true;

        // Check if teacher is class teacher
        const classEntity = await this.classRepo.findOne({
            where: { id: classId, classTeacherId: teacherId }
        });

        return !!classEntity;
    }

    /**
     * Get attendance for a class on a specific date
     */
    async getByClassAndDate(classId: string, date: string, teacherId: string) {
        // Verify teacher access
        const hasAccess = await this.verifyTeacherAccess(teacherId, classId);
        if (!hasAccess) {
            throw new ForbiddenException('You do not have access to this class');
        }

        // Get attendance records for this class and date
        const records = await this.attendanceRepo.find({
            where: { classId: classId, date: date },
            relations: ['student']
        });

        return records;
    }

    /**
     * Save a single attendance record
     */
    async save(data: any, teacherId: string) {
        // Verify teacher access
        const hasAccess = await this.verifyTeacherAccess(teacherId, data.classId);
        if (!hasAccess) {
            throw new ForbiddenException('You do not have access to this class');
        }

        // Check if student exists and belongs to this class
        const student = await this.studentRepo.findOne({
            where: { id: data.studentId, class: { id: data.classId } }
        });

        if (!student) {
            throw new NotFoundException('Student not found in this class');
        }

        // Check if record already exists for this student on this date
        const existing = await this.attendanceRepo.findOne({
            where: {
                studentId: data.studentId,
                date: data.date
            }
        });

        if (existing) {
            // Update existing record
            existing.status = data.status;
            existing.checkInTime = data.checkInTime || existing.checkInTime;
            existing.notes = data.notes || existing.notes;
            existing.markedBy = teacherId;
            return this.attendanceRepo.save(existing);
        } else {
            // Create new record
            const attendance = this.attendanceRepo.create({
                studentId: data.studentId,
                classId: data.classId,
                date: data.date,
                status: data.status,
                checkInTime: data.checkInTime,
                notes: data.notes,
                markedBy: teacherId
            });
            return this.attendanceRepo.save(attendance);
        }
    }

    /**
     * Save multiple attendance records in batch
     */
    // Save multiple attendance records in batch
    // async saveBatch(records: any[], teacherId: string) {
    //     if (records.length === 0) return [];

    //     // Verify teacher has access to the class (all records should be same class)
    //     const classId = records[0].classId;
    //     const hasAccess = await this.verifyTeacherAccess(teacherId, classId);
    //     if (!hasAccess) {
    //         throw new ForbiddenException('You do not have access to this class');
    //     }

    //     const savedRecords: Attendance[] = [];

    //     for (const record of records) {
    //         try {
    //             const saved = await this.save(record, teacherId);
    //             if (saved) {
    //                 savedRecords.push(saved);
    //             }
    //         } catch (error) {
    //             console.error(`Failed to save attendance for student ${record.studentId}:`, error.message);
    //         }
    //     }

    //     return savedRecords;
    // }

    /**
 * Save multiple attendance records in batch - AUTO-MARKS PRESENT for unsubmitted students
 */
    async saveBatch(records: any[], teacherId: string) {
        if (records.length === 0) return [];

        // Verify teacher has access to the class (all records should be same class)
        const classId = records[0].classId;
        const hasAccess = await this.verifyTeacherAccess(teacherId, classId);
        if (!hasAccess) {
            throw new ForbiddenException('You do not have access to this class');
        }

        // Get ALL students in this class
        const allStudents = await this.studentRepo.find({
            where: { class: { id: classId } }
        });

        // Get IDs of students who were submitted
        const submittedStudentIds = records.map(r => r.studentId);

        // Create present records for students who weren't submitted
        for (const student of allStudents) {
            if (!submittedStudentIds.includes(student.id)) {
                records.push({
                    studentId: student.id,
                    classId: classId,
                    date: records[0].date,
                    status: 'present',
                    checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    notes: 'Auto-marked present'
                });
            }
        }

        // Save all records (both submitted and auto-generated)
        const savedRecords: Attendance[] = [];

        for (const record of records) {
            try {
                const saved = await this.save(record, teacherId);
                if (saved) {
                    savedRecords.push(saved);
                }
            } catch (error) {
                console.error(`Failed to save attendance for student ${record.studentId}:`, error.message);
            }
        }

        return savedRecords;
    }

    /**
     * Mark all students in a class as present
     */
    // Mark all students in a class as present
    async markAllPresent(classId: string, date: string, studentIds: string[], teacherId: string) {
        const hasAccess = await this.verifyTeacherAccess(teacherId, classId);
        if (!hasAccess) {
            throw new ForbiddenException('You do not have access to this class');
        }

        const records: Attendance[] = [];
        const checkInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        for (const studentId of studentIds) {
            // Check if record exists
            const existing = await this.attendanceRepo.findOne({
                where: { studentId: studentId, date: date }
            });

            if (existing) {
                existing.status = 'present';
                existing.checkInTime = checkInTime;
                existing.markedBy = teacherId;
                const saved = await this.attendanceRepo.save(existing);
                records.push(saved);
            } else {
                const attendance = this.attendanceRepo.create({
                    studentId: studentId,
                    classId: classId,
                    date: date,
                    status: 'present',
                    checkInTime: checkInTime,
                    markedBy: teacherId
                });
                const saved = await this.attendanceRepo.save(attendance);
                records.push(saved);
            }
        }

        return records;
    }

    /**
     * Get weekly attendance stats for a class
     */
    // Get weekly attendance stats for a class
    async getWeeklyStats(classId: string, startDate: string, endDate: string, teacherId: string) {
        const hasAccess = await this.verifyTeacherAccess(teacherId, classId);
        if (!hasAccess) {
            throw new ForbiddenException('You do not have access to this class');
        }

        // Get total students in class
        const totalStudents = await this.studentRepo.count({
            where: { class: { id: classId } }
        });

        // Get attendance records for date range
        const attendances = await this.attendanceRepo.find({
            where: {
                classId: classId,
                date: Between(startDate, endDate)
            }
        });

        // Group by date
        const stats: any[] = [];
        const dateMap = new Map();

        attendances.forEach(att => {
            if (!dateMap.has(att.date)) {
                dateMap.set(att.date, { present: 0, late: 0, absent: 0, excused: 0 });
            }
            const dayStat = dateMap.get(att.date);
            dayStat[att.status] = (dayStat[att.status] || 0) + 1;
        });

        // Convert to array with day names
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        dateMap.forEach((stat: any, date: string) => {
            const dayIndex = new Date(date).getDay();
            const present = (stat.present || 0) + (stat.late || 0); // Count late as present for attendance rate
            const rate = totalStudents > 0 ? Number(((present / totalStudents) * 100).toFixed(1)) : 0;

            stats.push({
                date: date,
                day: days[dayIndex],
                rate: rate,
                present: stat.present || 0,
                late: stat.late || 0,
                absent: stat.absent || 0,
                excused: stat.excused || 0,
                total: totalStudents
            });
        });

        // Sort by date
        return stats.sort((a, b) => a.date.localeCompare(b.date));
    }

    /**
     * Get attendance summaries for all classes a teacher has access to
     */
    // Get attendance summaries for all classes a teacher has access to
    async getClassSummaries(teacherId: string) {
        // Get all classes teacher has access to (via assignments)
        const assignments = await this.teacherClassSubjectRepo.find({
            where: { teacherId: teacherId },
            relations: ['class']
        });

        const classIds = [...new Set(assignments.map(a => a.classId))];

        // Also check class teacher assignments
        const classTeacherClasses = await this.classRepo.find({
            where: { classTeacherId: teacherId }
        });

        classTeacherClasses.forEach(cls => {
            if (!classIds.includes(cls.id)) {
                classIds.push(cls.id);
            }
        });

        const summaries: any[] = [];

        for (const classId of classIds) {
            const classEntity = await this.classRepo.findOne({
                where: { id: classId }
            });

            if (!classEntity) continue;

            const totalStudents = await this.studentRepo.count({
                where: { class: { id: classId } }
            });

            // Get last 30 days of attendance
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const startDate = thirtyDaysAgo.toISOString().split('T')[0];
            const endDate = new Date().toISOString().split('T')[0];

            const attendances = await this.attendanceRepo.find({
                where: {
                    classId: classId,
                    date: Between(startDate, endDate)
                }
            });

            // Calculate average rate
            if (attendances.length > 0 && totalStudents > 0) {
                const dateMap = new Map();

                attendances.forEach(att => {
                    if (!dateMap.has(att.date)) {
                        dateMap.set(att.date, { present: 0, late: 0 });
                    }
                    const day = dateMap.get(att.date);
                    if (att.status === 'present' || att.status === 'late') {
                        if (att.status === 'present') day.present++;
                        if (att.status === 'late') day.late++;
                    }
                });

                let totalRate = 0;
                dateMap.forEach((day: any, date: string) => {
                    const presentCount = day.present + day.late;
                    totalRate += (presentCount / totalStudents) * 100;
                });

                const averageRate = dateMap.size > 0 ? Number((totalRate / dateMap.size).toFixed(1)) : 0;

                summaries.push({
                    classId: classId,
                    className: classEntity.name,
                    averageRate: averageRate,
                    totalStudents: totalStudents
                });
            } else {
                summaries.push({
                    classId: classId,
                    className: classEntity.name,
                    averageRate: 0,
                    totalStudents: totalStudents
                });
            }
        }

        return summaries;
    }

    /**
     * Get top/bottom performing students by attendance
     */
    // async getStudentPerformance(classId: string, type: 'best' | 'needs-improvement', limit: number, teacherId: string) {
    //     const hasAccess = await this.verifyTeacherAccess(teacherId, classId);
    //     if (!hasAccess) {
    //         throw new ForbiddenException('You do not have access to this class');
    //     }

    //     const students = await this.studentRepo.find({
    //         where: { class: { id: classId } }
    //     });

    //     // Get last 30 days of attendance
    //     const thirtyDaysAgo = new Date();
    //     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    //     const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    //     const endDate = new Date().toISOString().split('T')[0];

    //     const attendances = await this.attendanceRepo.find({
    //         where: {
    //             classId: classId,
    //             date: Between(startDate, endDate)
    //         }
    //     });

    //     // Calculate attendance rate for each student
    //     const studentRates = students.map(student => {
    //         const studentAttendances = attendances.filter(a => a.studentId === student.id);

    //         if (studentAttendances.length === 0) {
    //             return {
    //                 id: student.id,
    //                 name: student.name,
    //                 examNumber: student.examNumber,
    //                 attendanceRate: 0,
    //                 parentPhone: student.parentPhone,
    //                 parentEmail: student.parentEmail
    //             };
    //         }

    //         const presentDays = studentAttendances.filter(a => a.status === 'present' || a.status === 'late').length;
    //         const rate = Number(((presentDays / studentAttendances.length) * 100).toFixed(1));

    //         return {
    //             id: student.id,
    //             name: student.name,
    //             examNumber: student.examNumber,
    //             attendanceRate: rate,
    //             parentPhone: student.parentPhone,
    //             parentEmail: student.parentEmail
    //         };
    //     });

    //     // Sort and filter based on type
    //     if (type === 'best') {
    //         return studentRates
    //             .sort((a, b) => b.attendanceRate - a.attendanceRate)
    //             .slice(0, limit);
    //     } else {
    //         return studentRates
    //             .filter(s => s.attendanceRate > 0) // Only include students with some attendance data
    //             .sort((a, b) => a.attendanceRate - b.attendanceRate)
    //             .slice(0, limit);
    //     }
    // }

    /**
 * Get top/bottom performing students by attendance - NO LIMIT
 */
    async getStudentPerformance(classId: string, type: 'best' | 'needs-improvement', teacherId: string) {
        const hasAccess = await this.verifyTeacherAccess(teacherId, classId);
        if (!hasAccess) {
            throw new ForbiddenException('You do not have access to this class');
        }

        const students = await this.studentRepo.find({
            where: { class: { id: classId } }
        });

        // Get last 30 days of attendance
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const startDate = thirtyDaysAgo.toISOString().split('T')[0];
        const endDate = new Date().toISOString().split('T')[0];

        const attendances = await this.attendanceRepo.find({
            where: {
                classId: classId,
                date: Between(startDate, endDate)
            }
        });

        // Calculate attendance rate for each student
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

        // Sort all students by rate (highest to lowest)
        const sortedByRate = [...studentRates].sort((a, b) => b.attendanceRate - a.attendanceRate);

        if (type === 'best') {
            // Return ALL students with attendance rate >= 90% (top performers)
            return sortedByRate.filter(s => s.attendanceRate >= 90);
        } else {
            // Return ALL students with attendance rate < 70% (need improvement)
            return sortedByRate.filter(s => s.attendanceRate > 0 && s.attendanceRate < 70);
        }
    }

    /**
     * Send attendance alerts (just records the alert, actual sending would need SMS/email service)
     */
    async sendAlerts(data: any, teacherId: string) {
        const hasAccess = await this.verifyTeacherAccess(teacherId, data.classId);
        if (!hasAccess) {
            throw new ForbiddenException('You do not have access to this class');
        }

        // Get students to alert
        let studentIds = data.studentIds;

        if (!studentIds) {
            // If no specific students, get all absent/late for the date
            const attendances = await this.attendanceRepo.find({
                where: {
                    classId: data.classId,
                    date: data.date,
                    status: In(['absent', 'late'])
                }
            });
            studentIds = attendances.map(a => a.studentId);
        }

        if (studentIds.length === 0) {
            return { sent: 0, message: 'No students to alert' };
        }

        // Get student details for contact info
        const students = await this.studentRepo.find({
            where: { id: In(studentIds) }
        });

        // Count valid contacts based on method
        let validContacts = 0;
        if (data.method === 'sms') {
            validContacts = students.filter(s => s.parentPhone).length;
        } else if (data.method === 'email') {
            validContacts = students.filter(s => s.parentEmail).length;
        }

        // Record the alert
        const alert = this.alertRepo.create({
            classId: data.classId,
            date: data.date,
            method: data.method,
            recipientCount: validContacts,
            studentIds: studentIds,
            subject: `Attendance Alert for ${data.date}`,
            message: `Your child was marked ${studentIds.length > 1 ? 'absent/late' : 'absent or late'} on ${data.date}`,
            sentBy: teacherId,
            status: 'sent'
        });

        await this.alertRepo.save(alert);

        return {
            sent: validContacts,
            message: `Alerts sent to ${validContacts} parents`
        };
    }

    /**
     * Get alert history
     */
    async getAlertHistory(classId: string, limit: number, teacherId: string) {
        // Verify teacher has access
        if (classId) {
            const hasAccess = await this.verifyTeacherAccess(teacherId, classId);
            if (!hasAccess) {
                throw new ForbiddenException('You do not have access to this class');
            }
        }

        const where: any = { sentBy: teacherId };
        if (classId) {
            where.classId = classId;
        }

        const alerts = await this.alertRepo.find({
            where: where,
            relations: ['class'],
            order: { sentAt: 'DESC' },
            take: limit
        });

        return alerts;
    }

    async getAttendancePatterns(classId: string, startDate: string, endDate: string, teacherId: string) {
        const hasAccess = await this.verifyTeacherAccess(teacherId, classId);
        if (!hasAccess) {
            throw new ForbiddenException('You do not have access to this class');
        }

        // Get attendance records
        const attendances = await this.attendanceRepo.find({
            where: {
                classId: classId,
                date: Between(startDate, endDate)
            },
            relations: ['student']
        });

        // Group by day of week
        const dayStats: any = {
            'Monday': { total: 0, absent: 0, present: 0, late: 0, excused: 0 },
            'Tuesday': { total: 0, absent: 0, present: 0, late: 0, excused: 0 },
            'Wednesday': { total: 0, absent: 0, present: 0, late: 0, excused: 0 },
            'Thursday': { total: 0, absent: 0, present: 0, late: 0, excused: 0 },
            'Friday': { total: 0, absent: 0, present: 0, late: 0, excused: 0 },
            'Saturday': { total: 0, absent: 0, present: 0, late: 0, excused: 0 },
            'Sunday': { total: 0, absent: 0, present: 0, late: 0, excused: 0 }
        };

        // Create daily patterns array
        const dailyPatterns: any[] = [];
        const dateMap = new Map();

        attendances.forEach(att => {
            const day = new Date(att.date).toLocaleDateString('en-US', { weekday: 'long' });
            if (dayStats[day]) {
                dayStats[day].total++;
                dayStats[day][att.status]++;
            }

            // Group by date for daily patterns
            if (!dateMap.has(att.date)) {
                dateMap.set(att.date, {
                    date: att.date,
                    present: 0,
                    absent: 0,
                    late: 0,
                    excused: 0,
                    total: 0
                });
            }
            const dayData = dateMap.get(att.date);
            dayData[att.status]++;
            dayData.total++;
        });

        // Convert dateMap to array with day names
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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

        // Find highest absence day
        let highestAbsenceDay = '';
        let highestAbsenceRate = 0;
        let bestAttendanceDay = '';
        let bestAttendanceRate = 0;

        Object.entries(dayStats).forEach(([day, stats]: [string, any]) => {
            if (stats.total > 0) {
                const absenceRate = (stats.absent / stats.total) * 100;
                const attendanceRate = ((stats.present + stats.late) / stats.total) * 100;

                if (absenceRate > highestAbsenceRate) {
                    highestAbsenceRate = absenceRate;
                    highestAbsenceDay = day;
                }
                if (attendanceRate > bestAttendanceRate) {
                    bestAttendanceRate = attendanceRate;
                    bestAttendanceDay = day;
                }
            }
        });

        // Find peak late time
        const lateTimes = attendances
            .filter(a => a.status === 'late' && a.checkInTime)
            .map(a => a.checkInTime);

        const timeCount: any = {};
        lateTimes.forEach(time => {
            if (time) {
                timeCount[time] = (timeCount[time] || 0) + 1;
            }
        });

        let peakLateTime = '8:45 AM';
        let maxCount = 0;
        Object.entries(timeCount).forEach(([time, count]: [string, any]) => {
            if (count > maxCount) {
                maxCount = count;
                peakLateTime = time;
            }
        });

        // Get total students for class performance
        const totalStudents = await this.studentRepo.count({
            where: { class: { id: classId } }
        });

        // Get class name
        const classEntity = await this.classRepo.findOne({ where: { id: classId } });

        // Calculate average rate safely
        let averageRate = 0;
        if (dailyPatterns.length > 0) {
            const sum = dailyPatterns.reduce((acc: number, curr: any) => acc + curr.rate, 0);
            averageRate = Number((sum / dailyPatterns.length).toFixed(1));
        }

        // Create class performance array
        const classPerformance = [{
            classId,
            className: classEntity?.name || '',
            averageRate: averageRate,
            totalStudents,
            trend: 'stable' as 'up' | 'down' | 'stable'
        }];

        return {
            dailyPatterns,
            classPerformance,
            peakLateTimes: [{ time: peakLateTime, count: lateTimes.length, day: highestAbsenceDay || 'Monday' }]
        };
    }

    // async getByStudentId(studentId: string) {
    //     const records = await this.attendanceRepo.find({
    //         where: { studentId: studentId },
    //         order: { date: 'DESC' }
    //     });

    //     return records.map(record => ({
    //         id: record.id,
    //         date: record.date,
    //         status: record.status,
    //         checkInTime: record.checkInTime,
    //         remarks: record.notes
    //     }));
    // }
    async getByStudentId(studentId: string) {
        console.log('🔍 Searching attendance for studentId:', studentId);

        const records = await this.attendanceRepo.find({
            where: { studentId: studentId },
            order: { date: 'DESC' }
        });

        console.log('📊 Found records:', records.length);
        if (records.length > 0) {
            console.log('First record:', records[0]);
        } else {
            console.log('❌ No records found for studentId:', studentId);
        }

        return records.map(record => ({
            id: record.id,
            date: record.date,
            status: record.status,
            checkInTime: record.checkInTime,
            remarks: record.notes
        }));
    }
}