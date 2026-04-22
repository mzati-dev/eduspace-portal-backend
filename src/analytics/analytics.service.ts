// src/analytics/analytics.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Student } from '../students/entities/student.entity';
import { Assessment } from '../students/entities/assessment.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Class } from '../students/entities/class.entity';
import { Subject } from '../students/entities/subject.entity';
import { GradeConfig } from '../students/entities/grade-config.entity';
import { ReportCard } from '../students/entities/report-card.entity';
import { Archive } from '../students/entities/archive.entity';
import { TeacherClassSubject } from '../teachers/entities/teacher-class-subject.entity';

// ========== TYPES ==========
export interface KeyMetric {
    label: string;
    value: string | number;
    change: number;
    vsText: string;
    icon: string;
    color: string;
}

export interface GradeRanking {
    rank: number;
    name: string;
    passRate: number;
    avgScore: number;
    attendance: number;
    riskStudents: number;
    riskChange: number;
    trend: number;
}

export interface FactorAnalysis {
    factor: string;
    correlation: number;
    impact: string;
    insight: string;
}

export interface RiskStudent {
    id: string;
    name: string;
    examNumber: string;
    grade: string;
    attendance: number;
    catScore: number;
    fails: number;
    prevDrop: number;
    riskLevel: 'critical' | 'high' | 'medium' | 'low';
}

export interface SubjectDifficulty {
    rank: number;
    name: string;
    avgScore: number;
    passRate: number;
    correlation: number;
    action: string;
}

export interface ExamGap {
    grade: string;
    avgCAT: number;
    avgExam: number;
    gap: number;
    studentsDrop: number;
}

export interface CohortTracking {
    cohort: string;
    data: number[];
    labels: string[];
    improving: number;
    declining: number;
    currentRate: number;
}

export interface StudentTimeline {
    term: string;
    marks: number;
    attendance: number;
}

export interface StudentFactorBreakdown {
    factor: string;
    studentValue: string;
    classAvg: string;
    status: string;
    impact: string;
}

export interface StudentSubjectBreakdown {
    subject: string;
    marks: number;
    attendance: number;
    classAvg: number;
    gap: number;
    status: string;
}

export interface StudentHistorical {
    term: string;
    attendance: number;
    marks: number;
    cat: number;
    exam: number;
    fails: number;
    score: number;
    status: string;
}

export interface StudentDetail {
    id: string;
    name: string;
    examNumber: string;
    grade: string;
    status: string;
    classTeacher: string;
    currentMarks: number;
    currentAttendance: number;
    termOverTerm: number;
    classRank: string;
    timeline: StudentTimeline[];
    factorBreakdown: StudentFactorBreakdown[];
    subjectBreakdown: StudentSubjectBreakdown[];
    historical: StudentHistorical[];
    recommendations: string[];
}

export interface CompareDepartment {
    name: string;
    passRate1: number;
    passRate2: number;
    change: number;
    status: string;
}

export interface CompareRiskStudent {
    name: string;
    grade: string;
    att1: number;
    att2: number;
    marks1: number;
    marks2: number;
    drop: number;
}

export interface CompareData {
    term1: string;
    term2: string;
    overallPass1: number;
    overallPass2: number;
    avgScore1: number;
    avgScore2: number;
    avgAttendance1: number;
    avgAttendance2: number;
    departments: CompareDepartment[];
    newRiskStudents: CompareRiskStudent[];
}

export interface DashboardData {
    keyMetrics: KeyMetric[];
    gradeRanking: GradeRanking[];
    factorAnalysis: FactorAnalysis[];
    riskStudents: RiskStudent[];
    subjectDifficulty: SubjectDifficulty[];
    examGap: ExamGap[];
    cohortTracking: CohortTracking | null;
}

// Teacher Analytics Types
export interface TeacherKeyMetric extends KeyMetric { }
export interface TeacherClassRanking extends GradeRanking { }
export interface TeacherFactorAnalysis extends FactorAnalysis { }
export interface TeacherRiskStudent {
    id: string;
    name: string;
    examNumber: string;
    className: string;
    attendance: number;
    catScore: number;
    fails: number;
    prevDrop: number;
    riskLevel: 'critical' | 'high' | 'medium' | 'low';
}
export interface TeacherSubjectDifficulty extends SubjectDifficulty { }
export interface TeacherExamGap {
    className: string;
    avgCAT: number;
    avgExam: number;
    gap: number;
    studentsDrop: number;
}
export interface TeacherCohortTracking extends CohortTracking { }
export interface TeacherStudentDetail {
    id: string;
    name: string;
    examNumber: string;
    className: string;
    status: string;
    classTeacher: string;
    currentMarks: number;
    currentAttendance: number;
    termOverTerm: number;
    classRank: string;
    timeline: StudentTimeline[];
    factorBreakdown: StudentFactorBreakdown[];
    subjectBreakdown: StudentSubjectBreakdown[];
    historical: StudentHistorical[];
    recommendations: string[];
}
export interface TeacherCompareData extends CompareData { }

@Injectable()
export class AnalyticsService {
    constructor(
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
        @InjectRepository(ReportCard)
        private reportCardRepository: Repository<ReportCard>,
        @InjectRepository(Archive)
        private archiveRepository: Repository<Archive>,
        @InjectRepository(TeacherClassSubject)
        private teacherClassSubjectRepository: Repository<TeacherClassSubject>,
    ) { }

    private async getActiveGradeConfig(schoolId: string): Promise<GradeConfig> {
        const config = await this.gradeConfigRepository.findOne({
            where: { school_id: schoolId, is_active: true }
        });
        if (!config) {
            const defaultConfig = new GradeConfig();
            defaultConfig.pass_mark = 50;
            defaultConfig.calculation_method = 'average_all';
            defaultConfig.weight_qa1 = 33.33;
            defaultConfig.weight_qa2 = 33.33;
            defaultConfig.weight_end_of_term = 33.34;
            defaultConfig.school_id = schoolId;
            return defaultConfig;
        }
        return config;
    }

    private calculateFinalScore(subject: any, gradeConfig: GradeConfig): number {
        const qa1 = subject.qa1 || 0;
        const qa2 = subject.qa2 || 0;
        const endOfTerm = subject.endOfTerm || 0;
        const qa1Absent = subject.qa1_absent || false;
        const qa2Absent = subject.qa2_absent || false;
        const endOfTermAbsent = subject.endOfTerm_absent || false;

        if (endOfTermAbsent) return 0;

        switch (gradeConfig.calculation_method) {
            case 'average_all':
                let total = 0, count = 0;
                if (!qa1Absent) { total += qa1; count++; }
                if (!qa2Absent) { total += qa2; count++; }
                if (!endOfTermAbsent) { total += endOfTerm; count++; }
                return count > 0 ? total / count : 0;
            case 'end_of_term_only':
                return endOfTermAbsent ? 0 : endOfTerm;
            case 'weighted_average':
                let weightedTotal = 0, weightTotal = 0;
                if (!qa1Absent) {
                    weightedTotal += qa1 * (gradeConfig.weight_qa1 || 0);
                    weightTotal += gradeConfig.weight_qa1 || 0;
                }
                if (!qa2Absent) {
                    weightedTotal += qa2 * (gradeConfig.weight_qa2 || 0);
                    weightTotal += gradeConfig.weight_qa2 || 0;
                }
                if (!endOfTermAbsent) {
                    weightedTotal += endOfTerm * (gradeConfig.weight_end_of_term || 0);
                    weightTotal += gradeConfig.weight_end_of_term || 0;
                }
                return weightTotal > 0 ? weightedTotal / weightTotal : 0;
            default:
                return (qa1 + qa2 + endOfTerm) / 3;
        }
    }

    private calculateGrade(score: number, gradeConfig: GradeConfig, isAbsent?: boolean, className?: string): string {
        if (isAbsent) return 'AB';
        const passMark = gradeConfig.pass_mark;

        const isForm3Or4 = className && (
            className.includes('Form 3') || className.includes('Form 4') ||
            className.includes('Form3') || className.includes('Form4')
        );

        if (isForm3Or4) {
            if (score >= 80) return '1';
            if (score >= 75) return '2';
            if (score >= 70) return '3';
            if (score >= 65) return '4';
            if (score >= 60) return '5';
            if (score >= 55) return '6';
            if (score >= 51) return '7';
            if (score >= passMark) return '8';
            return '9';
        }

        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= passMark) return 'D';
        return 'F';
    }

    private async getStudentAssessmentsMap(studentId: string, classId: string) {
        const assessments = await this.assessmentRepository.find({
            where: { student: { id: studentId }, class: { id: classId } },
            relations: ['subject']
        });

        const subjectMap = new Map();
        for (const asm of assessments) {
            const subjectName = asm.subject?.name || 'Unknown';
            if (!subjectMap.has(subjectName)) {
                subjectMap.set(subjectName, {
                    qa1: 0, qa2: 0, endOfTerm: 0,
                    qa1_absent: false, qa2_absent: false, endOfTerm_absent: false
                });
            }
            const subject = subjectMap.get(subjectName);
            if (asm.assessmentType === 'qa1') {
                subject.qa1 = asm.score || 0;
                subject.qa1_absent = asm.isAbsent || false;
            } else if (asm.assessmentType === 'qa2') {
                subject.qa2 = asm.score || 0;
                subject.qa2_absent = asm.isAbsent || false;
            } else if (asm.assessmentType === 'end_of_term') {
                subject.endOfTerm = asm.score || 0;
                subject.endOfTerm_absent = asm.isAbsent || false;
            }
        }
        return subjectMap;
    }

    // ========== HELPER METHODS FOR CALCULATIONS ==========

    private async calculateSubjectDifficulty(schoolId: string, term: string): Promise<SubjectDifficulty[]> {
        const classes = await this.classRepository.find({
            where: { schoolId, term },
            relations: ['students']
        });

        const subjectStats = new Map<string, { totalScore: number; count: number; passCount: number }>();

        for (const cls of classes) {
            for (const student of cls.students) {
                const subjectMap = await this.getStudentAssessmentsMap(student.id, cls.id);
                for (const [subjectName, subjectData] of subjectMap) {
                    const finalScore = this.calculateFinalScore(subjectData, await this.getActiveGradeConfig(schoolId));
                    if (!subjectStats.has(subjectName)) {
                        subjectStats.set(subjectName, { totalScore: 0, count: 0, passCount: 0 });
                    }
                    const stats = subjectStats.get(subjectName)!;
                    stats.totalScore += finalScore;
                    stats.count++;
                    if (finalScore >= 50) stats.passCount++;
                }
            }
        }

        const results: SubjectDifficulty[] = [];
        for (const [name, stats] of subjectStats.entries()) {
            const avgScore = stats.count > 0 ? stats.totalScore / stats.count : 0;
            const passRate = stats.count > 0 ? (stats.passCount / stats.count) * 100 : 0;
            results.push({
                rank: 0,
                name,
                avgScore: Math.round(avgScore),
                passRate: Math.round(passRate),
                correlation: 0,
                action: avgScore < 50 ? '⚠️ High attention' : avgScore < 65 ? 'Review teaching' : '✅ Low intervention'
            });
        }

        results.sort((a, b) => a.avgScore - b.avgScore);
        results.forEach((r, i) => r.rank = i + 1);
        return results;
    }

    private async calculateExamGap(schoolId: string, term: string): Promise<ExamGap[]> {
        const classes = await this.classRepository.find({
            where: { schoolId, term },
            relations: ['students']
        });

        const gaps: ExamGap[] = [];

        for (const cls of classes) {
            let totalCAT = 0;
            let totalExam = 0;
            let studentCount = 0;
            let studentsDrop = 0;

            for (const student of cls.students) {
                const assessments = await this.assessmentRepository.find({
                    where: { student: { id: student.id }, class: { id: cls.id } },
                    relations: ['subject']
                });

                let catScore = 0;
                let examScore = 0;
                let catCount = 0;
                let examCount = 0;

                for (const asm of assessments) {
                    if (asm.assessmentType === 'qa1' || asm.assessmentType === 'qa2') {
                        if (asm.score) {
                            catScore += asm.score;
                            catCount++;
                        }
                    } else if (asm.assessmentType === 'end_of_term') {
                        if (asm.score) {
                            examScore += asm.score;
                            examCount++;
                        }
                    }
                }

                const avgCAT = catCount > 0 ? catScore / catCount : 0;
                const avgExam = examCount > 0 ? examScore / examCount : 0;

                if (avgCAT > 0 && avgExam > 0) {
                    totalCAT += avgCAT;
                    totalExam += avgExam;
                    studentCount++;
                    if (avgCAT - avgExam > 15) studentsDrop++;
                }
            }

            gaps.push({
                grade: cls.name,
                avgCAT: studentCount > 0 ? Math.round(totalCAT / studentCount) : 0,
                avgExam: studentCount > 0 ? Math.round(totalExam / studentCount) : 0,
                gap: studentCount > 0 ? Math.round((totalCAT - totalExam) / studentCount) : 0,
                studentsDrop
            });
        }

        return gaps;
    }

    // ========== ADMIN ANALYTICS ==========

    async getDashboardAnalytics(term: string, schoolId: string, classId?: string): Promise<DashboardData> {
        const gradeConfig = await this.getActiveGradeConfig(schoolId);

        // Check if this term exists in archives
        const archives = await this.archiveRepository.find({
            where: { schoolId, term },
            order: { archivedAt: 'DESC' }
        });

        // If archives exist, use archived data
        if (archives.length > 0) {
            return this.getDashboardAnalyticsFromArchives(archives, term, schoolId, classId, gradeConfig);
        }

        // Otherwise use current classes data
        const classes = await this.classRepository.find({
            where: { schoolId, term },
            relations: ['students']
        });

        const filteredClasses = classId ? classes.filter(c => c.id === classId) : classes;

        // Calculate grade ranking
        const gradeRanking: GradeRanking[] = [];
        let totalPassRate = 0;
        let totalAvgScore = 0;
        let totalAttendance = 0;
        let classCount = 0;

        for (const cls of filteredClasses) {
            let totalScore = 0;
            let passCount = 0;
            let totalAttendanceRate = 0;
            let studentCount = 0;
            let riskStudentCount = 0;

            for (const student of cls.students) {
                const subjectMap = await this.getStudentAssessmentsMap(student.id, cls.id);
                const subjects = Array.from(subjectMap.values());

                if (subjects.length > 0) {
                    let studentTotalScore = 0;
                    for (const subject of subjects) {
                        studentTotalScore += this.calculateFinalScore(subject, gradeConfig);
                    }
                    const avgScore = studentTotalScore / subjects.length;
                    totalScore += avgScore;
                    if (avgScore >= gradeConfig.pass_mark) passCount++;
                    studentCount++;

                    const attendances = await this.attendanceRepository.find({
                        where: { studentId: student.id, classId: cls.id }
                    });
                    const presentCount = attendances.filter(a => a.status === 'present' || a.status === 'late').length;
                    const rate = attendances.length > 0 ? (presentCount / attendances.length) * 100 : 100;
                    totalAttendanceRate += rate;

                    if (avgScore < gradeConfig.pass_mark - 10 || rate < 75) riskStudentCount++;
                }
            }

            const avgScore = studentCount > 0 ? totalScore / studentCount : 0;
            const passRate = studentCount > 0 ? (passCount / studentCount) * 100 : 0;
            const attendanceRate = studentCount > 0 ? totalAttendanceRate / studentCount : 0;

            totalPassRate += passRate;
            totalAvgScore += avgScore;
            totalAttendance += attendanceRate;
            classCount++;

            gradeRanking.push({
                rank: 0,
                name: cls.name,
                passRate: Math.round(passRate),
                avgScore: Math.round(avgScore),
                attendance: Math.round(attendanceRate),
                riskStudents: riskStudentCount,
                riskChange: 0,
                trend: 0
            });
        }

        gradeRanking.sort((a, b) => b.passRate - a.passRate);
        gradeRanking.forEach((g, i) => g.rank = i + 1);

        const overallPassRate = classCount > 0 ? Math.round(totalPassRate / classCount) : 0;
        const overallAvgScore = classCount > 0 ? Math.round(totalAvgScore / classCount) : 0;
        const totalStudents = filteredClasses.reduce((sum, c) => sum + c.students.length, 0);

        const keyMetrics: KeyMetric[] = [
            { label: 'Overall Pass %', value: `${overallPassRate}%`, change: 0, vsText: '', icon: 'trending-up', color: 'text-indigo-600' },
            { label: 'Average Score', value: `${overallAvgScore}%`, change: 0, vsText: '', icon: 'graduation-cap', color: 'text-emerald-600' },
            { label: 'Total Students', value: totalStudents, change: 0, vsText: '', icon: 'users', color: 'text-purple-600' },
            { label: 'Att-Perf Correlation', value: 'Calculating...', change: 0, vsText: '', icon: 'brain', color: 'text-amber-600' }
        ];

        const subjectDifficulty = await this.calculateSubjectDifficulty(schoolId, term);
        const examGap = await this.calculateExamGap(schoolId, term);

        // At Risk Students
        const riskStudents: RiskStudent[] = [];
        for (const cls of filteredClasses.slice(0, 3)) {
            for (const student of cls.students.slice(0, 5)) {
                const subjectMap = await this.getStudentAssessmentsMap(student.id, cls.id);
                const subjects = Array.from(subjectMap.values());
                let totalScore = 0;
                for (const subject of subjects) {
                    totalScore += this.calculateFinalScore(subject, gradeConfig);
                }
                const avgScore = subjects.length > 0 ? totalScore / subjects.length : 0;

                const attendances = await this.attendanceRepository.find({
                    where: { studentId: student.id, classId: cls.id }
                });
                const presentCount = attendances.filter(a => a.status === 'present' || a.status === 'late').length;
                const attendanceRate = attendances.length > 0 ? (presentCount / attendances.length) * 100 : 100;

                let riskLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';
                if (avgScore < gradeConfig.pass_mark - 20 || attendanceRate < 60) riskLevel = 'critical';
                else if (avgScore < gradeConfig.pass_mark - 10 || attendanceRate < 75) riskLevel = 'high';
                else if (avgScore < gradeConfig.pass_mark || attendanceRate < 85) riskLevel = 'medium';

                riskStudents.push({
                    id: student.id,
                    name: student.name,
                    examNumber: student.examNumber,
                    grade: cls.name,
                    attendance: Math.round(attendanceRate),
                    catScore: Math.round(avgScore),
                    fails: 0,
                    prevDrop: 0,
                    riskLevel
                });
            }
        }

        // Cohort Tracking from archives
        // Cohort Tracking from archives
        let cohortTracking: CohortTracking | null = null;
        const targetClassIds = classId ? [classId] : filteredClasses.map(c => c.id);
        const cohortArchives = await this.archiveRepository.find({
            where: { classId: In(targetClassIds) },
            order: { archivedAt: 'ASC' }
        });

        if (cohortArchives.length > 0) {
            const data: number[] = [];
            const labels: string[] = [];
            for (const archive of cohortArchives.slice(-6)) {
                const overallResults = archive.results?.overall;
                if (overallResults && overallResults.length > 0) {
                    const avgPassRate = overallResults.reduce((sum: number, s: any) => sum + (s.passRate || 0), 0) / overallResults.length;
                    data.push(Math.round(avgPassRate));
                    labels.push(archive.term);
                }
            }
            if (data.length > 0) {
                cohortTracking = {
                    cohort: `${filteredClasses[0]?.name || 'Class'} Cohort (${totalStudents} students)`,
                    data,
                    labels,
                    improving: 0,
                    declining: 0,
                    currentRate: overallPassRate
                };
            }
        }

        return {
            keyMetrics,
            gradeRanking,
            factorAnalysis: [],
            riskStudents: riskStudents.slice(0, 5),
            subjectDifficulty,
            examGap,
            cohortTracking
        };
    }

    private async getDashboardAnalyticsFromArchives(
        archives: Archive[],
        term: string,
        schoolId: string,
        classId: string | undefined,
        gradeConfig: GradeConfig
    ): Promise<DashboardData> {
        let filteredArchives = archives;
        if (classId) {
            filteredArchives = archives.filter(a => a.classId === classId);
        }

        const gradeRanking: GradeRanking[] = [];
        let totalPassRate = 0;
        let totalAvgScore = 0;
        let classCount = 0;
        let totalStudents = 0;

        for (const archive of filteredArchives) {
            const overallResults = archive.results?.overall || [];

            let passRate = 0;
            let avgScore = 0;
            let riskStudents = 0;

            if (overallResults.length > 0) {
                passRate = overallResults.reduce((sum: number, r: any) => sum + (r.passRate || 0), 0) / overallResults.length;
                avgScore = overallResults.reduce((sum: number, r: any) => sum + (r.average || 0), 0) / overallResults.length;
                riskStudents = overallResults.filter((r: any) => (r.average || 0) < gradeConfig.pass_mark).length;
            }

            gradeRanking.push({
                rank: 0,
                name: archive.className,
                passRate: Math.round(passRate),
                avgScore: Math.round(avgScore),
                attendance: 0,
                riskStudents: riskStudents,
                riskChange: 0,
                trend: 0
            });

            totalPassRate += passRate;
            totalAvgScore += avgScore;
            classCount++;
            totalStudents += archive.results?.metadata?.totalStudents || 0;
        }

        gradeRanking.sort((a, b) => b.passRate - a.passRate);
        gradeRanking.forEach((g, i) => g.rank = i + 1);

        const overallPassRate = classCount > 0 ? Math.round(totalPassRate / classCount) : 0;
        const overallAvgScore = classCount > 0 ? Math.round(totalAvgScore / classCount) : 0;

        const keyMetrics: KeyMetric[] = [
            { label: 'Overall Pass %', value: `${overallPassRate}%`, change: 0, vsText: '', icon: 'trending-up', color: 'text-indigo-600' },
            { label: 'Average Score', value: `${overallAvgScore}%`, change: 0, vsText: '', icon: 'graduation-cap', color: 'text-emerald-600' },
            { label: 'Total Students', value: totalStudents, change: 0, vsText: '', icon: 'users', color: 'text-purple-600' },
            { label: 'Att-Perf Correlation', value: 'N/A', change: 0, vsText: '', icon: 'brain', color: 'text-amber-600' }
        ];

        return {
            keyMetrics,
            gradeRanking,
            factorAnalysis: [],
            riskStudents: [],
            subjectDifficulty: [],
            examGap: [],
            cohortTracking: null
        };
    }


    async getStudentDetail(studentId: string, term: string, schoolId: string): Promise<StudentDetail> {
        const student = await this.studentRepository.findOne({
            where: { id: studentId, schoolId },
            relations: ['class', 'class.classTeacher']
        });
        if (!student) throw new NotFoundException('Student not found');

        const gradeConfig = await this.getActiveGradeConfig(schoolId);
        const subjectMap = await this.getStudentAssessmentsMap(student.id, student.class?.id || '');
        const subjects = Array.from(subjectMap.values());

        let totalScore = 0;
        for (const subject of subjects) {
            totalScore += this.calculateFinalScore(subject, gradeConfig);
        }
        const currentMarks = subjects.length > 0 ? Math.round(totalScore / subjects.length) : 0;

        const attendances = await this.attendanceRepository.find({
            where: { studentId: student.id, classId: student.class?.id }
        });
        const presentCount = attendances.filter(a => a.status === 'present' || a.status === 'late').length;
        const currentAttendance = attendances.length > 0 ? Math.round((presentCount / attendances.length) * 100) : 100;

        const reportCard = await this.reportCardRepository.findOne({
            where: { student: { id: student.id }, term }
        });

        const archives = await this.archiveRepository.find({
            where: { classId: student.class?.id }
        });

        const timeline: StudentTimeline[] = [];
        const historical: StudentHistorical[] = [];

        for (const archive of archives.slice(-4)) {
            const studentResult = archive.results?.overall?.find((r: any) => r.id === student.id);
            if (studentResult) {
                timeline.push({
                    term: archive.term,
                    marks: Math.round(studentResult.average || 0),
                    attendance: Math.round(studentResult.attendance || 0)
                });
                historical.push({
                    term: archive.term,
                    attendance: Math.round(studentResult.attendance || 0),
                    marks: Math.round(studentResult.average || 0),
                    cat: Math.round(studentResult.qa1Average || 0),
                    exam: Math.round(studentResult.endTermAverage || 0),
                    fails: 0,
                    score: Math.round(studentResult.average || 0) / 10,
                    status: (studentResult.average || 0) >= gradeConfig.pass_mark ? 'Pass' : 'Fail'
                });
            }
        }

        const subjectBreakdown: StudentSubjectBreakdown[] = [];
        for (const [name, subject] of subjectMap) {
            const finalScore = this.calculateFinalScore(subject, gradeConfig);
            subjectBreakdown.push({
                subject: name,
                marks: Math.round(finalScore),
                attendance: currentAttendance,
                classAvg: 0,
                gap: 0,
                status: finalScore >= gradeConfig.pass_mark ? 'On track' : 'Needs support'
            });
        }

        return {
            id: student.id,
            name: student.name,
            examNumber: student.examNumber,
            grade: student.class?.name || 'N/A',
            status: currentMarks >= gradeConfig.pass_mark ? 'On Track' : 'At Risk',
            classTeacher: student.class?.classTeacher?.name || 'Not assigned',
            currentMarks,
            currentAttendance,
            termOverTerm: 0,
            classRank: reportCard?.classRank ? `${reportCard.classRank}/${reportCard.totalStudents}` : 'N/A',
            timeline,
            factorBreakdown: [],
            subjectBreakdown,
            historical,
            recommendations: []
        };
    }

    async getCompareTermsData(term1: string, term2: string, schoolId: string, classId?: string): Promise<CompareData> {
        const classes = await this.classRepository.find({
            where: { schoolId },
            select: ['id']
        });
        const classIds = classes.map(c => c.id);

        const archives = await this.archiveRepository.find({
            where: { classId: In(classIds), term: In([term1, term2]) }
        });

        const archive1 = archives.find(a => a.term === term1);
        const archive2 = archives.find(a => a.term === term2);

        const results1 = archive1?.results?.overall || [];
        const results2 = archive2?.results?.overall || [];

        const filtered1 = classId ? results1.filter((r: any) => r.classId === classId) : results1;
        const filtered2 = classId ? results2.filter((r: any) => r.classId === classId) : results2;

        const overallPass1 = filtered1.length > 0 ? filtered1.reduce((sum: number, r: any) => sum + (r.passRate || 0), 0) / filtered1.length : 0;
        const overallPass2 = filtered2.length > 0 ? filtered2.reduce((sum: number, r: any) => sum + (r.passRate || 0), 0) / filtered2.length : 0;
        const avgScore1 = filtered1.length > 0 ? filtered1.reduce((sum: number, r: any) => sum + (r.average || 0), 0) / filtered1.length : 0;
        const avgScore2 = filtered2.length > 0 ? filtered2.reduce((sum: number, r: any) => sum + (r.average || 0), 0) / filtered2.length : 0;

        const schoolClasses = await this.classRepository.find({ where: { schoolId } });
        const departments: CompareDepartment[] = [];

        for (const cls of schoolClasses) {
            const archive1Class = archive1?.results?.overall?.find((r: any) => r.classId === cls.id);
            const archive2Class = archive2?.results?.overall?.find((r: any) => r.classId === cls.id);
            departments.push({
                name: cls.name,
                passRate1: archive1Class?.passRate || 0,
                passRate2: archive2Class?.passRate || 0,
                change: (archive2Class?.passRate || 0) - (archive1Class?.passRate || 0),
                status: (archive2Class?.passRate || 0) > (archive1Class?.passRate || 0) ? 'Improved' : 'Declined'
            });
        }

        return {
            term1,
            term2,
            overallPass1: Math.round(overallPass1),
            overallPass2: Math.round(overallPass2),
            avgScore1: Math.round(avgScore1),
            avgScore2: Math.round(avgScore2),
            avgAttendance1: 0,
            avgAttendance2: 0,
            departments,
            newRiskStudents: []
        };
    }

    async getGradeStudents(gradeName: string, term: string, schoolId: string): Promise<any[]> {
        const classEntity = await this.classRepository.findOne({
            where: { name: gradeName, schoolId, term },
            relations: ['students']
        });
        if (!classEntity) return [];

        const gradeConfig = await this.getActiveGradeConfig(schoolId);
        const studentsWithData: any[] = [];

        for (const student of classEntity.students) {
            const subjectMap = await this.getStudentAssessmentsMap(student.id, classEntity.id);
            const subjects = Array.from(subjectMap.values());
            let totalScore = 0;
            for (const subject of subjects) {
                totalScore += this.calculateFinalScore(subject, gradeConfig);
            }
            const currentMarks = subjects.length > 0 ? Math.round(totalScore / subjects.length) : 0;

            const attendances = await this.attendanceRepository.find({
                where: { studentId: student.id, classId: classEntity.id }
            });
            const presentCount = attendances.filter(a => a.status === 'present' || a.status === 'late').length;
            const attendanceRate = attendances.length > 0 ? Math.round((presentCount / attendances.length) * 100) : 100;

            let riskLevel = 'low';
            if (currentMarks < gradeConfig.pass_mark - 20 || attendanceRate < 60) riskLevel = 'critical';
            else if (currentMarks < gradeConfig.pass_mark - 10 || attendanceRate < 75) riskLevel = 'high';
            else if (currentMarks < gradeConfig.pass_mark || attendanceRate < 85) riskLevel = 'medium';

            studentsWithData.push({
                id: student.id,
                name: student.name,
                examNumber: student.examNumber,
                grade: gradeName,
                attendance: attendanceRate,
                catScore: currentMarks,
                fails: 0,
                currentMarks: currentMarks,
                riskLevel: riskLevel
            });
        }

        return studentsWithData;
    }

    async getAvailableTerms(schoolId: string): Promise<{ value: string; label: string }[]> {
        // Get terms from current classes
        const classes = await this.classRepository.find({
            where: { schoolId },
            select: ['term', 'academic_year']
        });

        // Get terms from archives - don't filter by existing classIds
        const archives = await this.archiveRepository.find({
            where: { schoolId },
            order: { archivedAt: 'DESC' }
        });

        const uniqueTerms = new Map<string, string>();

        // Add archive terms first
        for (const archive of archives) {
            const key = `${archive.term}, ${archive.academicYear}`;
            if (!uniqueTerms.has(key)) {
                uniqueTerms.set(key, key);
            }
        }

        // Add class terms
        for (const cls of classes) {
            const key = `${cls.term}, ${cls.academic_year}`;
            if (!uniqueTerms.has(key)) {
                uniqueTerms.set(key, key);
            }
        }

        return Array.from(uniqueTerms.keys()).map(key => ({
            value: key,
            label: key
        }));
    }

    // ========== TEACHER ANALYTICS ==========

    async getTeacherDashboardAnalytics(teacherId: string, term: string, schoolId: string, classId?: string): Promise<any> {
        const assignments = await this.teacherClassSubjectRepository.find({
            where: { teacherId },
            relations: ['class']
        });

        let classIds = [...new Set(assignments.map(a => a.classId))];
        const classTeacherClasses = await this.classRepository.find({
            where: { classTeacherId: teacherId }
        });
        for (const cls of classTeacherClasses) {
            if (!classIds.includes(cls.id)) classIds.push(cls.id);
        }

        if (classId) {
            if (!classIds.includes(classId)) throw new NotFoundException('Class not found for this teacher');
            classIds = [classId];
        }

        const classes = await this.classRepository.find({
            where: { id: In(classIds), term },
            relations: ['students']
        });

        const gradeConfig = await this.getActiveGradeConfig(schoolId);
        const classRanking: TeacherClassRanking[] = [];

        for (const cls of classes) {
            let totalScore = 0;
            let passCount = 0;
            let studentCount = 0;
            let riskStudentCount = 0;

            for (const student of cls.students) {
                const subjectMap = await this.getStudentAssessmentsMap(student.id, cls.id);
                const subjects = Array.from(subjectMap.values());
                if (subjects.length > 0) {
                    let studentTotalScore = 0;
                    for (const subject of subjects) {
                        studentTotalScore += this.calculateFinalScore(subject, gradeConfig);
                    }
                    const avgScore = studentTotalScore / subjects.length;
                    totalScore += avgScore;
                    if (avgScore >= gradeConfig.pass_mark) passCount++;
                    studentCount++;
                    if (avgScore < gradeConfig.pass_mark - 10) riskStudentCount++;
                }
            }

            const avgScore = studentCount > 0 ? totalScore / studentCount : 0;
            const passRate = studentCount > 0 ? (passCount / studentCount) * 100 : 0;

            classRanking.push({
                rank: 0,
                name: cls.name,
                passRate: Math.round(passRate),
                avgScore: Math.round(avgScore),
                attendance: 0,
                riskStudents: riskStudentCount,
                riskChange: 0,
                trend: 0
            });
        }

        classRanking.sort((a, b) => b.passRate - a.passRate);
        classRanking.forEach((c, i) => c.rank = i + 1);

        const totalStudents = classes.reduce((sum, c) => sum + c.students.length, 0);
        const overallPassRate = classRanking.length > 0 ? classRanking.reduce((sum, c) => sum + c.passRate, 0) / classRanking.length : 0;

        const keyMetrics: TeacherKeyMetric[] = [
            { label: 'Overall Pass %', value: `${Math.round(overallPassRate)}%`, change: 0, vsText: '', icon: 'trending-up', color: 'text-indigo-600' },
            { label: 'Average Score', value: `${Math.round(classRanking.reduce((sum, c) => sum + c.avgScore, 0) / (classRanking.length || 1))}%`, change: 0, vsText: '', icon: 'graduation-cap', color: 'text-emerald-600' },
            { label: 'Total Students', value: totalStudents, change: 0, vsText: '', icon: 'users', color: 'text-purple-600' },
            { label: 'Att-Perf Correlation', value: 'Calculating...', change: 0, vsText: '', icon: 'brain', color: 'text-amber-600' }
        ];

        return {
            keyMetrics,
            classRanking,
            factorAnalysis: [],
            riskStudents: [],
            subjectDifficulty: [],
            examGap: [],
            cohortTracking: null
        };
    }

    async getTeacherStudentDetail(studentId: string, term: string, schoolId: string): Promise<TeacherStudentDetail> {
        const student = await this.studentRepository.findOne({
            where: { id: studentId, schoolId },
            relations: ['class', 'class.classTeacher']
        });
        if (!student) throw new NotFoundException('Student not found');

        const gradeConfig = await this.getActiveGradeConfig(schoolId);
        const subjectMap = await this.getStudentAssessmentsMap(student.id, student.class?.id || '');
        const subjects = Array.from(subjectMap.values());

        let totalScore = 0;
        for (const subject of subjects) {
            totalScore += this.calculateFinalScore(subject, gradeConfig);
        }
        const currentMarks = subjects.length > 0 ? Math.round(totalScore / subjects.length) : 0;

        const attendances = await this.attendanceRepository.find({
            where: { studentId: student.id, classId: student.class?.id }
        });
        const presentCount = attendances.filter(a => a.status === 'present' || a.status === 'late').length;
        const currentAttendance = attendances.length > 0 ? Math.round((presentCount / attendances.length) * 100) : 100;

        const reportCard = await this.reportCardRepository.findOne({
            where: { student: { id: student.id }, term }
        });

        const subjectBreakdown: StudentSubjectBreakdown[] = [];
        for (const [name, subject] of subjectMap) {
            const finalScore = this.calculateFinalScore(subject, gradeConfig);
            subjectBreakdown.push({
                subject: name,
                marks: Math.round(finalScore),
                attendance: currentAttendance,
                classAvg: 0,
                gap: 0,
                status: finalScore >= gradeConfig.pass_mark ? 'On track' : 'Needs support'
            });
        }

        return {
            id: student.id,
            name: student.name,
            examNumber: student.examNumber,
            className: student.class?.name || 'N/A',
            status: currentMarks >= gradeConfig.pass_mark ? 'On Track' : 'At Risk',
            classTeacher: student.class?.classTeacher?.name || 'Not assigned',
            currentMarks,
            currentAttendance,
            termOverTerm: 0,
            classRank: reportCard?.classRank ? `${reportCard.classRank}/${reportCard.totalStudents}` : 'N/A',
            timeline: [],
            factorBreakdown: [],
            subjectBreakdown,
            historical: [],
            recommendations: []
        };
    }

    async getTeacherCompareTermsData(teacherId: string, term1: string, term2: string, schoolId: string, classId?: string): Promise<TeacherCompareData> {
        const assignments = await this.teacherClassSubjectRepository.find({
            where: { teacherId },
            relations: ['class']
        });

        let classIds = [...new Set(assignments.map(a => a.classId))];
        if (classId) {
            if (!classIds.includes(classId)) throw new NotFoundException('Class not found for this teacher');
            classIds = [classId];
        }

        const classes = await this.classRepository.find({
            where: { id: In(classIds) }
        });

        // Get archives for these classes
        const archives = await this.archiveRepository.find({
            where: { classId: In(classIds), term: In([term1, term2]) }
        });

        const departments: CompareDepartment[] = [];

        for (const cls of classes) {
            const archive1 = archives.find(a => a.classId === cls.id && a.term === term1);
            const archive2 = archives.find(a => a.classId === cls.id && a.term === term2);

            const passRate1 = archive1?.results?.overall?.[0]?.passRate || 0;
            const passRate2 = archive2?.results?.overall?.[0]?.passRate || 0;

            departments.push({
                name: cls.name,
                passRate1,
                passRate2,
                change: passRate2 - passRate1,
                status: passRate2 > passRate1 ? 'Improved' : passRate2 < passRate1 ? 'Declined' : 'Stable'
            });
        }

        const overallPass1 = departments.length > 0 ? departments.reduce((sum, d) => sum + d.passRate1, 0) / departments.length : 0;
        const overallPass2 = departments.length > 0 ? departments.reduce((sum, d) => sum + d.passRate2, 0) / departments.length : 0;

        return {
            term1,
            term2,
            overallPass1: Math.round(overallPass1),
            overallPass2: Math.round(overallPass2),
            avgScore1: 0,
            avgScore2: 0,
            avgAttendance1: 0,
            avgAttendance2: 0,
            departments,
            newRiskStudents: []
        };
    }

    async getTeacherGradeStudents(teacherId: string, className: string, term: string, schoolId: string): Promise<any[]> {
        const assignments = await this.teacherClassSubjectRepository.find({
            where: { teacherId },
            relations: ['class']
        });

        const classIds = assignments.map(a => a.classId);

        const classEntity = await this.classRepository.findOne({
            where: { id: In(classIds), name: className, term, schoolId },
            relations: ['students']
        });

        if (!classEntity) return [];

        const gradeConfig = await this.getActiveGradeConfig(schoolId);
        const studentsWithData: any[] = [];

        for (const student of classEntity.students) {
            const subjectMap = await this.getStudentAssessmentsMap(student.id, classEntity.id);
            const subjects = Array.from(subjectMap.values());
            let totalScore = 0;
            for (const subject of subjects) {
                totalScore += this.calculateFinalScore(subject, gradeConfig);
            }
            const currentMarks = subjects.length > 0 ? Math.round(totalScore / subjects.length) : 0;

            const attendances = await this.attendanceRepository.find({
                where: { studentId: student.id, classId: classEntity.id }
            });
            const presentCount = attendances.filter(a => a.status === 'present' || a.status === 'late').length;
            const attendanceRate = attendances.length > 0 ? Math.round((presentCount / attendances.length) * 100) : 100;

            let riskLevel = 'low';
            if (currentMarks < gradeConfig.pass_mark - 20 || attendanceRate < 60) riskLevel = 'critical';
            else if (currentMarks < gradeConfig.pass_mark - 10 || attendanceRate < 75) riskLevel = 'high';
            else if (currentMarks < gradeConfig.pass_mark || attendanceRate < 85) riskLevel = 'medium';

            studentsWithData.push({
                id: student.id,
                name: student.name,
                examNumber: student.examNumber,
                className: classEntity.name,
                attendance: attendanceRate,
                catScore: currentMarks,
                fails: 0,
                currentMarks: currentMarks,
                riskLevel: riskLevel
            });
        }

        return studentsWithData;
    }
}