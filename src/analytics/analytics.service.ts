// src/modules/analytics/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AnalyticsData } from './entities/analytics.entity';
import { Student } from '../students/entities/student.entity';
import { Assessment } from '../students/entities/assessment.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Class } from '../students/entities/class.entity';
import { Subject } from '../students/entities/subject.entity';
import { GradeConfig } from '../students/entities/grade-config.entity';

export interface AtRiskStudent {
    id: string;
    name: string;
    examNumber: string;
    class: string;
    classId: string;
    riskScore: number;
    riskLevel: string;
    factors: string[];
    predictedGrade: string;
    currentAverage: number;
    attendanceRate: number;
    trend: string;
}

export interface ClassPerformance {
    classId: string;
    className: string;
    averageScore: number;
    passRate: number;
    distinctionRate: number;
    totalStudents: number;
    trend: number;
    topSubject: string;
    strugglingSubject: string;
}

export interface SubjectPerformance {
    subjectId: string;
    name: string;
    averageScore: number;
    passRate: number;
    distinctionRate: number;
    totalStudents: number;
    trend: number;
}

export interface TrendData {
    period: string;
    overall: number;
    subjects: Record<string, number>;
}

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectRepository(AnalyticsData)
        private analyticsRepository: Repository<AnalyticsData>,
        @InjectRepository(Student)
        private studentRepository: Repository<Student>,
        @InjectRepository(Assessment)
        private assessmentRepository: Repository<Assessment>,
        @InjectRepository(Attendance)
        private attendanceRepository: Repository<Attendance>,
        @InjectRepository(Class)
        private classRepository: Repository<Class>,
        @InjectRepository(Subject)
        private subjectRepository: Repository<Subject>,
        @InjectRepository(GradeConfig)
        private gradeConfigRepository: Repository<GradeConfig>,
    ) { }

    private async getActiveGradeConfig(schoolId: string): Promise<GradeConfig> {
        const config = await this.gradeConfigRepository.findOne({
            where: { school_id: schoolId, is_active: true }
        });

        if (!config) {
            const defaultConfig = new GradeConfig();
            defaultConfig.pass_mark = 50;
            defaultConfig.calculation_method = 'average_all';
            defaultConfig.weight_qa1 = 30;
            defaultConfig.weight_qa2 = 30;
            defaultConfig.weight_end_of_term = 40;
            return defaultConfig;
        }

        return config;
    }

    private calculatePredictedGrade(avgScore: number, trend: string, gradeConfig: GradeConfig): string {
        let predicted = avgScore;
        if (trend === 'improving') predicted += 5;
        if (trend === 'declining') predicted -= 5;

        const passMark = gradeConfig.pass_mark;

        if (predicted >= 80) return 'A';
        if (predicted >= 70) return 'B';
        if (predicted >= 60) return 'C';
        if (predicted >= passMark) return 'D';
        return 'F';
    }

    private getWeekNumber(date: Date): number {
        const startDate = new Date(date.getFullYear(), 0, 1);
        const days = Math.floor((date.getTime() - startDate.getTime()) / 86400000);
        return Math.ceil((days + startDate.getDay() + 1) / 7);
    }

    async getAtRiskStudents(schoolId: string, classId?: string, timeframe?: string): Promise<AtRiskStudent[]> {
        const gradeConfig = await this.getActiveGradeConfig(schoolId);
        const passMark = gradeConfig.pass_mark;

        const students = await this.studentRepository.find({
            where: {
                schoolId: schoolId,
                ...(classId ? { class: { id: classId } } : {}),
            },
            relations: ['class'],
        });

        const atRiskStudents: AtRiskStudent[] = [];

        for (const student of students) {
            const assessments = await this.assessmentRepository.find({
                where: { student: { id: student.id } },
                relations: ['subject'],
                order: { createdAt: 'DESC' },
                take: 10,
            });

            const attendances = await this.attendanceRepository.find({
                where: { studentId: student.id },
                order: { date: 'DESC' },
                take: 30,
            });

            const validAssessments = assessments.filter(a => a.score !== null);

            const avgScore = validAssessments.length > 0
                ? validAssessments.reduce((sum, a) => sum + a.score!, 0) / validAssessments.length
                : 0;

            const attendanceRate = attendances.length > 0
                ? (attendances.filter(a => a.status === 'present').length / attendances.length) * 100
                : 100;

            let riskScore = 0;
            const factors: string[] = [];

            if (avgScore < passMark) {
                riskScore += 40;
                factors.push('low academic performance');
            } else if (avgScore < passMark + 15) {
                riskScore += 20;
                factors.push('below average performance');
            }

            if (attendanceRate < 70) {
                riskScore += 30;
                factors.push('poor attendance');
            } else if (attendanceRate < 85) {
                riskScore += 15;
                factors.push('inconsistent attendance');
            }

            const recentAssessments = validAssessments.slice(0, 3);
            let trend = 'stable';
            if (recentAssessments.length >= 3) {
                const recentAvg = recentAssessments[0].score!;
                const olderAvg = recentAssessments[2].score!;
                if (recentAvg > olderAvg) trend = 'improving';
                else if (recentAvg < olderAvg) trend = 'declining';
            }

            let riskLevel = 'low';
            if (riskScore >= 60) riskLevel = 'high';
            else if (riskScore >= 30) riskLevel = 'medium';

            const predictedGrade = this.calculatePredictedGrade(avgScore, trend, gradeConfig);

            atRiskStudents.push({
                id: student.id,
                name: student.name,
                examNumber: student.examNumber,
                class: student.class?.name || 'N/A',
                classId: student.class?.id || '',
                riskScore,
                riskLevel,
                factors,
                predictedGrade,
                currentAverage: Math.round(avgScore),
                attendanceRate: Math.round(attendanceRate),
                trend,
            });
        }

        return atRiskStudents.sort((a, b) => b.riskScore - a.riskScore);
    }

    async getClassPerformance(schoolId: string, timeframe?: string): Promise<ClassPerformance[]> {
        const gradeConfig = await this.getActiveGradeConfig(schoolId);
        const passMark = gradeConfig.pass_mark;

        const classes = await this.classRepository.find({
            where: { schoolId: schoolId },
            relations: ['students'],
        });
        const results: ClassPerformance[] = [];

        for (const cls of classes) {
            let totalScore = 0;
            let totalStudents = 0;
            let distinctionCount = 0;
            let passCount = 0;

            const subjectScores: Record<string, { total: number; count: number }> = {};

            for (const student of cls.students) {
                const assessments = await this.assessmentRepository.find({
                    where: { student: { id: student.id } },
                    relations: ['subject'],
                    order: { createdAt: 'DESC' },
                    take: 10,
                });

                const validAssessments = assessments.filter(a => a.score !== null);

                if (validAssessments.length > 0) {
                    const avgScore = validAssessments.reduce((sum, a) => sum + a.score!, 0) / validAssessments.length;
                    totalScore += avgScore;
                    totalStudents++;

                    if (avgScore >= 80) distinctionCount++;
                    if (avgScore >= passMark) passCount++;

                    for (const assessment of validAssessments) {
                        const subjectName = assessment.subject?.name || 'General';
                        if (!subjectScores[subjectName]) subjectScores[subjectName] = { total: 0, count: 0 };
                        subjectScores[subjectName].total += assessment.score!;
                        subjectScores[subjectName].count++;
                    }
                }
            }

            const averageScore = totalStudents > 0 ? Math.round(totalScore / totalStudents) : 0;
            const passRate = totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0;
            const distinctionRate = totalStudents > 0 ? Math.round((distinctionCount / totalStudents) * 100) : 0;

            let topSubject = 'N/A';
            let strugglingSubject = 'N/A';
            let highestScore = 0;
            let lowestScore = 100;

            for (const [subject, data] of Object.entries(subjectScores)) {
                const avg = data.total / data.count;
                if (avg > highestScore) {
                    highestScore = avg;
                    topSubject = subject;
                }
                if (avg < lowestScore) {
                    lowestScore = avg;
                    strugglingSubject = subject;
                }
            }

            results.push({
                classId: cls.id,
                className: cls.name,
                averageScore,
                passRate,
                distinctionRate,
                totalStudents: totalStudents,
                trend: 5,
                topSubject,
                strugglingSubject,
            });
        }

        return results;
    }

    async getSubjectPerformance(schoolId: string, timeframe?: string): Promise<SubjectPerformance[]> {
        const gradeConfig = await this.getActiveGradeConfig(schoolId);
        const passMark = gradeConfig.pass_mark;

        const assessments = await this.assessmentRepository.find({
            where: { student: { schoolId: schoolId } },
            relations: ['subject', 'student'],
            order: { createdAt: 'DESC' },
        });

        const validAssessments = assessments.filter(a => a.score !== null);

        const subjectMap = new Map<string, { total: number; count: number; passCount: number; distinctionCount: number }>();

        for (const assessment of validAssessments) {
            const subjectName = assessment.subject?.name || 'General';
            if (!subjectMap.has(subjectName)) {
                subjectMap.set(subjectName, { total: 0, count: 0, passCount: 0, distinctionCount: 0 });
            }

            const score = assessment.score!;
            const data = subjectMap.get(subjectName)!;
            data.total += score;
            data.count++;

            if (score >= passMark) data.passCount++;
            if (score >= 80) data.distinctionCount++;
        }

        const results: SubjectPerformance[] = [];
        for (const [name, data] of subjectMap.entries()) {
            results.push({
                subjectId: name.toLowerCase().replace(/\s/g, '-'),
                name,
                averageScore: Math.round(data.total / data.count),
                passRate: Math.round((data.passCount / data.count) * 100),
                distinctionRate: Math.round((data.distinctionCount / data.count) * 100),
                totalStudents: data.count,
                trend: 3,
            });
        }

        return results;
    }

    async getTrendData(schoolId: string, metric: string, timeframe: string, classId?: string): Promise<TrendData[]> {
        const trends: TrendData[] = [];

        const students = await this.studentRepository.find({
            where: {
                schoolId: schoolId,
                ...(classId ? { class: { id: classId } } : {}),
            },
            relations: ['class'],
        });

        if (students.length === 0) {
            return trends;
        }

        let startDate: Date;
        const now = new Date();
        let groupBy: 'day' | 'week' | 'month' = 'week';
        let numberOfPeriods = 4;

        switch (timeframe) {
            case 'week':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                groupBy = 'day';
                numberOfPeriods = 7;
                break;
            case 'month':
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 1);
                groupBy = 'week';
                numberOfPeriods = 4;
                break;
            case 'term':
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 3);
                groupBy = 'week';
                numberOfPeriods = 12;
                break;
            case 'year':
                startDate = new Date(now);
                startDate.setFullYear(now.getFullYear() - 1);
                groupBy = 'month';
                numberOfPeriods = 12;
                break;
            default:
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 1);
                groupBy = 'week';
                numberOfPeriods = 4;
        }

        const studentIds = students.map(s => s.id);

        const assessments = await this.assessmentRepository
            .createQueryBuilder('assessment')
            .leftJoinAndSelect('assessment.subject', 'subject')
            .leftJoinAndSelect('assessment.student', 'student')
            .where('assessment.studentId IN (:...studentIds)', { studentIds })
            .andWhere('assessment.createdAt >= :startDate', { startDate })
            .andWhere('assessment.score IS NOT NULL')
            .orderBy('assessment.createdAt', 'ASC')
            .getMany();

        if (assessments.length === 0) {
            return trends;
        }

        const periodMap = new Map<string, {
            totalScore: number;
            count: number;
            subjects: Map<string, { total: number; count: number }>
        }>();

        for (const assessment of assessments) {
            const date = new Date(assessment.createdAt);
            let periodKey: string;

            if (groupBy === 'day') {
                periodKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else if (groupBy === 'week') {
                const weekNumber = this.getWeekNumber(date);
                periodKey = `Week ${weekNumber}`;
            } else {
                periodKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            }

            if (!periodMap.has(periodKey)) {
                periodMap.set(periodKey, {
                    totalScore: 0,
                    count: 0,
                    subjects: new Map()
                });
            }

            const periodData = periodMap.get(periodKey)!;
            const score = assessment.score!;

            periodData.totalScore += score;
            periodData.count++;

            const subjectName = assessment.subject?.name || 'General';
            if (!periodData.subjects.has(subjectName)) {
                periodData.subjects.set(subjectName, { total: 0, count: 0 });
            }
            const subjectData = periodData.subjects.get(subjectName)!;
            subjectData.total += score;
            subjectData.count++;
        }

        const sortedPeriods = Array.from(periodMap.keys()).sort();

        for (const period of sortedPeriods) {
            const data = periodMap.get(period)!;
            const overall = data.count > 0 ? Math.round(data.totalScore / data.count) : 0;

            const subjects: Record<string, number> = {};
            for (const [name, subjectData] of data.subjects.entries()) {
                subjects[name] = Math.round(subjectData.total / subjectData.count);
            }

            trends.push({
                period,
                overall,
                subjects
            });
        }

        while (trends.length < numberOfPeriods) {
            trends.unshift({
                period: `${groupBy === 'day' ? 'Day' : groupBy === 'week' ? 'Week' : 'Month'} ${trends.length + 1}`,
                overall: 0,
                subjects: {}
            });
        }

        return trends.slice(-numberOfPeriods);
    }

    async getKeyMetrics(schoolId: string, timeframe?: string, classId?: string): Promise<any> {
        const gradeConfig = await this.getActiveGradeConfig(schoolId);
        const passMark = gradeConfig.pass_mark;

        const students = await this.studentRepository.find({
            where: {
                schoolId: schoolId,
                ...(classId ? { class: { id: classId } } : {}),
            },
            relations: ['class'],
        });

        let totalScore = 0;
        let totalStudents = 0;
        let distinctionCount = 0;
        let onTrackCount = 0;

        for (const student of students) {
            const assessments = await this.assessmentRepository.find({
                where: { student: { id: student.id } },
                order: { createdAt: 'DESC' },
                take: 10,
            });

            const validAssessments = assessments.filter(a => a.score !== null);

            if (validAssessments.length > 0) {
                const avgScore = validAssessments.reduce((sum, a) => sum + a.score!, 0) / validAssessments.length;
                totalScore += avgScore;
                totalStudents++;

                if (avgScore >= 80) distinctionCount++;
                if (avgScore >= passMark) onTrackCount++;
            }
        }

        const overallPerformance = totalStudents > 0 ? Math.round(totalScore / totalStudents) : 0;

        return {
            overallPerformance,
            performanceTrend: 5,
            studentsOnTrack: onTrackCount,
            studentsOnTrackPercentage: totalStudents > 0 ? Math.round((onTrackCount / totalStudents) * 100) : 0,
            studentsAtRisk: totalStudents - onTrackCount,
            distinctions: distinctionCount,
            distinctionsTrend: 8,
            targetAchievement: Math.min(100, Math.round((overallPerformance / 75) * 100)),
        };
    }

    async getPredictionSummary(schoolId: string, timeframe?: string): Promise<any> {
        const gradeConfig = await this.getActiveGradeConfig(schoolId);
        const passMark = gradeConfig.pass_mark;

        const students = await this.studentRepository.find({
            where: { schoolId: schoolId }
        });
        let improving = 0;
        let declining = 0;
        let stable = 0;

        for (const student of students) {
            const assessments = await this.assessmentRepository.find({
                where: { student: { id: student.id } },
                order: { createdAt: 'DESC' },
                take: 6,
            });

            const validAssessments = assessments.filter(a => a.score !== null);

            if (validAssessments.length >= 4) {
                const recent = validAssessments.slice(0, 2).reduce((sum, a) => sum + a.score!, 0) / 2;
                const older = validAssessments.slice(2, 4).reduce((sum, a) => sum + a.score!, 0) / 2;

                if (recent > older + 5) improving++;
                else if (recent < older - 5) declining++;
                else stable++;
            }
        }

        const total = improving + declining + stable;

        // Calculate predicted pass rate based on current performance
        let totalPassCount = 0;
        for (const student of students) {
            const assessments = await this.assessmentRepository.find({
                where: { student: { id: student.id } },
                take: 10,
            });
            const validAssessments = assessments.filter(a => a.score !== null);
            const avgScore = validAssessments.length > 0
                ? validAssessments.reduce((sum, a) => sum + a.score!, 0) / validAssessments.length
                : 0;
            if (avgScore >= passMark) totalPassCount++;
        }
        const predictedPassRate = students.length > 0 ? Math.round((totalPassCount / students.length) * 100) : 0;

        return {
            predictedPassRate,
            studentsImproving: improving,
            studentsImprovingPercentage: total > 0 ? Math.round((improving / total) * 100) : 0,
            studentsDeclining: declining,
            studentsDecliningPercentage: total > 0 ? Math.round((declining / total) * 100) : 0,
            studentsStable: stable,
            studentsStablePercentage: total > 0 ? Math.round((stable / total) * 100) : 0,
            predictedDistinctions: Math.floor(students.length * 0.15),
        };
    }

    async getInterventionSummary(schoolId: string): Promise<any> {
        const gradeConfig = await this.getActiveGradeConfig(schoolId);
        const passMark = gradeConfig.pass_mark;

        const students = await this.studentRepository.find({
            where: { schoolId: schoolId }
        });
        const assessments = await this.assessmentRepository.find({
            where: { student: { schoolId: schoolId } },
            relations: ['student'],
        });

        let needsSupport = 0;
        let honorRoll = 0;

        for (const student of students) {
            const studentAssessments = assessments.filter(a => a.student?.id === student.id && a.score !== null);
            const avgScore = studentAssessments.length > 0
                ? studentAssessments.reduce((sum, a) => sum + a.score!, 0) / studentAssessments.length
                : 0;

            if (avgScore < passMark) needsSupport++;
            if (avgScore >= 80) honorRoll++;
        }

        return {
            studentsNeedingSupport: needsSupport,
            honorRollCount: honorRoll,
            chronicAbsenteeism: 12,
        };
    }

    async generatePredictions(schoolId: string): Promise<any> {
        const gradeConfig = await this.getActiveGradeConfig(schoolId);
        const passMark = gradeConfig.pass_mark;

        const students = await this.studentRepository.find({
            where: { schoolId: schoolId },
            relations: ['class']
        });

        for (const student of students) {
            const assessments = await this.assessmentRepository.find({
                where: { student: { id: student.id } },
                order: { createdAt: 'DESC' },
            });

            const validAssessments = assessments.filter(a => a.score !== null);

            const avgScore = validAssessments.length > 0
                ? validAssessments.reduce((sum, a) => sum + a.score!, 0) / validAssessments.length
                : 0;

            let riskScore = 0;
            const factors: string[] = [];

            if (avgScore < passMark) {
                riskScore += 40;
                factors.push('low academic performance');
            } else if (avgScore < passMark + 15) {
                riskScore += 20;
                factors.push('below average performance');
            }

            let riskLevel = 'low';
            if (riskScore >= 60) riskLevel = 'high';
            else if (riskScore >= 30) riskLevel = 'medium';

            const predictedGrade = this.calculatePredictedGrade(avgScore, 'stable', gradeConfig);

            await this.analyticsRepository.upsert(
                {
                    studentId: student.id,
                    studentName: student.name,
                    examNumber: student.examNumber,
                    classId: student.class?.id,
                    className: student.class?.name,
                    academicScore: avgScore,
                    riskScore,
                    riskLevel,
                    riskFactors: factors,
                    predictedGrade,
                    predictionGeneratedAt: new Date(),
                },
                ['studentId'],
            );
        }

        return { generatedAt: new Date(), totalStudents: students.length };
    }

    async exportReport(schoolId: string, format: string, timeframe?: string, classId?: string): Promise<{ buffer: Buffer; filename: string }> {
        const data = {
            atRisk: await this.getAtRiskStudents(schoolId, classId, timeframe),
            classPerformance: await this.getClassPerformance(schoolId, timeframe),
            subjectPerformance: await this.getSubjectPerformance(schoolId, timeframe),
            metrics: await this.getKeyMetrics(schoolId, timeframe, classId),
            predictions: await this.getPredictionSummary(schoolId, timeframe),
            interventions: await this.getInterventionSummary(schoolId),
            generatedAt: new Date().toISOString(),
        };

        const jsonString = JSON.stringify(data, null, 2);
        const buffer = Buffer.from(jsonString);
        const filename = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;

        return { buffer, filename };
    }
}


// // src/modules/analytics/analytics.service.ts
// import { Injectable } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { AnalyticsData } from './entities/analytics.entity';
// import { Student } from '../students/entities/student.entity';
// import { Assessment } from '../students/entities/assessment.entity';
// import { Attendance } from '../attendance/entities/attendance.entity';
// import { Class } from '../students/entities/class.entity';
// import { Subject } from '../students/entities/subject.entity';


// export interface AtRiskStudent {
//     id: string;
//     name: string;
//     examNumber: string;
//     class: string;
//     classId: string;
//     riskScore: number;
//     riskLevel: string;
//     factors: string[];
//     predictedGrade: string;
//     currentAverage: number;
//     attendanceRate: number;
//     trend: string;
// }

// export interface ClassPerformance {
//     classId: string;
//     className: string;
//     averageScore: number;
//     passRate: number;
//     distinctionRate: number;
//     totalStudents: number;
//     trend: number;
//     topSubject: string;
//     strugglingSubject: string;
// }

// export interface SubjectPerformance {
//     subjectId: string;
//     name: string;
//     averageScore: number;
//     passRate: number;
//     distinctionRate: number;
//     totalStudents: number;
//     trend: number;
// }

// export interface TrendData {
//     period: string;
//     overall: number;
//     subjects: Record<string, number>;
// }

// @Injectable()
// export class AnalyticsService {
//     constructor(
//         @InjectRepository(AnalyticsData)
//         private analyticsRepository: Repository<AnalyticsData>,
//         @InjectRepository(Student)
//         private studentRepository: Repository<Student>,
//         @InjectRepository(Assessment)
//         private assessmentRepository: Repository<Assessment>,
//         @InjectRepository(Attendance)
//         private attendanceRepository: Repository<Attendance>,
//         @InjectRepository(Class)
//         private classRepository: Repository<Class>,
//         @InjectRepository(Subject)
//         private subjectRepository: Repository<Subject>,
//     ) { }

//     async getAtRiskStudents(classId?: string, timeframe?: string): Promise<AtRiskStudent[]> {
//         const students = await this.studentRepository.find({
//             where: classId ? { class: { id: classId } } : {},
//             relations: ['class'],
//         });

//         const atRiskStudents: AtRiskStudent[] = [];

//         for (const student of students) {
//             const assessments = await this.assessmentRepository.find({
//                 where: { student: { id: student.id } },
//                 relations: ['subject'],
//                 order: { createdAt: 'DESC' },
//                 take: 10,
//             });

//             const attendances = await this.attendanceRepository.find({
//                 where: { studentId: student.id },
//                 order: { date: 'DESC' },
//                 take: 30,
//             });

//             const validAssessments = assessments.filter(a => a.score !== null);

//             const avgScore = validAssessments.length > 0
//                 ? validAssessments.reduce((sum, a) => sum + a.score!, 0) / validAssessments.length
//                 : 0;

//             const attendanceRate = attendances.length > 0
//                 ? (attendances.filter(a => a.status === 'present').length / attendances.length) * 100
//                 : 100;

//             let riskScore = 0;
//             const factors: string[] = [];

//             if (avgScore < 50) {
//                 riskScore += 40;
//                 factors.push('low academic performance');
//             } else if (avgScore < 65) {
//                 riskScore += 20;
//                 factors.push('below average performance');
//             }

//             if (attendanceRate < 70) {
//                 riskScore += 30;
//                 factors.push('poor attendance');
//             } else if (attendanceRate < 85) {
//                 riskScore += 15;
//                 factors.push('inconsistent attendance');
//             }

//             const recentAssessments = validAssessments.slice(0, 3);
//             let trend = 'stable';
//             if (recentAssessments.length >= 3) {
//                 const recentAvg = recentAssessments[0].score!;
//                 const olderAvg = recentAssessments[2].score!;
//                 if (recentAvg > olderAvg) trend = 'improving';
//                 else if (recentAvg < olderAvg) trend = 'declining';
//             }

//             let riskLevel = 'low';
//             if (riskScore >= 60) riskLevel = 'high';
//             else if (riskScore >= 30) riskLevel = 'medium';

//             const predictedGrade = this.calculatePredictedGrade(avgScore, trend);

//             atRiskStudents.push({
//                 id: student.id,
//                 name: student.name,
//                 examNumber: student.examNumber,
//                 class: student.class?.name || 'N/A',
//                 classId: student.class?.id || '',
//                 riskScore,
//                 riskLevel,
//                 factors,
//                 predictedGrade,
//                 currentAverage: Math.round(avgScore),
//                 attendanceRate: Math.round(attendanceRate),
//                 trend,
//             });
//         }

//         return atRiskStudents.sort((a, b) => b.riskScore - a.riskScore);
//     }

//     async getClassPerformance(timeframe?: string): Promise<ClassPerformance[]> {
//         const classes = await this.classRepository.find({ relations: ['students'] });
//         const results: ClassPerformance[] = [];

//         for (const cls of classes) {
//             let totalScore = 0;
//             let totalStudents = 0;
//             let distinctionCount = 0;
//             let passCount = 0;

//             const subjectScores: Record<string, { total: number; count: number }> = {};

//             for (const student of cls.students) {
//                 const assessments = await this.assessmentRepository.find({
//                     where: { student: { id: student.id } },
//                     relations: ['subject'],
//                     order: { createdAt: 'DESC' },
//                     take: 10,
//                 });

//                 const validAssessments = assessments.filter(a => a.score !== null);

//                 if (validAssessments.length > 0) {
//                     const avgScore = validAssessments.reduce((sum, a) => sum + a.score!, 0) / validAssessments.length;
//                     totalScore += avgScore;
//                     totalStudents++;

//                     if (avgScore >= 75) distinctionCount++;
//                     if (avgScore >= 50) passCount++;

//                     for (const assessment of validAssessments) {
//                         const subjectName = assessment.subject?.name || 'General';
//                         if (!subjectScores[subjectName]) subjectScores[subjectName] = { total: 0, count: 0 };
//                         subjectScores[subjectName].total += assessment.score!;
//                         subjectScores[subjectName].count++;
//                     }
//                 }
//             }

//             const averageScore = totalStudents > 0 ? Math.round(totalScore / totalStudents) : 0;
//             const passRate = totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0;
//             const distinctionRate = totalStudents > 0 ? Math.round((distinctionCount / totalStudents) * 100) : 0;

//             let topSubject = 'N/A';
//             let strugglingSubject = 'N/A';
//             let highestScore = 0;
//             let lowestScore = 100;

//             for (const [subject, data] of Object.entries(subjectScores)) {
//                 const avg = data.total / data.count;
//                 if (avg > highestScore) {
//                     highestScore = avg;
//                     topSubject = subject;
//                 }
//                 if (avg < lowestScore) {
//                     lowestScore = avg;
//                     strugglingSubject = subject;
//                 }
//             }

//             results.push({
//                 classId: cls.id,
//                 className: cls.name,
//                 averageScore,
//                 passRate,
//                 distinctionRate,
//                 totalStudents: totalStudents,
//                 trend: 5,
//                 topSubject,
//                 strugglingSubject,
//             });
//         }

//         return results;
//     }

//     async getSubjectPerformance(timeframe?: string): Promise<SubjectPerformance[]> {
//         const assessments = await this.assessmentRepository.find({
//             relations: ['subject', 'student'],
//             order: { createdAt: 'DESC' },
//         });

//         const validAssessments = assessments.filter(a => a.score !== null);

//         const subjectMap = new Map<string, { total: number; count: number; passCount: number; distinctionCount: number }>();

//         for (const assessment of validAssessments) {
//             const subjectName = assessment.subject?.name || 'General';
//             if (!subjectMap.has(subjectName)) {
//                 subjectMap.set(subjectName, { total: 0, count: 0, passCount: 0, distinctionCount: 0 });
//             }

//             const score = assessment.score!;
//             const data = subjectMap.get(subjectName)!;
//             data.total += score;
//             data.count++;

//             if (score >= 50) data.passCount++;
//             if (score >= 75) data.distinctionCount++;
//         }

//         const results: SubjectPerformance[] = [];
//         for (const [name, data] of subjectMap.entries()) {
//             results.push({
//                 subjectId: name.toLowerCase().replace(/\s/g, '-'),
//                 name,
//                 averageScore: Math.round(data.total / data.count),
//                 passRate: Math.round((data.passCount / data.count) * 100),
//                 distinctionRate: Math.round((data.distinctionCount / data.count) * 100),
//                 totalStudents: data.count,
//                 trend: 3,
//             });
//         }

//         return results;
//     }

//     async getTrendData(metric: string, timeframe: string, classId?: string): Promise<TrendData[]> {
//         const trends: TrendData[] = [];
//         const periods = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

//         for (const period of periods) {
//             trends.push({
//                 period,
//                 overall: Math.floor(Math.random() * 30) + 65,
//                 subjects: {
//                     Math: Math.floor(Math.random() * 30) + 60,
//                     English: Math.floor(Math.random() * 30) + 65,
//                     Science: Math.floor(Math.random() * 30) + 70,
//                 },
//             });
//         }

//         return trends;
//     }

//     async getKeyMetrics(timeframe?: string, classId?: string): Promise<any> {
//         const students = await this.studentRepository.find({
//             where: classId ? { class: { id: classId } } : {},
//             relations: ['class'],
//         });

//         let totalScore = 0;
//         let totalStudents = 0;
//         let distinctionCount = 0;
//         let onTrackCount = 0;

//         for (const student of students) {
//             const assessments = await this.assessmentRepository.find({
//                 where: { student: { id: student.id } },
//                 order: { createdAt: 'DESC' },
//                 take: 10,
//             });

//             const validAssessments = assessments.filter(a => a.score !== null);

//             if (validAssessments.length > 0) {
//                 const avgScore = validAssessments.reduce((sum, a) => sum + a.score!, 0) / validAssessments.length;
//                 totalScore += avgScore;
//                 totalStudents++;

//                 if (avgScore >= 75) distinctionCount++;
//                 if (avgScore >= 60) onTrackCount++;
//             }
//         }

//         const overallPerformance = totalStudents > 0 ? Math.round(totalScore / totalStudents) : 0;

//         return {
//             overallPerformance,
//             performanceTrend: 5,
//             studentsOnTrack: onTrackCount,
//             studentsOnTrackPercentage: totalStudents > 0 ? Math.round((onTrackCount / totalStudents) * 100) : 0,
//             studentsAtRisk: totalStudents - onTrackCount,
//             distinctions: distinctionCount,
//             distinctionsTrend: 8,
//             targetAchievement: Math.min(100, Math.round((overallPerformance / 75) * 100)),
//         };
//     }

//     async getPredictionSummary(timeframe?: string): Promise<any> {
//         const students = await this.studentRepository.find();
//         let improving = 0;
//         let declining = 0;
//         let stable = 0;

//         for (const student of students) {
//             const assessments = await this.assessmentRepository.find({
//                 where: { student: { id: student.id } },
//                 order: { createdAt: 'DESC' },
//                 take: 6,
//             });

//             const validAssessments = assessments.filter(a => a.score !== null);

//             if (validAssessments.length >= 4) {
//                 const recent = validAssessments.slice(0, 2).reduce((sum, a) => sum + a.score!, 0) / 2;
//                 const older = validAssessments.slice(2, 4).reduce((sum, a) => sum + a.score!, 0) / 2;

//                 if (recent > older + 5) improving++;
//                 else if (recent < older - 5) declining++;
//                 else stable++;
//             }
//         }

//         const total = improving + declining + stable;

//         return {
//             predictedPassRate: 78,
//             studentsImproving: improving,
//             studentsImprovingPercentage: total > 0 ? Math.round((improving / total) * 100) : 0,
//             studentsDeclining: declining,
//             studentsDecliningPercentage: total > 0 ? Math.round((declining / total) * 100) : 0,
//             studentsStable: stable,
//             studentsStablePercentage: total > 0 ? Math.round((stable / total) * 100) : 0,
//             predictedDistinctions: Math.floor(students.length * 0.15),
//         };
//     }

//     async getInterventionSummary(): Promise<any> {
//         const students = await this.studentRepository.find();
//         const assessments = await this.assessmentRepository.find({
//             relations: ['student'],
//         });

//         let needsSupport = 0;
//         let honorRoll = 0;

//         for (const student of students) {
//             const studentAssessments = assessments.filter(a => a.student?.id === student.id && a.score !== null);
//             const avgScore = studentAssessments.length > 0
//                 ? studentAssessments.reduce((sum, a) => sum + a.score!, 0) / studentAssessments.length
//                 : 0;

//             if (avgScore < 50) needsSupport++;
//             if (avgScore >= 85) honorRoll++;
//         }

//         return {
//             studentsNeedingSupport: needsSupport,
//             honorRollCount: honorRoll,
//             chronicAbsenteeism: 12,
//         };
//     }

//     async generatePredictions(): Promise<any> {
//         const students = await this.studentRepository.find({ relations: ['class'] });

//         for (const student of students) {
//             const assessments = await this.assessmentRepository.find({
//                 where: { student: { id: student.id } },
//                 order: { createdAt: 'DESC' },
//             });

//             const validAssessments = assessments.filter(a => a.score !== null);

//             const avgScore = validAssessments.length > 0
//                 ? validAssessments.reduce((sum, a) => sum + a.score!, 0) / validAssessments.length
//                 : 0;

//             let riskScore = 0;
//             const factors: string[] = [];

//             if (avgScore < 50) {
//                 riskScore += 40;
//                 factors.push('low academic performance');
//             } else if (avgScore < 65) {
//                 riskScore += 20;
//                 factors.push('below average performance');
//             }

//             let riskLevel = 'low';
//             if (riskScore >= 60) riskLevel = 'high';
//             else if (riskScore >= 30) riskLevel = 'medium';

//             const predictedGrade = this.calculatePredictedGrade(avgScore, 'stable');

//             await this.analyticsRepository.upsert(
//                 {
//                     studentId: student.id,
//                     studentName: student.name,
//                     examNumber: student.examNumber,
//                     classId: student.class?.id,
//                     className: student.class?.name,
//                     academicScore: avgScore,
//                     riskScore,
//                     riskLevel,
//                     riskFactors: factors,
//                     predictedGrade,
//                     predictionGeneratedAt: new Date(),
//                 },
//                 ['studentId'],
//             );
//         }

//         return { generatedAt: new Date(), totalStudents: students.length };
//     }

//     async exportReport(format: string, timeframe?: string, classId?: string): Promise<{ buffer: Buffer; filename: string }> {
//         const data = {
//             atRisk: await this.getAtRiskStudents(classId, timeframe),
//             classPerformance: await this.getClassPerformance(timeframe),
//             subjectPerformance: await this.getSubjectPerformance(timeframe),
//             metrics: await this.getKeyMetrics(timeframe, classId),
//             predictions: await this.getPredictionSummary(timeframe),
//             interventions: await this.getInterventionSummary(),
//             generatedAt: new Date().toISOString(),
//         };

//         const jsonString = JSON.stringify(data, null, 2);
//         const buffer = Buffer.from(jsonString);
//         const filename = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;

//         return { buffer, filename };
//     }

//     private calculatePredictedGrade(avgScore: number, trend: string): string {
//         let predicted = avgScore;
//         if (trend === 'improving') predicted += 5;
//         if (trend === 'declining') predicted -= 5;

//         if (predicted >= 80) return 'A';
//         if (predicted >= 70) return 'B';
//         if (predicted >= 60) return 'C';
//         if (predicted >= 50) return 'D';
//         return 'E';
//     }
// }