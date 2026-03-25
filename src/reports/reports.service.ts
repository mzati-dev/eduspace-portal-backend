import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Report } from './entities/report.entity';
import { Assessment } from '../students/entities/assessment.entity';
import { Student } from '../students/entities/student.entity';
import { Class } from '../students/entities/class.entity';
import { Subject } from '../students/entities/subject.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { ReportCard } from '../students/entities/report-card.entity';

interface SubjectData {
    subject: string;
    scores: number[];
    passCount: number;
}

interface StudentAverage {
    student: Student;
    average: number;
}

interface MonthlyData {
    present: number;
    total: number;
}

@Injectable()
export class ReportsService {
    constructor(
        @InjectRepository(Report)
        private reportRepository: Repository<Report>,
        @InjectRepository(Assessment)
        private assessmentRepository: Repository<Assessment>,
        @InjectRepository(Student)
        private studentRepository: Repository<Student>,
        @InjectRepository(Class)
        private classRepository: Repository<Class>,
        @InjectRepository(Subject)
        private subjectRepository: Repository<Subject>,
        @InjectRepository(Attendance)
        private attendanceRepository: Repository<Attendance>,
        @InjectRepository(ReportCard)
        private reportCardRepository: Repository<ReportCard>,
    ) { }

    async generateReport(data: {
        classId?: string;
        term?: string;
        reportType: 'academic' | 'attendance' | 'behavior' | 'summary';
        format: 'pdf' | 'excel' | 'csv';
        generatedBy: string;
        generatedByName: string;
    }) {
        let title = '';
        let className = '';

        if (data.classId) {
            const classEntity = await this.classRepository.findOne({ where: { id: data.classId } });
            className = classEntity?.name || '';
        }

        switch (data.reportType) {
            case 'academic':
                title = `Academic Performance Report - ${className} - ${data.term || ''}`;
                break;
            case 'attendance':
                title = `Attendance Report - ${className} - ${data.term || ''}`;
                break;
            case 'behavior':
                title = `Behavior Report - ${className} - ${data.term || ''}`;
                break;
            case 'summary':
                title = `Class Summary Report - ${className} - ${data.term || ''}`;
                break;
        }

        const report = this.reportRepository.create({
            title,
            type: data.reportType,
            format: data.format,
            classId: data.classId,
            className,
            term: data.term,
            filePath: `/reports/${Date.now()}-${title.replace(/\s/g, '-')}.${data.format}`,
            fileSize: '0 KB',
            generatedBy: data.generatedBy,
            generatedByName: data.generatedByName,
        });

        const savedReport = await this.reportRepository.save(report);
        return { data: savedReport };
    }

    async getClassPerformance(classId: string, term: string) {
        const students = await this.studentRepository.find({
            where: { class: { id: classId } },
            relations: ['class'],
        });

        if (students.length === 0) {
            return { data: null };
        }

        const assessments = await this.assessmentRepository.find({
            where: { class: { id: classId } },
            relations: ['student', 'subject'],
        });

        const reportCards = await this.reportCardRepository.find({
            where: { student: { class: { id: classId } }, term },
            relations: ['student'],
        });

        const subjectMap = new Map<string, SubjectData>();
        for (const assessment of assessments) {
            if (assessment.score === null || assessment.score === undefined) continue;

            const subjectId = assessment.subject.id;
            const subjectName = assessment.subject.name;

            if (!subjectMap.has(subjectId)) {
                subjectMap.set(subjectId, {
                    subject: subjectName,
                    scores: [],
                    passCount: 0,
                });
            }

            const data = subjectMap.get(subjectId)!;
            data.scores.push(assessment.score);
            if (assessment.score >= 50) data.passCount++;
        }

        const subjectAverages: Array<{ subject: string; average: number; passRate: number }> = [];
        for (const [, data] of subjectMap) {
            const average = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
            const passRate = (data.passCount / data.scores.length) * 100;
            subjectAverages.push({
                subject: data.subject,
                average: Math.round(average),
                passRate: Math.round(passRate),
            });
        }

        const studentAverages: StudentAverage[] = [];
        for (const student of students) {
            const studentReportCard = reportCards.find(rc => rc.student.id === student.id);
            if (studentReportCard && studentReportCard.overallAverage) {
                studentAverages.push({
                    student,
                    average: studentReportCard.overallAverage,
                });
            }
        }

        const sortedByAverage = [...studentAverages].sort((a, b) => b.average - a.average);
        const topPerformers = sortedByAverage.slice(0, 5).map(s => ({
            name: s.student.name,
            examNumber: s.student.examNumber,
            average: Math.round(s.average),
        }));

        const needsImprovement = sortedByAverage.slice(-3).map(s => ({
            name: s.student.name,
            examNumber: s.student.examNumber,
            average: Math.round(s.average),
        }));

        const allAverages = studentAverages.map(s => s.average);
        const classAverage = allAverages.length ? allAverages.reduce((a, b) => a + b, 0) / allAverages.length : 0;
        const passCount = studentAverages.filter(s => s.average >= 50).length;
        const passRate = students.length ? (passCount / students.length) * 100 : 0;
        const distinctionCount = studentAverages.filter(s => s.average >= 75).length;
        const distinctionRate = students.length ? (distinctionCount / students.length) * 100 : 0;

        return {
            data: {
                classAverage: Math.round(classAverage),
                passRate: Math.round(passRate),
                distinctionRate: Math.round(distinctionRate),
                totalStudents: students.length,
                topPerformers,
                needsImprovement,
                subjectAverages,
            },
        };
    }

    async getAttendanceReport(classId: string, term: string) {
        const students = await this.studentRepository.find({
            where: { class: { id: classId } },
        });

        if (students.length === 0) {
            return { data: null };
        }

        const studentIds = students.map(s => s.id);

        const attendances = await this.attendanceRepository.find({
            where: { studentId: In(studentIds) },
        });

        const present = attendances.filter(a => a.status === 'present').length;
        const absent = attendances.filter(a => a.status === 'absent').length;
        const late = attendances.filter(a => a.status === 'late').length;
        const excused = attendances.filter(a => a.status === 'excused').length;
        const total = present + absent + late + excused;
        const overall = total ? (present / total) * 100 : 0;

        const monthlyMap = new Map<string, MonthlyData>();
        for (const attendance of attendances) {
            const date = new Date(attendance.date);
            const month = date.toLocaleString('default', { month: 'short' });

            if (!monthlyMap.has(month)) {
                monthlyMap.set(month, { present: 0, total: 0 });
            }
            const data = monthlyMap.get(month)!;
            data.total++;
            if (attendance.status === 'present') data.present++;
        }

        const monthlyTrend: Array<{ month: string; rate: number }> = [];
        for (const [month, data] of monthlyMap) {
            monthlyTrend.push({
                month,
                rate: Math.round((data.present / data.total) * 100),
            });
        }

        return {
            data: {
                present,
                absent,
                late,
                excused,
                overall: Math.round(overall),
                monthlyTrend,
            },
        };
    }

    async getRecentReports() {
        const reports = await this.reportRepository.find({
            order: { generatedAt: 'DESC' },
            take: 10,
        });

        const formattedReports = reports.map(report => ({
            id: report.id,
            title: report.title,
            type: report.type,
            format: report.format,
            generatedAt: new Date(report.generatedAt).toLocaleDateString(),
            size: report.fileSize,
            class: report.className,
            term: report.term,
        }));

        return { data: formattedReports };
    }

    async downloadReport(reportId: string, format: string) {
        const report = await this.reportRepository.findOne({ where: { id: reportId } });
        if (!report) {
            throw new NotFoundException('Report not found');
        }

        let content = '';

        if (report.type === 'academic') {
            const performance = await this.getClassPerformance(report.classId, report.term);
            content = JSON.stringify(performance.data, null, 2);
        } else if (report.type === 'attendance') {
            const attendance = await this.getAttendanceReport(report.classId, report.term);
            content = JSON.stringify(attendance.data, null, 2);
        } else if (report.type === 'summary') {
            const performance = await this.getClassPerformance(report.classId, report.term);
            const attendance = await this.getAttendanceReport(report.classId, report.term);
            content = JSON.stringify({
                performance: performance.data,
                attendance: attendance.data,
            }, null, 2);
        }

        const buffer = Buffer.from(content, 'utf-8');

        return {
            buffer,
            filename: `report-${reportId}.${format}`,
            contentType: format === 'pdf' ? 'application/pdf' :
                format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                    'text/csv',
        };
    }
}