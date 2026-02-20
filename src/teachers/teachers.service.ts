import { Injectable, ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Teacher } from './entities/teacher.entity';
import { TeacherClassSubject } from './entities/teacher-class-subject.entity';
import { Class } from '../students/entities/class.entity';
import { Subject } from '../students/entities/subject.entity';
import { Student } from '../students/entities/student.entity';
import { Assessment } from '../students/entities/assessment.entity'; // ADD THIS
import { ReportCard } from '../students/entities/report-card.entity'; // ADD THIS
import { GradeConfig } from '../students/entities/grade-config.entity'; // ADD THIS

@Injectable()
export class TeachersService {
    constructor(
        @InjectRepository(Teacher)
        private teachersRepo: Repository<Teacher>,

        @InjectRepository(TeacherClassSubject)
        private teacherClassSubjectRepo: Repository<TeacherClassSubject>,

        @InjectRepository(Class)
        private classRepo: Repository<Class>,

        @InjectRepository(Subject)
        private subjectRepo: Repository<Subject>,

        @InjectRepository(Student)
        private studentRepo: Repository<Student>,

        // ===== ADD THESE REPOSITORIES =====
        @InjectRepository(Assessment)
        private assessmentRepo: Repository<Assessment>,

        @InjectRepository(ReportCard)
        private reportCardRepo: Repository<ReportCard>,

        @InjectRepository(GradeConfig)
        private gradeConfigRepo: Repository<GradeConfig>,
        // ===== END ADD =====
    ) { }

    // ===== TEACHER AUTHENTICATION =====

    /**
     * Create a new teacher
     * @param name - Teacher's full name
     * @param email - Teacher's email (unique)
     * @param password - Plain text password (will be hashed)
     * @param schoolId - School ID from admin context
     */
    async createTeacher(name: string, email: string, password: string, schoolId: string) {
        // Check if email exists (globally for now)
        const existingTeacher = await this.teachersRepo.findOne({
            where: { email }
        });

        if (existingTeacher) {
            throw new ConflictException('A teacher with this email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create teacher
        const teacher = this.teachersRepo.create({
            name,
            email,
            password: hashedPassword,
            school_id: schoolId,
        });

        await this.teachersRepo.save(teacher);

        // Return exactly what frontend expects
        return {
            id: teacher.id,
            name: teacher.name,
            email: teacher.email,
            created_at: teacher.created_at
        };
    }

    /**
     * Get all teachers for a school
     * @param schoolId - School ID to filter by
     */
    async getTeachersBySchool(schoolId: string) {
        const teachers = await this.teachersRepo.find({
            where: { school_id: schoolId },
            order: { created_at: 'DESC' },
        });

        // Return exactly what frontend expects
        return teachers.map(teacher => ({
            id: teacher.id,
            name: teacher.name,
            email: teacher.email,
            created_at: teacher.created_at
        }));
    }

    /**
     * Find teacher by email (for login)
     * @param email - Teacher's email
     */
    async findTeacherByEmail(email: string) {
        return await this.teachersRepo.findOne({
            where: { email },
            select: ['id', 'name', 'email', 'password', 'school_id', 'is_active', 'created_at']
        });
    }

    /**
     * Delete a teacher
     * @param id - Teacher ID
     * @param schoolId - School ID for verification
     */
    async deleteTeacher(id: string, schoolId: string) {
        const result = await this.teachersRepo.delete({ id, school_id: schoolId });

        if (result.affected === 0) {
            throw new NotFoundException('Teacher not found');
        }

        return { message: 'Teacher deleted successfully' };
    }

    // ===== TEACHER ASSIGNMENTS (SUBJECTS IN CLASSES) =====

    /**
     * Assign teacher to teach a specific subject in a specific class
     * @param teacherId - Teacher ID
     * @param classId - Class ID
     * @param subjectId - Subject ID
     */
    async assignTeacherToClassSubject(teacherId: string, classId: string, subjectId: string) {
        // Check if assignment already exists
        const existing = await this.teacherClassSubjectRepo.findOne({
            where: { teacherId, classId, subjectId }
        });

        if (existing) {
            throw new ConflictException('Teacher is already assigned to this class and subject');
        }

        // Check if teacher exists
        const teacher = await this.teachersRepo.findOne({ where: { id: teacherId } });
        if (!teacher) {
            throw new NotFoundException('Teacher not found');
        }

        // Check if class exists
        const classExists = await this.classRepo.findOne({ where: { id: classId } });
        if (!classExists) {
            throw new NotFoundException('Class not found');
        }

        // Check if subject exists
        const subject = await this.subjectRepo.findOne({ where: { id: subjectId } });
        if (!subject) {
            throw new NotFoundException('Subject not found');
        }

        // Create new assignment
        const assignment = this.teacherClassSubjectRepo.create({
            teacherId,
            classId,
            subjectId
        });

        return this.teacherClassSubjectRepo.save(assignment);
    }

    /**
     * Get all assignments for a teacher
     * @param teacherId - Teacher ID
     */
    async getTeacherAssignments(teacherId: string) {
        return this.teacherClassSubjectRepo.find({
            where: { teacherId },
            relations: ['class', 'subject']
        });
    }

    /**
     * Get only classes assigned to a teacher (unique)
     * @param teacherId - Teacher ID
     */
    async getTeacherClasses(teacherId: string): Promise<Class[]> {
        const assignments = await this.teacherClassSubjectRepo.find({
            where: { teacherId },
            relations: ['class']
        }) as any[];

        const uniqueClasses: Class[] = [];
        const seenClassIds = new Set<string>();

        for (const assignment of assignments) {
            const classObj = assignment.class;
            if (classObj && !seenClassIds.has(classObj.id)) {
                seenClassIds.add(classObj.id);
                uniqueClasses.push(classObj);
            }
        }

        return uniqueClasses;
    }

    /**
     * Get only subjects assigned to a teacher (unique)
     * @param teacherId - Teacher ID
     */
    async getTeacherSubjects(teacherId: string): Promise<Subject[]> {
        const assignments = await this.teacherClassSubjectRepo.find({
            where: { teacherId },
            relations: ['subject']
        }) as any[];

        const uniqueSubjects: Subject[] = [];
        const seenSubjectIds = new Set<string>();

        for (const assignment of assignments) {
            const subjectObj = assignment.subject;
            if (subjectObj && !seenSubjectIds.has(subjectObj.id)) {
                seenSubjectIds.add(subjectObj.id);
                uniqueSubjects.push(subjectObj);
            }
        }

        return uniqueSubjects;
    }

    /**
     * Get students from classes assigned to a teacher
     * @param teacherId - Teacher ID
     */
    async getTeacherStudents(teacherId: string) {
        // Get teacher's assigned classes
        const assignments = await this.getTeacherAssignments(teacherId);
        const classIds = assignments.map(a => a.classId);

        if (classIds.length === 0) {
            return [];
        }

        // Use the class relationship, not classId field
        return this.studentRepo.find({
            where: { class: { id: In(classIds) } },
            relations: ['class']
        });
    }

    /**
     * Remove a teacher's assignment
     * @param teacherId - Teacher ID
     * @param classId - Class ID
     * @param subjectId - Subject ID
     */
    async removeTeacherAssignment(teacherId: string, classId: string, subjectId: string) {
        const result = await this.teacherClassSubjectRepo.delete({ teacherId, classId, subjectId });

        if (result.affected === 0) {
            throw new NotFoundException('Assignment not found');
        }
    }

    // ===== CLASS TEACHER METHODS =====

    /**
     * Assign a teacher as class teacher for a class
     * @param teacherId - Teacher ID
     * @param classId - Class ID
     */
    async assignClassTeacher(teacherId: string, classId: string) {
        // Check if teacher exists
        const teacher = await this.teachersRepo.findOne({ where: { id: teacherId } });
        if (!teacher) {
            throw new NotFoundException('Teacher not found');
        }

        // Check if class exists
        const classEntity = await this.classRepo.findOne({ where: { id: classId } });
        if (!classEntity) {
            throw new NotFoundException('Class not found');
        }

        // Check if teacher is already class teacher for another class
        const existingClassTeacher = await this.classRepo.findOne({
            where: { classTeacherId: teacherId, id: classId }
        });

        if (existingClassTeacher) {
            throw new ConflictException('This teacher is already class teacher for this class');
        }

        // Update the class with new class teacher
        classEntity.classTeacherId = teacherId;
        await this.classRepo.save(classEntity);

        return {
            message: 'Class teacher assigned successfully',
            teacherId,
            teacherName: teacher.name,
            classId,
            className: classEntity.name
        };
    }

    /**
     * Remove class teacher from a class
     * @param classId - Class ID
     */
    async removeClassTeacher(classId: string) {
        const classEntity = await this.classRepo.findOne({ where: { id: classId } });
        if (!classEntity) {
            throw new NotFoundException('Class not found');
        }

        if (!classEntity.classTeacherId) {
            throw new NotFoundException('No class teacher assigned to this class');
        }

        // Clear the class teacher
        classEntity.classTeacherId = undefined;
        await this.classRepo.save(classEntity);

        return { message: 'Class teacher removed successfully' };
    }

    /**
     * Get class teacher for a specific class
     * @param classId - Class ID
     */
    async getClassTeacher(classId: string) {
        const classEntity = await this.classRepo.findOne({
            where: { id: classId },
            relations: ['classTeacher']
        });

        if (!classEntity) {
            throw new NotFoundException('Class not found');
        }

        if (!classEntity.classTeacher) {
            return null;
        }

        return {
            id: classEntity.classTeacher.id,
            name: classEntity.classTeacher.name,
            email: classEntity.classTeacher.email
        };
    }

    /**
     * Check if teacher is class teacher for a class
     * @param teacherId - Teacher ID
     * @param classId - Class ID
     */
    async isClassTeacher(teacherId: string, classId: string): Promise<boolean> {
        const classEntity = await this.classRepo.findOne({
            where: { id: classId, classTeacherId: teacherId }
        });

        return !!classEntity;
    }

    // ===== STUDENT ASSESSMENT METHODS (WITH ZERO/AB HANDLING) =====

    /**
     * Get active grade configuration for a school
     * @param schoolId - School ID
     */
    async getActiveGradeConfiguration(schoolId?: string) {
        const query = this.gradeConfigRepo
            .createQueryBuilder('config')
            .where('config.is_active = true');

        if (schoolId) {
            query.andWhere('config.school_id = :schoolId', { schoolId });
        }

        const config = await query.getOne();

        if (!config) {
            // Return default config if none exists
            return {
                id: 'default',
                configuration_name: 'Default (Average of All)',
                calculation_method: 'average_all',
                weight_qa1: 33.33,
                weight_qa2: 33.33,
                weight_end_of_term: 33.34,
                pass_mark: 50,
                is_active: true,
                school_id: schoolId || null,
            };
        }

        return config;
    }

    /**
     * Calculate letter grade based on score
     * @param score - Numeric score (0-100)
     * @param gradeConfig - Grade configuration
     * @param isAbsent - Whether student was absent
     */
    calculateGrade(score: number, gradeConfig?: any, isAbsent?: boolean): string {
        // If student was absent, return 'AB'
        if (isAbsent) return 'AB';

        const passMark = gradeConfig?.pass_mark || 50;
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= passMark) return 'D';
        return 'F';
    }

    /**
     * Calculate final score based on configuration
     * @param subject - Subject with qa1, qa2, endOfTerm scores
     * @param gradeConfig - Grade configuration
     */
    calculateFinalScore(subject: any, gradeConfig: any): number {
        const qa1 = subject.qa1 || 0;
        const qa2 = subject.qa2 || 0;
        const endOfTerm = subject.endOfTerm || 0;

        // Get absent flags
        const qa1Absent = subject.qa1_absent || false;
        const qa2Absent = subject.qa2_absent || false;
        const endOfTermAbsent = subject.endOfTerm_absent || false;

        // If absent for end of term, final score is 0
        if (endOfTermAbsent) {
            return 0;
        }

        switch (gradeConfig.calculation_method) {
            case 'average_all':
                // Don't include absent assessments in average
                let total = 0;
                let count = 0;
                if (!qa1Absent) { total += qa1; count++; }
                if (!qa2Absent) { total += qa2; count++; }
                if (!endOfTermAbsent) { total += endOfTerm; count++; }
                return count > 0 ? total / count : 0;

            case 'end_of_term_only':
                // If absent, return 0
                return endOfTermAbsent ? 0 : endOfTerm;

            case 'weighted_average':
                // Only include non-absent assessments
                let weightedTotal = 0;
                let weightTotal = 0;
                if (!qa1Absent) {
                    weightedTotal += qa1 * gradeConfig.weight_qa1;
                    weightTotal += gradeConfig.weight_qa1;
                }
                if (!qa2Absent) {
                    weightedTotal += qa2 * gradeConfig.weight_qa2;
                    weightTotal += gradeConfig.weight_qa2;
                }
                if (!endOfTermAbsent) {
                    weightedTotal += endOfTerm * gradeConfig.weight_end_of_term;
                    weightTotal += gradeConfig.weight_end_of_term;
                }
                return weightTotal > 0 ? weightedTotal / weightTotal : 0;

            default:
                return (qa1 + qa2 + endOfTerm) / 3;
        }
    }

    /**
     * Get all assessments for a student (filtered by teacher's assigned subjects)
     * @param studentId - Student ID
     * @param teacherId - Teacher ID (for filtering)
     */
    async getStudentAssessments(studentId: string, teacherId?: string) {
        // Get student to verify school and class
        const student = await this.studentRepo.findOne({
            where: { id: studentId },
            relations: ['class']
        });

        if (!student) {
            throw new NotFoundException('Student not found');
        }

        // If teacher ID provided, filter by their assigned subjects
        let subjectFilter = {};
        if (teacherId) {
            const assignments = await this.getTeacherAssignments(teacherId);
            const subjectIds = assignments
                .filter(a => a.classId === student.class?.id)
                .map(a => a.subjectId);

            if (subjectIds.length > 0) {
                subjectFilter = { subject: { id: In(subjectIds) } };
            } else {
                // Teacher not assigned to any subjects in this class
                return [];
            }
        }

        const assessments = await this.assessmentRepo.find({
            where: {
                student: { id: studentId },
                ...subjectFilter
            },
            relations: ['subject', 'class']
        });

        return assessments;
    }

    /**
     * UPSERT an assessment (create or update)
     * HANDLES: null values (empty fields), AB (absent), and zero scores
     * @param assessmentData - Assessment data from frontend
     * @param teacherId - Teacher ID (for permission check)
     */
    async upsertAssessment(assessmentData: any, teacherId: string) {
        // 1. Get student with class information
        const student = await this.studentRepo.findOne({
            where: { id: assessmentData.student_id || assessmentData.studentId },
            relations: ['class']
        });

        if (!student) {
            throw new NotFoundException('Student not found');
        }

        if (!student.class) {
            throw new NotFoundException('Student is not assigned to any class');
        }

        // 2. PERMISSION CHECK: Verify teacher is assigned to this subject in this class
        const isAssigned = await this.teacherClassSubjectRepo.findOne({
            where: {
                teacherId: teacherId,
                classId: student.class.id,
                subjectId: assessmentData.subject_id || assessmentData.subjectId
            }
        });

        if (!isAssigned) {
            throw new ForbiddenException('You are not assigned to teach this subject in this class');
        }

        // 3. Handle null/undefined (field not modified in frontend)
        if (assessmentData.score === null || assessmentData.score === undefined) {
            console.log('Field not modified, skipping...');
            return { skipped: true, message: 'Field not modified' };
        }

        const isAbsent = assessmentData.is_absent === true;
        const activeConfig = await this.getActiveGradeConfiguration(student.schoolId);

        // 4. Prepare data - HANDLE ALL CASES:
        let score: number | null = null;
        let grade: string = 'N/A';

        if (isAbsent) {
            // CASE 1: Student was absent
            score = null; // Store 0 for absent
            grade = 'AB';
        } else if (assessmentData.score === '') {
            // CASE 2: User cleared the field (empty string)
            score = null; // null = no data entered
            grade = 'N/A';
        } else {
            // CASE 3: Numeric score (including 0)
            score = Number(assessmentData.score);
            grade = this.calculateGrade(score, activeConfig);
        }

        const data = {
            student: { id: assessmentData.student_id || assessmentData.studentId },
            subject: { id: assessmentData.subject_id || assessmentData.subjectId },
            assessmentType: assessmentData.assessment_type || assessmentData.assessmentType,
            score: score,
            isAbsent: isAbsent,
            grade: grade,
            class: { id: student.class.id }
        };

        // 5. Check for existing record
        const existing = await this.assessmentRepo.findOne({
            where: {
                student: { id: data.student.id },
                subject: { id: data.subject.id },
                assessmentType: data.assessmentType,
                class: { id: student.class.id }
            },
        });

        if (existing) {
            // 6. UPDATE existing record - check if anything changed
            const hasChanges =
                existing.score !== data.score ||
                existing.isAbsent !== data.isAbsent ||
                existing.grade !== data.grade;

            if (!hasChanges) {
                console.log('No changes detected, skipping update');
                return { unchanged: true, message: 'No changes detected' };
            }

            Object.assign(existing, data);
            const result = await this.assessmentRepo.save(existing);

            // Trigger rank recalculation (async)
            if (student.class) {
                setTimeout(async () => {
                    await this.calculateAndUpdateRanks(
                        student.class!.id,
                        student.class!.term || 'Term 1, 2024/2025',
                        student.schoolId
                    );
                }, 100);
            }

            return result;
        } else {
            // 7. CREATE new record - but only if there's actual data
            // Skip if both score is null AND not absent (completely empty field)
            if (data.score === null && !data.isAbsent) {
                console.log('No data to save - skipping creation');
                return { skipped: true, message: 'No data to save' };
            }

            const assessment = this.assessmentRepo.create(data as any);
            const result = await this.assessmentRepo.save(assessment);

            // Trigger rank recalculation (async)
            if (student.class) {
                setTimeout(async () => {
                    await this.calculateAndUpdateRanks(
                        student.class!.id,
                        student.class!.term || 'Term 1, 2024/2025',
                        student.schoolId
                    );
                }, 100);
            }

            return result;
        }
    }

    /**
     * UPSERT report card (only class teachers can update)
     * @param reportCardData - Report card data
     * @param teacherId - Teacher ID (for permission check)
     */
    async upsertReportCard(reportCardData: any, teacherId: string) {
        // Get student with class for permission check
        const student = await this.studentRepo.findOne({
            where: { id: reportCardData.student_id || reportCardData.studentId },
            relations: ['class']
        });

        if (!student) {
            throw new NotFoundException('Student not found');
        }

        // PERMISSION CHECK: Only class teacher can update attendance/remarks
        const isClassTeacher = student.class &&
            student.class.classTeacherId === teacherId;

        if (!isClassTeacher) {
            throw new ForbiddenException('Only class teacher can update attendance and remarks');
        }

        const data = {
            student: { id: reportCardData.student_id || reportCardData.studentId },
            term: reportCardData.term,
            daysPresent: reportCardData.days_present !== undefined ? reportCardData.days_present : 0,
            daysAbsent: reportCardData.days_absent !== undefined ? reportCardData.days_absent : 0,
            daysLate: reportCardData.days_late !== undefined ? reportCardData.days_late : 0,
            teacherRemarks: reportCardData.teacher_remarks || reportCardData.teacherRemarks || '',
        };

        // Optional rank fields (calculated automatically)
        if (reportCardData.class_rank !== undefined) {
            data['classRank'] = reportCardData.class_rank;
        }
        if (reportCardData.qa1_rank !== undefined) {
            data['qa1Rank'] = reportCardData.qa1_rank;
        }
        if (reportCardData.qa2_rank !== undefined) {
            data['qa2Rank'] = reportCardData.qa2_rank;
        }
        if (reportCardData.total_students !== undefined) {
            data['totalStudents'] = reportCardData.total_students;
        }

        const existing = await this.reportCardRepo.findOne({
            where: {
                student: { id: data.student.id },
                term: data.term,
            },
        });

        if (existing) {
            Object.assign(existing, data);
            return this.reportCardRepo.save(existing);
        } else {
            const reportCard = this.reportCardRepo.create(data);
            return this.reportCardRepo.save(reportCard);
        }
    }

    /**
     * Calculate and update ranks for a class
     * @param classId - Class ID
     * @param term - Term (e.g., "Term 1, 2024/2025")
     * @param schoolId - School ID
     */
    async calculateAndUpdateRanks(classId: string, term: string, schoolId?: string) {
        console.log('--- START RANK CALCULATION ---');

        // 1. Load class + students
        const classQuery = this.classRepo
            .createQueryBuilder('class')
            .leftJoinAndSelect('class.students', 'students')
            .where('class.id = :classId', { classId });

        if (schoolId) {
            classQuery.andWhere('class.schoolId = :schoolId', { schoolId });
        }

        const classEntity = await classQuery.getOne();
        if (!classEntity) throw new NotFoundException(`Class not found`);

        const studentIds = classEntity.students.map(s => s.id);
        if (studentIds.length === 0) return;

        // 2. Load ALL assessments for this class in ONE query
        const assessments = await this.assessmentRepo.find({
            where: {
                class: { id: classId },
                student: { id: In(studentIds) },
                assessmentType: In(['qa1', 'qa2', 'end_of_term']),
            },
            relations: ['student'],
        });

        // 3. Group by student
        const byStudent = new Map<string, any[]>();
        for (const asm of assessments) {
            const sid = asm.student.id;
            if (!byStudent.has(sid)) byStudent.set(sid, []);
            byStudent.get(sid)!.push(asm);
        }

        // 4. Build result averages — only students with end_of_term scores enter ranking
        const results: any[] = [];
        for (const [studentId, items] of byStudent.entries()) {
            const avg = (type: string) => {
                const valid = items.filter(a => a.assessmentType === type && a.score > 0);
                if (valid.length === 0) return 0;
                return valid.reduce((s, a) => s + a.score, 0) / valid.length;
            };

            const endAvg = avg('end_of_term');
            results.push({
                studentId,
                qa1Raw: avg('qa1'),
                qa2Raw: avg('qa2'),
                endRaw: endAvg,
            });
        }

        if (results.length === 0) {
            console.log('No scored students — skipping rank');
            return;
        }

        // 5. Dense ranking with float safety
        const denseRank = (items: any[], field: string) => {
            const arr = items
                .map(x => ({
                    ...x,
                    score: parseFloat(x[field].toFixed(2))
                }))
                .sort((a, b) => b.score - a.score);

            const map = new Map<string, number>();

            let rank = 1;
            let prev = arr[0].score;
            map.set(arr[0].studentId, rank);

            for (let i = 1; i < arr.length; i++) {
                if (arr[i].score < prev) rank++;
                map.set(arr[i].studentId, rank);
                prev = arr[i].score;
            }

            return map;
        };

        const qa1Ranks = denseRank(results, 'qa1Raw');
        const qa2Ranks = denseRank(results, 'qa2Raw');
        const endRanks = denseRank(results, 'endRaw');

        const rankedStudentIds = results.map(r => r.studentId);
        const totalRanked = rankedStudentIds.length;

        // 6. Update report cards
        for (const sid of studentIds) {
            let rc = await this.reportCardRepo.findOne({
                where: { student: { id: sid }, term }
            });

            if (!rc) {
                rc = this.reportCardRepo.create({
                    student: { id: sid },
                    term,
                });
            }

            rc.qa1Rank = qa1Ranks.get(sid) || 0;
            rc.qa2Rank = qa2Ranks.get(sid) || 0;
            rc.classRank = endRanks.get(sid) || 0;
            rc.totalStudents = totalRanked;

            await this.reportCardRepo.save(rc);
        }

        console.log('--- FINISHED RANK CALCULATION ---');
    }

    /**
     * Get results for an entire class (filtered by teacher's subjects)
     * @param classId - Class ID
     * @param teacherId - Teacher ID (for filtering)
     */
    async getClassResults(classId: string, teacherId: string) {
        // 1. Get class with students
        const classEntity = await this.classRepo.findOne({
            where: { id: classId },
            relations: ['students']
        });

        if (!classEntity) {
            throw new NotFoundException('Class not found');
        }

        // 2. Get teacher's assignments for this class
        const assignments = await this.getTeacherAssignments(teacherId);
        const assignmentsForThisClass = assignments.filter(a => a.classId === classId);
        const teacherSubjectIds = assignmentsForThisClass.map(a => a.subjectId);

        if (teacherSubjectIds.length === 0) {
            return []; // Teacher not assigned to any subjects in this class
        }

        const activeGradeConfig = await this.getActiveGradeConfiguration(classEntity.schoolId);
        const results: any[] = [];

        // 3. For each student, get filtered assessments
        for (const student of classEntity.students) {
            // Get assessments filtered by teacher's subjects
            let assessments = await this.assessmentRepo
                .createQueryBuilder('assessment')
                .leftJoinAndSelect('assessment.subject', 'subject')
                .leftJoinAndSelect('assessment.student', 'student')
                .innerJoin('assessment.class', 'class')
                .where('student.id = :studentId', { studentId: student.id })
                .andWhere('class.id = :classId', { classId })
                .andWhere('subject.id IN (:...subjectIds)', { subjectIds: teacherSubjectIds })
                .getMany();

            // Get report card for rankings
            const reportCard = await this.reportCardRepo.findOne({
                where: {
                    student: { id: student.id },
                    term: classEntity.term
                }
            });

            // Build subjects from filtered assessments
            const subjectMap = new Map<string, any>();
            assessments.forEach(asm => {
                const subjectName = asm.subject?.name || 'Unknown';

                if (!subjectMap.has(subjectName)) {
                    subjectMap.set(subjectName, {
                        name: subjectName,
                        qa1: 0,
                        qa2: 0,
                        endOfTerm: 0,
                        qa1_absent: false,
                        qa2_absent: false,
                        endOfTerm_absent: false,
                    });
                }

                const subjectData = subjectMap.get(subjectName);
                if (asm.assessmentType === 'qa1') {
                    subjectData.qa1 = asm.score || 0;
                    subjectData.qa1_absent = asm.isAbsent || false;
                } else if (asm.assessmentType === 'qa2') {
                    subjectData.qa2 = asm.score || 0;
                    subjectData.qa2_absent = asm.isAbsent || false;
                } else if (asm.assessmentType === 'end_of_term') {
                    subjectData.endOfTerm = asm.score || 0;
                    subjectData.endOfTerm_absent = asm.isAbsent || false;
                }
            });

            const subjects = Array.from(subjectMap.values());

            if (subjects.length > 0) {
                // Calculate final scores and grades
                const enhancedSubjects = subjects.map(subject => {
                    const finalScore = this.calculateFinalScore(subject, activeGradeConfig);
                    const grade = this.calculateGrade(finalScore, activeGradeConfig);
                    return {
                        ...subject,
                        finalScore,
                        grade
                    };
                });

                // Calculate totals and average
                const totalScore = enhancedSubjects.reduce((sum, subject) => sum + subject.finalScore, 0);
                const average = enhancedSubjects.length > 0 ? totalScore / enhancedSubjects.length : 0;

                results.push({
                    id: student.id,
                    name: student.name,
                    examNumber: student.examNumber,
                    classRank: reportCard?.classRank || 0,
                    totalScore: totalScore,
                    average: average,
                    overallGrade: this.calculateGrade(average, activeGradeConfig),
                    subjects: enhancedSubjects.map(subject => ({
                        name: subject.name,
                        qa1: subject.qa1,
                        qa2: subject.qa2,
                        endOfTerm: subject.endOfTerm,
                        finalScore: subject.finalScore,
                        grade: subject.grade
                    }))
                });
            }
        }

        // Sort and apply dense ranking
        results.sort((a, b) => b.average - a.average);

        let currentRank = 1;
        let previousAverage = results.length > 0 ? results[0].average : null;

        for (let i = 0; i < results.length; i++) {
            if (i > 0 && Math.abs(results[i].average - previousAverage) > 0.01) {
                currentRank++;
            }
            results[i].rank = currentRank;
            previousAverage = results[i].average;
        }

        return results;
    }
}

// import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { In, Repository } from 'typeorm';
// import * as bcrypt from 'bcrypt';
// import { Teacher } from './entities/teacher.entity';
// import { TeacherClassSubject } from './entities/teacher-class-subject.entity';
// import { Class } from '../students/entities/class.entity';
// import { Subject } from '../students/entities/subject.entity';
// import { Student } from '../students/entities/student.entity';

// @Injectable()
// export class TeachersService {
//     constructor(
//         @InjectRepository(Teacher)
//         private teachersRepo: Repository<Teacher>,
//         // ===== START: NEW REPOSITORIES =====
//         @InjectRepository(TeacherClassSubject)
//         private teacherClassSubjectRepo: Repository<TeacherClassSubject>,

//         @InjectRepository(Class)
//         private classRepo: Repository<Class>,

//         @InjectRepository(Subject)
//         private subjectRepo: Repository<Subject>,

//         @InjectRepository(Student)
//         private studentRepo: Repository<Student>,
//         // ===== END: NEW REPOSITORIES =====
//     ) { }

//     // Create teacher - school_id comes from admin's context
//     async createTeacher(name: string, email: string, password: string, schoolId: string) {
//         // Check if email exists (globally for now)
//         const existingTeacher = await this.teachersRepo.findOne({
//             where: { email }
//         });

//         if (existingTeacher) {
//             throw new ConflictException('A teacher with this email already exists');
//         }

//         // Hash password
//         const hashedPassword = await bcrypt.hash(password, 10);

//         // Create teacher
//         const teacher = this.teachersRepo.create({
//             name,
//             email,
//             password: hashedPassword,
//             school_id: schoolId,
//         });

//         await this.teachersRepo.save(teacher);

//         // Return exactly what frontend expects
//         return {
//             id: teacher.id,
//             name: teacher.name,
//             email: teacher.email,
//             created_at: teacher.created_at
//         };
//     }

//     // Get all teachers for a school - frontend expects array with specific fields
//     async getTeachersBySchool(schoolId: string) {
//         const teachers = await this.teachersRepo.find({
//             where: { school_id: schoolId },
//             order: { created_at: 'DESC' },
//         });

//         // Return exactly what frontend expects
//         return teachers.map(teacher => ({
//             id: teacher.id,
//             name: teacher.name,
//             email: teacher.email,
//             created_at: teacher.created_at
//         }));
//     }

//     // ===== START: FIND TEACHER BY EMAIL METHOD =====
//     async findTeacherByEmail(email: string) {
//         return await this.teachersRepo.findOne({
//             where: { email },
//             select: ['id', 'name', 'email', 'password', 'school_id', 'is_active', 'created_at']
//         });
//     }
//     // ===== END: FIND TEACHER BY EMAIL METHOD =====

//     // Delete teacher
//     async deleteTeacher(id: string, schoolId: string) {
//         const result = await this.teachersRepo.delete({ id, school_id: schoolId });

//         if (result.affected === 0) {
//             throw new NotFoundException('Teacher not found');
//         }

//         return { message: 'Teacher deleted successfully' };
//     }

//     // ===== START: NEW TEACHER-CLASS-SUBJECT METHODS =====

//     // Assign teacher to a specific class and subject
//     async assignTeacherToClassSubject(teacherId: string, classId: string, subjectId: string) {
//         // Check if assignment already exists
//         const existing = await this.teacherClassSubjectRepo.findOne({
//             where: { teacherId, classId, subjectId }
//         });

//         if (existing) {
//             throw new ConflictException('Teacher is already assigned to this class and subject');
//         }

//         // Check if teacher exists
//         const teacher = await this.teachersRepo.findOne({ where: { id: teacherId } });
//         if (!teacher) {
//             throw new NotFoundException('Teacher not found');
//         }

//         // Check if class exists
//         const classExists = await this.classRepo.findOne({ where: { id: classId } });
//         if (!classExists) {
//             throw new NotFoundException('Class not found');
//         }

//         // Check if subject exists
//         const subject = await this.subjectRepo.findOne({ where: { id: subjectId } });
//         if (!subject) {
//             throw new NotFoundException('Subject not found');
//         }

//         // Create new assignment
//         const assignment = this.teacherClassSubjectRepo.create({
//             teacherId,
//             classId,
//             subjectId
//         });

//         return this.teacherClassSubjectRepo.save(assignment);
//     }

//     // Get all assignments for a teacher
//     async getTeacherAssignments(teacherId: string) {
//         return this.teacherClassSubjectRepo.find({
//             where: { teacherId },
//             relations: ['class', 'subject']
//         });
//     }

//     // Get only classes assigned to a teacher
//     async getTeacherClasses(teacherId: string): Promise<Class[]> {
//         const assignments = await this.teacherClassSubjectRepo.find({
//             where: { teacherId },
//             relations: ['class']
//         }) as any[];

//         const uniqueClasses: Class[] = [];
//         const seenClassIds = new Set<string>();

//         for (const assignment of assignments) {
//             const classObj = assignment.class;
//             if (classObj && !seenClassIds.has(classObj.id)) {
//                 seenClassIds.add(classObj.id);
//                 uniqueClasses.push(classObj);
//             }
//         }

//         return uniqueClasses;
//     }

//     // Get only subjects assigned to a teacher
//     async getTeacherSubjects(teacherId: string): Promise<Subject[]> {
//         const assignments = await this.teacherClassSubjectRepo.find({
//             where: { teacherId },
//             relations: ['subject']
//         }) as any[];

//         const uniqueSubjects: Subject[] = [];
//         const seenSubjectIds = new Set<string>();

//         for (const assignment of assignments) {
//             const subjectObj = assignment.subject;
//             if (subjectObj && !seenSubjectIds.has(subjectObj.id)) {
//                 seenSubjectIds.add(subjectObj.id);
//                 uniqueSubjects.push(subjectObj);
//             }
//         }

//         return uniqueSubjects;
//     }

//     // Get students from classes assigned to a teacher - CORRECTED
//     async getTeacherStudents(teacherId: string) {
//         // Get teacher's assigned classes
//         const assignments = await this.getTeacherAssignments(teacherId);
//         const classIds = assignments.map(a => a.classId);

//         if (classIds.length === 0) {
//             return [];
//         }

//         // Use the class relationship, not classId field
//         return this.studentRepo.find({
//             where: { class: { id: In(classIds) } },
//             relations: ['class']
//         });
//     }

//     // Remove a teacher's assignment
//     async removeTeacherAssignment(teacherId: string, classId: string, subjectId: string) {
//         const result = await this.teacherClassSubjectRepo.delete({ teacherId, classId, subjectId });

//         if (result.affected === 0) {
//             throw new NotFoundException('Assignment not found');
//         }
//     }
//     // ===== END: NEW TEACHER-CLASS-SUBJECT METHODS =====

//     // ===== START: CLASS TEACHER METHODS =====

//     // Assign a teacher as class teacher for a class
//     async assignClassTeacher(teacherId: string, classId: string) {
//         // Check if teacher exists
//         const teacher = await this.teachersRepo.findOne({ where: { id: teacherId } });
//         if (!teacher) {
//             throw new NotFoundException('Teacher not found');
//         }

//         // Check if class exists
//         const classEntity = await this.classRepo.findOne({ where: { id: classId } });
//         if (!classEntity) {
//             throw new NotFoundException('Class not found');
//         }

//         // Check if teacher is already class teacher for another class
//         const existingClassTeacher = await this.classRepo.findOne({
//             where: { classTeacherId: teacherId, id: classId }
//         });

//         if (existingClassTeacher) {
//             throw new ConflictException('This teacher is already class teacher for this class');
//         }

//         // Update the class with new class teacher
//         classEntity.classTeacherId = teacherId;
//         await this.classRepo.save(classEntity);

//         return {
//             message: 'Class teacher assigned successfully',
//             teacherId,
//             teacherName: teacher.name,
//             classId,
//             className: classEntity.name
//         };
//     }

//     // Remove class teacher from a class
//     async removeClassTeacher(classId: string) {
//         const classEntity = await this.classRepo.findOne({ where: { id: classId } });
//         if (!classEntity) {
//             throw new NotFoundException('Class not found');
//         }

//         if (!classEntity.classTeacherId) {
//             throw new NotFoundException('No class teacher assigned to this class');
//         }

//         // Clear the class teacher
//         classEntity.classTeacherId = undefined;
//         await this.classRepo.save(classEntity);

//         return { message: 'Class teacher removed successfully' };
//     }

//     // Get class teacher for a specific class
//     async getClassTeacher(classId: string) {
//         const classEntity = await this.classRepo.findOne({
//             where: { id: classId },
//             relations: ['classTeacher']
//         });

//         if (!classEntity) {
//             throw new NotFoundException('Class not found');
//         }

//         if (!classEntity.classTeacher) {
//             return null;
//         }

//         return {
//             id: classEntity.classTeacher.id,
//             name: classEntity.classTeacher.name,
//             email: classEntity.classTeacher.email
//         };
//     }

//     // Check if teacher is class teacher for a class
//     async isClassTeacher(teacherId: string, classId: string): Promise<boolean> {
//         const classEntity = await this.classRepo.findOne({
//             where: { id: classId, classTeacherId: teacherId }
//         });

//         return !!classEntity;
//     }
//     // ===== END: CLASS TEACHER METHODS =====
// }