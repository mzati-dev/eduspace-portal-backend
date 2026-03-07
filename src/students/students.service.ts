import { ConflictException, Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { Student } from './entities/student.entity';
import { Assessment } from './entities/assessment.entity';
import { ReportCard } from './entities/report-card.entity';
import { Subject } from './entities/subject.entity';
import { GradeConfig } from './entities/grade-config.entity';
import { Class } from './entities/class.entity';
import { TeacherClassSubject } from '../teachers/entities/teacher-class-subject.entity';
import { TeachersService } from '../teachers/teachers.service';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,
    @InjectRepository(ReportCard)
    private reportCardRepository: Repository<ReportCard>,
    @InjectRepository(Subject)
    private subjectRepository: Repository<Subject>,
    @InjectRepository(GradeConfig)
    private gradeConfigRepository: Repository<GradeConfig>,
    @InjectRepository(Class)
    private classRepository: Repository<Class>,
    private teachersService: TeachersService,
  ) { }


  // async findByExamNumber(examNumber: string, schoolId?: string) {
  //   const query = this.studentRepository
  //     .createQueryBuilder('student')
  //     .leftJoinAndSelect('student.assessments', 'assessments')
  //     .leftJoinAndSelect('assessments.subject', 'subject')
  //     .leftJoinAndSelect('student.reportCards', 'reportCards')
  //     .leftJoinAndSelect('student.class', 'class')
  //     .where('student.examNumber = :examNumber', { examNumber: examNumber })

  //   const student = await query.getOne();

  //   if (!student) {
  //     throw new NotFoundException(`Student ${examNumber} not found`);
  //   }


  //   const activeGradeConfig = await this.getActiveGradeConfiguration(student.schoolId);
  //   return this.formatStudentData(student, activeGradeConfig);
  // }

  // async findByExamNumber(examNumber: string, schoolId?: string) {
  //   const query = this.studentRepository
  //     .createQueryBuilder('student')
  //     .leftJoinAndSelect('student.class', 'class') // 👈 Moved up
  //     // 👈 MAGIC LINE: Only load the report card for the current term!
  //     .leftJoinAndSelect(
  //       'student.reportCards',
  //       'reportCards',
  //       'reportCards.term = class.term'
  //     )
  //     // 👈 PRECAUTION: Only load assessments for the current class!
  //     .leftJoinAndSelect(
  //       'student.assessments',
  //       'assessments',
  //       'assessments.classId = class.id'
  //     )
  //     .leftJoinAndSelect('assessments.subject', 'subject')
  //     .where('student.examNumber = :examNumber', { examNumber: examNumber });

  //   const student = await query.getOne();

  //   if (!student) {
  //     throw new NotFoundException(`Student ${examNumber} not found`);
  //   }

  //   const activeGradeConfig = await this.getActiveGradeConfiguration(student.schoolId);
  //   return this.formatStudentData(student, activeGradeConfig);
  // }

  async findByExamNumber(examNumber: string, schoolId?: string) {
    const query = this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.class', 'class')
      .leftJoinAndSelect(
        'student.reportCards',
        'reportCards',
        'reportCards.term = class.term'
      )
      .leftJoinAndSelect(
        'student.assessments',
        'assessments',
        'assessments.classId = class.id'
      )
      .leftJoinAndSelect('assessments.subject', 'subject')
      .where('student.examNumber = :examNumber', { examNumber: examNumber });

    const student = await query.getOne();

    if (!student) {
      throw new NotFoundException(`Student ${examNumber} not found`);
    }

    const activeGradeConfig = await this.getActiveGradeConfiguration(student.schoolId);

    // 1. Format the data as usual
    const response = this.formatStudentData(student, activeGradeConfig);

    // 2. 👈 BULLETPROOF FIX: Override the database rank by dynamically pulling 
    // the exact rank from the Class Results so they always match 100%.
    if (student.class?.id) {
      const classResults = await this.getClassResults(student.class.id, schoolId);
      const studentInClass = classResults.find(r => r.id === student.id);

      if (studentInClass) {
        response.classRank = studentInClass.rank;

        // Also update the endOfTerm stats object to reflect the correct rank
        if (response.assessmentStats?.endOfTerm) {
          response.assessmentStats.endOfTerm.classRank = studentInClass.rank;
        }
      }
    }

    return response;
  }

  // ===== START MODIFIED: Added schoolId parameter =====
  async getActiveGradeConfiguration(schoolId?: string) {
    const query = this.gradeConfigRepository
      .createQueryBuilder('config')
      .where('config.is_active = true');

    if (schoolId) {
      query.andWhere('config.school_id = :schoolId', { schoolId });
    }

    const config = await query.getOne();

    if (!config) {
      return {
        id: 'default',
        configuration_name: 'Default (End of Term Only)',  // Updated name
        calculation_method: 'end_of_term_only',  // ← NEW DEFAULT
        weight_qa1: 0,  // Can set to 0 since they're not used
        weight_qa2: 0,
        weight_end_of_term: 100,  // Only end term matters
        pass_mark: 50,
        is_active: true,
        school_id: schoolId || null,
      };
    }

    return config;
  }
  // ===== END MODIFIED =====

  // ===== NO CHANGES =====
  private formatStudentData(student: Student, gradeConfig: any) {
    const subjectMap = {};

    student.assessments?.forEach((asm) => {
      const subjectName = asm.subject?.name || 'Unknown';
      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = {
          name: subjectName,
          qa1: '',
          qa2: '',
          endOfTerm: '',
          // 👈 NEW: Add absent flags
          qa1_absent: false,
          qa2_absent: false,
          endOfTerm_absent: false,
          grade: 'N/A',
        };
      }


      if (asm.assessmentType === 'qa1') {
        // 🔴🔴🔴 MODIFIED: Handle null scores (empty fields)
        subjectMap[subjectName].qa1 = asm.score === null ? '' : asm.score;
        subjectMap[subjectName].qa1_absent = asm.isAbsent || false;
      } else if (asm.assessmentType === 'qa2') {
        subjectMap[subjectName].qa2 = asm.score === null ? '' : asm.score;
        subjectMap[subjectName].qa2_absent = asm.isAbsent || false;
      } else if (asm.assessmentType === 'end_of_term') {
        subjectMap[subjectName].endOfTerm = asm.score === null ? '' : asm.score;
        subjectMap[subjectName].endOfTerm_absent = asm.isAbsent || false;
        subjectMap[subjectName].grade = asm.isAbsent ? 'AB' :
          (asm.score === null ? 'N/A' : this.calculateGrade(asm.score, gradeConfig));
      }
    });

    Object.values(subjectMap).forEach((subject: any) => {
      subject.finalScore = this.calculateFinalScore(subject, gradeConfig, student.assessments);
      subject.grade = this.calculateGrade(subject.finalScore, gradeConfig, subject.endOfTerm_absent);
    });

    // Use report card for current class term so classRank matches class results table (was: [0] = wrong term)
    // const currentTerm = student.class?.term;
    // const activeReport = (currentTerm && student.reportCards?.length)
    //   ? (student.reportCards.find((rc: any) => rc.term === currentTerm) || student.reportCards[0] || {})
    //   : (student.reportCards?.[0] || {});

    const activeReport = student.reportCards?.[0] || {};

    const className = student.class ? student.class.name : 'Unknown';
    const term = student.class ? student.class.term : 'Term 1, 2024/2025';
    const academicYear = student.class ? student.class.academic_year : '2024/2025';

    const response: any = {
      id: student.id,
      name: student.name,
      examNumber: student.examNumber,
      class: className,
      term: term,
      academicYear: academicYear,
      photo: student.photoUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
      subjects: Object.values(subjectMap),
      attendance: {
        present: activeReport.daysPresent || 0,
        absent: activeReport.daysAbsent || 0,
        late: activeReport.daysLate || 0,
      },
      classRank: activeReport.classRank || 0,
      qa1Rank: activeReport.qa1Rank || 0,
      qa2Rank: activeReport.qa2Rank || 0,
      totalStudents: activeReport.totalStudents || 0,
      teacherRemarks: activeReport.teacherRemarks || 'No remarks available.',
      gradeConfiguration: gradeConfig,
    };

    response.assessmentStats = this.calculateAssessmentStats(response, gradeConfig);

    return response;
  }
  // ===== END NO CHANGES =====


  private calculateFinalScore(subject: any, gradeConfig: any, studentAssessments?: any[]): number {
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

    if (studentAssessments) {
      // ✅ FIXED: Added parentheses for correct operator precedence
      const hasQA1 = studentAssessments.some(a =>
        a.assessmentType === 'qa1' && (a.score > 0 || a.isAbsent)
      );
      const hasQA2 = studentAssessments.some(a =>
        a.assessmentType === 'qa2' && (a.score > 0 || a.isAbsent)
      );
      const hasEndOfTerm = studentAssessments.some(a =>
        a.assessmentType === 'end_of_term' && (a.score > 0 || a.isAbsent)
      );

      if ((hasQA1 || hasQA2) && !hasEndOfTerm) {
        return endOfTerm;
      }
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
      // ✅ REMOVED the duplicate return statement

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
  // ===== END NO CHANGES =====

  // ===== NO CHANGES =====
  private calculateAssessmentStats(studentData: any, gradeConfig: any) {
    const subjects = studentData.subjects;

    const qa1Average = subjects.reduce((sum, s) => sum + s.qa1, 0) / subjects.length;
    const qa2Average = subjects.reduce((sum, s) => sum + s.qa2, 0) / subjects.length;
    const endOfTermAverage = subjects.reduce((sum, s) => sum + s.endOfTerm, 0) / subjects.length;

    const qa1Grade = this.calculateGrade(qa1Average, gradeConfig);
    const qa2Grade = this.calculateGrade(qa2Average, gradeConfig);
    const endOfTermGrade = this.calculateGrade(endOfTermAverage, gradeConfig);

    let overallAverage = (qa1Average + qa2Average + endOfTermAverage) / 3;
    if (gradeConfig) {
      overallAverage = this.calculateFinalScore(
        { qa1: qa1Average, qa2: qa2Average, endOfTerm: endOfTermAverage },
        gradeConfig
      );
    }

    return {
      qa1: {
        classRank: studentData.qa1Rank || 0,
        termAverage: parseFloat(qa1Average.toFixed(1)),
        overallGrade: qa1Grade,
      },
      qa2: {
        classRank: studentData.qa2Rank || 0,
        termAverage: parseFloat(qa2Average.toFixed(1)),
        overallGrade: qa2Grade,
      },
      endOfTerm: {
        classRank: studentData.classRank,
        termAverage: parseFloat(endOfTermAverage.toFixed(1)),
        overallGrade: endOfTermGrade,
        attendance: studentData.attendance
      },
      overall: {
        termAverage: parseFloat(overallAverage.toFixed(1)),
        calculationMethod: gradeConfig?.calculation_method || 'average_all'
      }
    };
  }
  // ===== END NO CHANGES =====

  // ===== START MODIFIED: Added schoolId parameter =====
  async findAll(schoolId?: string) {
    const query = this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.class', 'class')
      .orderBy('student.examNumber', 'ASC');

    if (schoolId) {
      query.where('student.schoolId = :schoolId', { schoolId });
    }

    return query.getMany();
  }
  // ===== END MODIFIED =====

  // ===== START MODIFIED: Added schoolId parameter =====
  async findAllSubjects(schoolId?: string) {
    const query = this.subjectRepository
      .createQueryBuilder('subject')
      .select(['subject.id', 'subject.name'])
      .orderBy('subject.name', 'ASC');

    if (schoolId) {
      query.where('subject.schoolId = :schoolId', { schoolId });
    }

    return query.getMany();
  }
  // ===== END MODIFIED =====

  // ===== START MODIFIED: Added schoolId parameter =====
  async create(studentData: any, schoolId?: string) {
    const classEntity = await this.classRepository.findOne({
      where: {
        id: studentData.class_id,
        ...(schoolId && { schoolId })
      }
    });

    if (!classEntity) {
      throw new NotFoundException(`Class ${studentData.class_id} not found in your school`);
    }

    const currentYear = new Date().getFullYear().toString().slice(-2);
    const classNumberMatch = classEntity.name.match(/\d+/);
    const classNumber = classNumberMatch ? classNumberMatch[0] : '0';
    const prefix = `${schoolId ? schoolId.substring(0, 3) : 'SCH'}-${currentYear}-${classNumber}`;

    const allStudents = await this.studentRepository.find({
      select: ['examNumber'],
      where: {
        examNumber: Like(`${prefix}%`),
        ...(schoolId && { schoolId })
      },
      order: { examNumber: 'DESC' },
      take: 1
    });

    let nextNumber = 1;
    if (allStudents.length > 0 && allStudents[0].examNumber) {
      const lastExamNumber = allStudents[0].examNumber;
      const lastNumberStr = lastExamNumber.slice(prefix.length);
      const lastNumber = parseInt(lastNumberStr) || 0;
      nextNumber = lastNumber + 1;
    }

    const examNumber = `${schoolId ? schoolId.substring(0, 3) : 'SCH'}-${currentYear}-${classNumber}${nextNumber.toString().padStart(3, '0')}`;

    const student = this.studentRepository.create({
      name: studentData.name,
      examNumber: examNumber,
      class: classEntity,
      photoUrl: studentData.photo_url,
      schoolId: schoolId,
    });

    return this.studentRepository.save(student);
  }
  // ===== END MODIFIED =====

  // ===== START MODIFIED: Added schoolId parameter =====
  async update(id: string, updates: any, schoolId?: string) {
    const query = this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.class', 'class')
      .where('student.id = :id', { id });

    if (schoolId) {
      query.andWhere('student.schoolId = :schoolId', { schoolId });
    }

    const student = await query.getOne();

    if (!student) {
      throw new NotFoundException(`Student ${id} not found`);
    }

    const allowedUpdates = ['name', 'photoUrl'];

    if (updates.class_id) {
      const classEntity = await this.classRepository.findOne({
        where: {
          id: updates.class_id,
          ...(schoolId && { schoolId })
        }
      });

      if (!classEntity) {
        throw new NotFoundException(`Class ${updates.class_id} not found in your school`);
      }
      student.class = classEntity;
    }

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        student[field] = updates[field];
      }
    });

    return this.studentRepository.save(student);
  }
  // ===== END MODIFIED =====

  // ===== START MODIFIED: Added schoolId parameter =====
  async remove(id: string, schoolId?: string) {
    const query = this.studentRepository
      .createQueryBuilder('student')
      .where('student.id = :id', { id });

    if (schoolId) {
      query.andWhere('student.schoolId = :schoolId', { schoolId });
    }

    const student = await query.getOne();

    if (!student) {
      throw new NotFoundException(`Student ${id} not found`);
    }
    return this.studentRepository.remove(student);
  }
  // ===== END MODIFIED =====

  // ===== START MODIFIED: Added schoolId parameter =====
  async getStudentAssessments(studentId: string, schoolId?: string) {
    const query = this.assessmentRepository
      .createQueryBuilder('assessment')
      .leftJoinAndSelect('assessment.subject', 'subject')
      .leftJoin('assessment.student', 'student')
      .where('student.id = :studentId', { studentId });

    if (schoolId) {
      query.andWhere('student.schoolId = :schoolId', { schoolId });
    }

    return query
      .orderBy('subject.name', 'ASC')
      .getMany();
  }
  // ===== END MODIFIED =====

  // ===== START MODIFIED: Added schoolId parameter =====
  async getStudentReportCard(studentId: string, term: string, schoolId?: string) {
    const query = this.reportCardRepository
      .createQueryBuilder('reportCard')
      .leftJoin('reportCard.student', 'student')
      .where('student.id = :studentId', { studentId })
      .andWhere('reportCard.term = :term', { term });

    if (schoolId) {
      query.andWhere('student.schoolId = :schoolId', { schoolId });
    }

    return query.getOne();
  }
  // ===== END MODIFIED =====

  async upsertAssessment(assessmentData: any, schoolId?: string) {
    if (schoolId) {
      const student = await this.studentRepository.findOne({
        where: {
          id: assessmentData.student_id || assessmentData.studentId,
          schoolId
        },
        relations: ['class']
      });
      if (!student) {
        throw new NotFoundException('Student not found in your school');
      }
    }

    const student = await this.studentRepository.findOne({
      where: { id: assessmentData.student_id || assessmentData.studentId },
      relations: ['class']
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (!student.class) {
      throw new NotFoundException('Student is not assigned to any class');
    }

    // 🔴🔴🔴 MODIFIED: Only skip if score is null or undefined (field not sent from frontend)
    // But allow empty string, 0, and other values to be processed
    if (assessmentData.score === null || assessmentData.score === undefined) {
      console.log('Field not modified, skipping...');
      return { skipped: true, message: 'Field not modified' };
    }
    // 🔴🔴🔴 END MODIFIED

    const isAbsent = assessmentData.is_absent === true;

    // 🔴🔴🔴 REMOVED: Don't skip empty strings - they represent user clearing a field
    // User might want to clear a field (set it to empty)
    // 🔴🔴🔴 END REMOVED

    const activeConfig = await this.getActiveGradeConfiguration(schoolId);

    // 🔴🔴🔴 MODIFIED: Prepare data - handle all cases properly
    let score: number | null = null;
    let grade: string = 'N/A';

    if (isAbsent) {
      // AB case: score = 0, isAbsent = true, grade = 'AB'
      score = 0;
      grade = 'AB';
    } else if (assessmentData.score === '') {
      // Empty string means user wants to clear the field
      score = null;
      grade = 'N/A';
    } else {
      // Numeric score (including 0)
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
    // 🔴🔴🔴 END MODIFIED

    const existing = await this.assessmentRepository.findOne({
      where: {
        student: { id: data.student.id },
        subject: { id: data.subject.id },
        assessmentType: data.assessmentType,
        class: { id: student.class.id }
      },
    });

    if (existing) {
      // 🔴🔴🔴 MODIFIED: Check if values actually changed before updating
      const hasChanges =
        existing.score !== data.score ||
        existing.isAbsent !== data.isAbsent ||
        existing.grade !== data.grade;

      if (!hasChanges) {
        console.log('No changes detected, skipping update');
        return { unchanged: true, message: 'No changes detected' };
      }
      // 🔴🔴🔴 END MODIFIED

      Object.assign(existing, data);
      const result = await this.assessmentRepository.save(existing);

      // if (student.class) {
      //   setTimeout(async () => {
      //     await this.calculateAndUpdateRanks(
      //       student.class!.id,
      //       student.class!.term || 'Term 1, 2024/2025',
      //       schoolId
      //     );
      //   }, 100);
      // }

      return result;
    } else {
      // 🔴🔴🔴 REMOVED: Don't block creation of zero scores
      // Only skip if both score is null AND not absent (completely empty field)
      if (data.score === null && !data.isAbsent) {
        console.log('No data to save - skipping creation');
        return { skipped: true, message: 'No data to save' };
      }
      // 🔴🔴🔴 END MODIFIED

      const assessment = this.assessmentRepository.create(data as any);
      const result = await this.assessmentRepository.save(assessment);

      // if (student.class) {
      //   setTimeout(async () => {
      //     await this.calculateAndUpdateRanks(
      //       student.class!.id,
      //       student.class!.term || 'Term 1, 2024/2025',
      //       schoolId
      //     );
      //   }, 100);
      // }

      return result;
    }
  }

  // ===== MODIFIED: Added permission check for class teacher =====
  async upsertReportCard(reportCardData: any, schoolId?: string, requestingTeacherId?: string) {
    // Get student with class relation for permission check
    const student = await this.studentRepository.findOne({
      where: {
        id: reportCardData.student_id || reportCardData.studentId,
        ...(schoolId && { schoolId })
      },
      relations: ['class'] // IMPORTANT: Get class to check class teacher
    });

    if (!student) {
      throw new NotFoundException('Student not found in your school');
    }

    // PERMISSION CHECK: Only class teacher can update attendance and remarks
    if (requestingTeacherId) {
      const isClassTeacher = student.class &&
        student.class.classTeacherId === requestingTeacherId;

      if (!isClassTeacher) {
        throw new ForbiddenException('Only class teacher can update attendance and remarks');
      }
    }

    const data = {
      student: { id: reportCardData.student_id || reportCardData.studentId },
      term: reportCardData.term,
      daysPresent: reportCardData.days_present || reportCardData.daysPresent || 0,
      daysAbsent: reportCardData.days_absent || reportCardData.daysAbsent || 0,
      daysLate: reportCardData.days_late || reportCardData.daysLate || 0,
      teacherRemarks: reportCardData.teacher_remarks || reportCardData.teacherRemarks || '',
    };

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

    const existing = await this.reportCardRepository.findOne({
      where: {
        student: { id: data.student.id },
        term: data.term,
      },
    });

    if (existing) {
      Object.assign(existing, data);
      return this.reportCardRepository.save(existing);
    } else {
      const reportCard = this.reportCardRepository.create(data);
      return this.reportCardRepository.save(reportCard);
    }
  }
  // ===== END MODIFIED =====


  async createSubject(subjectData: { name: string }, schoolId?: string) {
    // 1. Check if this subject already exists FOR THIS SCHOOL
    const existingSubject = await this.subjectRepository.findOne({
      where: {
        name: subjectData.name,
        schoolId: schoolId // <--- Crucial check!
      }
    });

    if (existingSubject) {
      // Return a nice error instead of crashing
      throw new BadRequestException(`Subject '${subjectData.name}' already exists in this school.`);
    }

    // 2. If not found, create it
    const subject = this.subjectRepository.create({
      ...subjectData,
      schoolId: schoolId,
    });

    return this.subjectRepository.save(subject);
  }
  // ===== END MODIFIED =====

  // ===== START MODIFIED: Added schoolId parameter =====
  async deleteSubject(id: string, schoolId?: string) {
    const query = this.subjectRepository
      .createQueryBuilder('subject')
      .where('subject.id = :id', { id });

    if (schoolId) {
      query.andWhere('subject.schoolId = :schoolId', { schoolId });
    }

    const subject = await query.getOne();

    if (!subject) {
      throw new NotFoundException(`Subject ${id} not found`);
    }
    return this.subjectRepository.remove(subject);
  }
  // ===== END MODIFIED =====

  // ===== NO CHANGES =====
  // calculateGrade(score: number, gradeConfig?: any): string {
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
  // ===== END NO CHANGES =====

  // ===== START MODIFIED: Added schoolId parameter =====
  async getAllGradeConfigurations(schoolId?: string) {
    const query = this.gradeConfigRepository
      .createQueryBuilder('config')
      .orderBy('config.is_active', 'DESC')
      .addOrderBy('config.created_at', 'DESC');

    if (schoolId) {
      query.where('config.school_id = :schoolId', { schoolId });
    }

    return query.getMany();
  }
  // ===== END MODIFIED =====

  // ===== START MODIFIED: Added schoolId parameter =====
  async createGradeConfiguration(data: Partial<GradeConfig>, schoolId?: string) {
    const config = this.gradeConfigRepository.create({
      ...data,
      school_id: schoolId,
    });
    return this.gradeConfigRepository.save(config);
  }
  // ===== END MODIFIED =====

  // ===== START MODIFIED: Added schoolId parameter =====
  async updateGradeConfiguration(id: string, updates: Partial<GradeConfig>, schoolId?: string) {
    const query = this.gradeConfigRepository
      .createQueryBuilder('config')
      .where('config.id = :id', { id });

    if (schoolId) {
      query.andWhere('config.school_id = :schoolId', { schoolId });
    }

    const config = await query.getOne();

    if (!config) {
      throw new NotFoundException(`Grade configuration ${id} not found`);
    }

    Object.assign(config, updates);
    return this.gradeConfigRepository.save(config);
  }
  // ===== END MODIFIED =====

  // ===== START MODIFIED: Added schoolId parameter =====
  async setActiveConfiguration(id: string, schoolId?: string) {
    const deactivateQuery = this.gradeConfigRepository
      .createQueryBuilder()
      .update(GradeConfig)
      .set({ is_active: false })
      .where('is_active = true');

    if (schoolId) {
      deactivateQuery.andWhere('school_id = :schoolId', { schoolId });
    }

    await deactivateQuery.execute();

    const query = this.gradeConfigRepository
      .createQueryBuilder('config')
      .where('config.id = :id', { id });

    if (schoolId) {
      query.andWhere('config.school_id = :schoolId', { schoolId });
    }

    const config = await query.getOne();

    if (!config) {
      throw new NotFoundException(`Grade configuration ${id} not found`);
    }

    config.is_active = true;
    await this.gradeConfigRepository.save(config);
    await this.updateAllReportCardsWithNewGrades(schoolId);

    return config;
  }
  // ===== END MODIFIED =====

  // ===== START MODIFIED: Added schoolId parameter =====
  async findAllClasses(schoolId?: string) {
    const query = this.classRepository
      .createQueryBuilder('class')
      .leftJoinAndSelect('class.students', 'students')
      .leftJoinAndSelect('class.classTeacher', 'classTeacher') // ADDED: Include class teacher
      .orderBy('class.created_at', 'DESC');

    if (schoolId) {
      query.where('class.schoolId = :schoolId', { schoolId });
    }

    return query.getMany();
  }
  // ===== END MODIFIED =====

  // ===== START MODIFIED: Added schoolId parameter =====
  async createClass(classData: { name: string; academic_year: string; term: string }, schoolId?: string) {
    const existingClass = await this.classRepository.findOne({
      where: {
        name: classData.name,
        academic_year: classData.academic_year,
        term: classData.term,
        ...(schoolId && { schoolId })
      }
    });

    if (existingClass) {
      throw new ConflictException(
        `Class "${classData.name}" already exists for ${classData.academic_year} ${classData.term}`
      );
    }

    const nameCode = classData.name
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .substring(0, 4);

    const classNumber = classData.name.match(/\d+/)?.[0] || '00';
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

    const classCode = `${nameCode}${classNumber}-${classData.academic_year.replace('/', '-')}-${classData.term.substring(0, 2).toUpperCase()}-${randomSuffix}`;

    const classEntity = this.classRepository.create({
      ...classData,
      class_code: classCode,
      schoolId: schoolId,
    });

    return this.classRepository.save(classEntity);
  }
  // ===== END MODIFIED =====

  // ===== START MODIFIED: Added schoolId parameter =====
  async deleteClass(id: string, schoolId?: string) {
    const query = this.classRepository
      .createQueryBuilder('class')
      .leftJoinAndSelect('class.students', 'students')
      .where('class.id = :id', { id });

    if (schoolId) {
      query.andWhere('class.schoolId = :schoolId', { schoolId });
    }

    const classEntity = await query.getOne();

    if (!classEntity) {
      throw new NotFoundException(`Class ${id} not found`);
    }

    if (classEntity.students && classEntity.students.length > 0) {
      throw new NotFoundException(`Cannot delete class with students. Delete students first.`);
    }

    return this.classRepository.remove(classEntity);
  }
  // ===== END MODIFIED =====

  // ===== START MODIFIED: Added schoolId parameter =====
  async getClassStudents(classId: string, schoolId?: string) {
    const query = this.classRepository
      .createQueryBuilder('class')
      .leftJoinAndSelect('class.students', 'students')
      .leftJoinAndSelect('class.classTeacher', 'classTeacher') // ADDED
      .where('class.id = :classId', { classId });

    if (schoolId) {
      query.andWhere('class.schoolId = :schoolId', { schoolId });
    }

    const classEntity = await query.getOne();

    if (!classEntity) {
      throw new NotFoundException(`Class ${classId} not found`);
    }

    return classEntity.students || [];
  }

  /**
   * Recalculates ranks and writes to report cards.
   * FIX: classRank = same formula as class results table (final-score average + grade config),
   * and we use report card for current term in search so positions match.
   */
  // async calculateAndUpdateRanks(classId: string, term: string, schoolId?: string) {
  //   console.log('--- START RANK CALCULATION (OPTIMIZED) ---');

  //   // 1️⃣ Load class + students
  //   const classQuery = this.classRepository
  //     .createQueryBuilder('class')
  //     .leftJoinAndSelect('class.students', 'students')
  //     .where('class.id = :classId', { classId });

  //   if (schoolId) {
  //     classQuery.andWhere('class.schoolId = :schoolId', { schoolId });
  //   }

  //   const classEntity = await classQuery.getOne();
  //   if (!classEntity) throw new NotFoundException(`Class not found`);

  //   const studentIds = classEntity.students.map(s => s.id);
  //   if (studentIds.length === 0) return;

  //   const activeGradeConfig = await this.getActiveGradeConfiguration(schoolId);

  //   // 2️⃣ Load assessments with subject (needed for final-score calculation like getClassResults)
  //   const assessments = await this.assessmentRepository.find({
  //     where: {
  //       class: { id: classId },
  //       student: { id: In(studentIds) },
  //       assessmentType: In(['qa1', 'qa2', 'end_of_term']),
  //     },
  //     relations: ['student', 'subject'],
  //   });

  //   // 3️⃣ Group by student
  //   const byStudent = new Map<string, any[]>();

  //   for (const asm of assessments) {
  //     const sid = asm.student.id;
  //     if (!byStudent.has(sid)) byStudent.set(sid, []);
  //     byStudent.get(sid)!.push(asm);
  //   }

  //   // 4️⃣ FIX: Same logic as getClassResults — final-score average (grade config), not raw endOfTerm
  //   const results: any[] = [];

  //   for (const [studentId, items] of byStudent.entries()) {
  //     const avg = (type: string) => {
  //       const valid = items.filter(a => a.assessmentType === type && a.score > 0);
  //       if (valid.length === 0) return 0;
  //       return valid.reduce((s, a) => s + a.score, 0) / valid.length;
  //     };

  //     const subjectMap = new Map<string, any>();
  //     for (const asm of items) {
  //       const subjectName = asm.subject?.name || 'Unknown';
  //       if (!subjectMap.has(subjectName)) {
  //         subjectMap.set(subjectName, {
  //           qa1: 0,
  //           qa2: 0,
  //           endOfTerm: 0,
  //           qa1_absent: false,
  //           qa2_absent: false,
  //           endOfTerm_absent: false,
  //         });
  //       }
  //       const sub = subjectMap.get(subjectName);
  //       if (asm.assessmentType === 'qa1') {
  //         sub.qa1 = asm.score ?? 0;
  //         sub.qa1_absent = asm.isAbsent ?? false;
  //       } else if (asm.assessmentType === 'qa2') {
  //         sub.qa2 = asm.score ?? 0;
  //         sub.qa2_absent = asm.isAbsent ?? false;
  //       } else if (asm.assessmentType === 'end_of_term') {
  //         sub.endOfTerm = asm.score ?? 0;
  //         sub.endOfTerm_absent = asm.isAbsent ?? false;
  //       }
  //     }

  //     const subjects = Array.from(subjectMap.values());
  //     let totalScore = 0;
  //     for (const subject of subjects) {
  //       totalScore += this.calculateFinalScore(subject, activeGradeConfig);
  //     }
  //     const average = subjects.length > 0 ? totalScore / subjects.length : 0;

  //     results.push({
  //       studentId,
  //       qa1Raw: avg('qa1'),
  //       qa2Raw: avg('qa2'),
  //       average: parseFloat(average.toFixed(4)),
  //     });
  //   }

  //   if (results.length === 0) {
  //     console.log('No scored students — skipping rank');
  //     return;
  //   }

  //   // 5️⃣ Dense rank by average; same 0.01 tie tolerance as getClassResults
  //   const denseRank = (items: any[], field: string) => {
  //     const arr = [...items].sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0));
  //     const map = new Map<string, number>();
  //     let rank = 1;
  //     let prev = arr[0][field];
  //     map.set(arr[0].studentId, rank);
  //     for (let i = 1; i < arr.length; i++) {
  //       const curr = arr[i][field];
  //       if (field === 'average' && typeof curr === 'number' && typeof prev === 'number') {
  //         if (Math.abs(curr - prev) > 0.01) rank++;
  //       } else if (curr < prev) {
  //         rank++;
  //       }
  //       map.set(arr[i].studentId, rank);
  //       prev = curr;
  //     }
  //     return map;
  //   };

  //   const qa1Ranks = denseRank(results, 'qa1Raw');
  //   const qa2Ranks = denseRank(results, 'qa2Raw');
  //   const endRanks = denseRank(results, 'average');

  //   const rankedStudentIds = results.map(r => r.studentId);
  //   const totalRanked = rankedStudentIds.length;

  //   // 6️⃣ Update report cards
  //   for (const sid of studentIds) {
  //     let rc = await this.reportCardRepository.findOne({
  //       where: { student: { id: sid }, term }
  //     });

  //     if (!rc) {
  //       rc = this.reportCardRepository.create({
  //         student: { id: sid },
  //         term,
  //       });
  //     }

  //     rc.qa1Rank = qa1Ranks.get(sid) || 0;
  //     rc.qa2Rank = qa2Ranks.get(sid) || 0;
  //     rc.classRank = endRanks.get(sid) || 0; // FIX: endRanks = rank by final-score average (matches class results)

  //     // ✅ KEY FIX — only count ranked students
  //     rc.totalStudents = totalRanked;

  //     await this.reportCardRepository.save(rc);
  //   }

  //   console.log('--- FINISHED RANK CALCULATION ---');

  // }

  async calculateAndUpdateRanks(classId: string, term: string, schoolId?: string) {
    console.log('--- START RANK CALCULATION (OPTIMIZED) ---');

    // 1️⃣ Load class + students
    const classQuery = this.classRepository
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

    const activeGradeConfig = await this.getActiveGradeConfiguration(schoolId);

    // 2️⃣ Load assessments with subject (needed for final-score calculation like getClassResults)
    const assessments = await this.assessmentRepository.find({
      where: {
        class: { id: classId },
        student: { id: In(studentIds) },
        assessmentType: In(['qa1', 'qa2', 'end_of_term']),
      },
      relations: ['student', 'subject'],
    });

    // 3️⃣ Group by student and subject (exactly like getClassResults)
    const studentResults = new Map<string, {
      studentId: string;
      subjects: Map<string, any>;
    }>();

    for (const asm of assessments) {
      const sid = asm.student.id;
      if (!studentResults.has(sid)) {
        studentResults.set(sid, {
          studentId: sid,
          subjects: new Map()
        });
      }

      const studentData = studentResults.get(sid)!;
      const subjectName = asm.subject?.name || 'Unknown';

      if (!studentData.subjects.has(subjectName)) {
        studentData.subjects.set(subjectName, {
          qa1: 0,
          qa2: 0,
          endOfTerm: 0,
          qa1_absent: false,
          qa2_absent: false,
          endOfTerm_absent: false,
        });
      }

      const subjectData = studentData.subjects.get(subjectName)!;
      if (asm.assessmentType === 'qa1') {
        subjectData.qa1 = asm.score ?? 0;
        subjectData.qa1_absent = asm.isAbsent ?? false;
      } else if (asm.assessmentType === 'qa2') {
        subjectData.qa2 = asm.score ?? 0;
        subjectData.qa2_absent = asm.isAbsent ?? false;
      } else if (asm.assessmentType === 'end_of_term') {
        subjectData.endOfTerm = asm.score ?? 0;
        subjectData.endOfTerm_absent = asm.isAbsent ?? false;
      }
    }

    // 4️⃣ Calculate averages for each student (exactly like getClassResults)
    const results: any[] = [];

    for (const [studentId, data] of studentResults.entries()) {
      const subjects = Array.from(data.subjects.values());

      // Calculate final scores for each subject
      let totalFinalScore = 0;
      for (const subject of subjects) {
        const finalScore = this.calculateFinalScore(subject, activeGradeConfig);
        totalFinalScore += finalScore;
      }

      const average = subjects.length > 0 ? totalFinalScore / subjects.length : 0;

      // Calculate QA1 average (raw scores)
      let qa1Total = 0;
      let qa1Count = 0;
      for (const subject of subjects) {
        if (!subject.qa1_absent && subject.qa1 > 0) {
          qa1Total += subject.qa1;
          qa1Count++;
        }
      }
      const qa1Average = qa1Count > 0 ? qa1Total / qa1Count : 0;

      // Calculate QA2 average (raw scores)
      let qa2Total = 0;
      let qa2Count = 0;
      for (const subject of subjects) {
        if (!subject.qa2_absent && subject.qa2 > 0) {
          qa2Total += subject.qa2;
          qa2Count++;
        }
      }
      const qa2Average = qa2Count > 0 ? qa2Total / qa2Count : 0;

      results.push({
        studentId,
        qa1Raw: qa1Average,
        qa2Raw: qa2Average,
        average: parseFloat(average.toFixed(4)),
      });
    }

    if (results.length === 0) {
      console.log('No scored students — skipping rank');
      return;
    }

    // 5️⃣ Dense ranking function (identical to getClassResults)
    const denseRank = (items: any[], field: string) => {
      // Sort in descending order
      const sorted = [...items].sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0));

      const ranks = new Map<string, number>();
      let currentRank = 1;
      let previousValue = sorted.length > 0 ? sorted[0][field] : null;

      for (let i = 0; i < sorted.length; i++) {
        const currentValue = sorted[i][field];

        // If not first item and value is different (with tolerance for averages)
        if (i > 0) {
          let valueChanged = false;
          if (field === 'average' && typeof currentValue === 'number' && typeof previousValue === 'number') {
            valueChanged = Math.abs(currentValue - previousValue) > 0.01;
          } else if (currentValue < previousValue) {
            valueChanged = true;
          }

          if (valueChanged) {
            currentRank++;
          }
        }

        ranks.set(sorted[i].studentId, currentRank);
        previousValue = currentValue;
      }

      return ranks;
    };

    // Calculate ranks for each category
    const qa1Ranks = denseRank(results, 'qa1Raw');
    const qa2Ranks = denseRank(results, 'qa2Raw');
    const endRanks = denseRank(results, 'average');

    const totalRanked = results.length;

    // 6️⃣ Update report cards
    for (const sid of studentIds) {
      let rc = await this.reportCardRepository.findOne({
        where: { student: { id: sid }, term }
      });

      if (!rc) {
        rc = this.reportCardRepository.create({
          student: { id: sid },
          term,
        });
      }

      // Get ranks (default to 0 if student has no scores)
      rc.qa1Rank = qa1Ranks.get(sid) || 0;
      rc.qa2Rank = qa2Ranks.get(sid) || 0;
      rc.classRank = endRanks.get(sid) || 0; // This should now match getClassResults
      rc.totalStudents = totalRanked;

      await this.reportCardRepository.save(rc);
    }

    console.log('--- FINISHED RANK CALCULATION ---');
  }

  // ===== START MODIFIED: Added schoolId parameter =====
  async getClassResults(classId: string, schoolId?: string, teacherId?: string) { // ADD teacherId parameter
    const query = this.classRepository
      .createQueryBuilder('class')
      .leftJoinAndSelect('class.students', 'students')
      .leftJoinAndSelect('class.classTeacher', 'classTeacher')
      .where('class.id = :classId', { classId });

    if (schoolId) {
      query.andWhere('class.schoolId = :schoolId', { schoolId });
    }

    const classEntity = await query.getOne();

    if (!classEntity) {
      throw new NotFoundException(`Class ${classId} not found`);
    }

    const activeGradeConfig = await this.getActiveGradeConfiguration(schoolId);
    const results: any[] = [];

    // ===== ADD THIS: Get teacher's subjects for this class =====
    let teacherSubjectIds: string[] = [];
    // Get teacher's subjects for this class
    if (teacherId) {
      const teacherAssignments = await this.teachersService.getTeacherAssignments(teacherId);
      const assignmentsForThisClass = teacherAssignments.filter(a => a.classId === classId);
      teacherSubjectIds = assignmentsForThisClass.map(a => a.subjectId);
    }
    // ===== END ADD =====

    for (const student of classEntity.students) {
      // CHANGE 1: Get assessments filtered by class instead of using findByExamNumber
      let assessments = await this.assessmentRepository // ADD "let" not "const"
        .createQueryBuilder('assessment')
        .leftJoinAndSelect('assessment.subject', 'subject')
        .leftJoinAndSelect('assessment.student', 'student')
        .innerJoin('assessment.class', 'class')
        .where('student.id = :studentId', { studentId: student.id })
        .andWhere('class.id = :classId', { classId })
        .getMany();

      // ===== ADD THIS: Filter by teacher's subjects =====
      if (teacherId && teacherSubjectIds.length > 0) {
        assessments = assessments.filter(asm =>
          teacherSubjectIds.includes(asm.subject.id)
        );
      }
      // ===== END ADD =====

      // CHANGE 2: Get report card for rankings
      const reportCard = await this.reportCardRepository.findOne({
        where: {
          student: { id: student.id },
          term: classEntity.term
        }
      });

      // CHANGE 3: Build subjects from filtered assessments
      const subjectMap = new Map<string, any>();

      assessments.forEach(asm => {
        const subjectName = asm.subject?.name || 'Unknown';

        if (!subjectMap.has(subjectName)) {
          subjectMap.set(subjectName, {
            name: subjectName,
            qa1: 0,
            qa2: 0,
            endOfTerm: 0,
            // 👈 NEW: Add absent flags
            qa1_absent: false,
            qa2_absent: false,
            endOfTerm_absent: false,
          });
        }

        const subjectData = subjectMap.get(subjectName);
        if (asm.assessmentType === 'qa1') {
          subjectData.qa1 = asm.score || 0;
          subjectData.qa1_absent = asm.isAbsent || false; // 👈 NEW
        } else if (asm.assessmentType === 'qa2') {
          subjectData.qa2 = asm.score || 0;
          subjectData.qa2_absent = asm.isAbsent || false; // 👈 NEW
        } else if (asm.assessmentType === 'end_of_term') {
          subjectData.endOfTerm = asm.score || 0;
          subjectData.endOfTerm_absent = asm.isAbsent || false; // 👈 NEW
        }
      });

      const subjects = Array.from(subjectMap.values());

      if (subjects.length > 0) {
        // CHANGE 4: Calculate final scores and grades
        const enhancedSubjects = subjects.map(subject => {
          const finalScore = this.calculateFinalScore(subject, activeGradeConfig);
          const grade = this.calculateGrade(finalScore, activeGradeConfig);
          return {
            ...subject,
            finalScore,
            grade
          };
        });

        // CHANGE 5: Calculate totals and average
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
            grade: subject.grade,
            // 👈 ADD THESE THREE LINES:
            qa1_absent: subject.qa1_absent,
            qa2_absent: subject.qa2_absent,
            endOfTerm_absent: subject.endOfTerm_absent
          }))
        });
      }
    }

    // results.sort((a, b) => b.average - a.average);
    // results.forEach((result, index) => {
    //   result.rank = index + 1;
    // });

    results.sort((a, b) => b.average - a.average);

    // Apply dense ranking
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
  // ===== END MODIFIED =====

  // ===== START MODIFIED: Added schoolId parameter =====
  async updateAllReportCardsWithNewGrades(schoolId?: string) {
    const query = this.reportCardRepository
      .createQueryBuilder('reportCard')
      .leftJoinAndSelect('reportCard.student', 'student')
      .leftJoinAndSelect('student.assessments', 'assessments')
      .leftJoinAndSelect('assessments.subject', 'subject');

    if (schoolId) {
      query.where('student.schoolId = :schoolId', { schoolId });
    }

    const reportCards = await query.getMany();

    const gradeConfig = await this.getActiveGradeConfiguration(schoolId);

    for (const reportCard of reportCards) {
      const student = reportCard.student;
      const subjectMap = {};

      student.assessments?.forEach((asm) => {
        const subjectName = asm.subject?.name || 'Unknown';
        if (!subjectMap[subjectName]) {
          subjectMap[subjectName] = {
            qa1: 0,
            qa2: 0,
            endOfTerm: 0,
          };
        }

        if (asm.assessmentType === 'qa1') {
          subjectMap[subjectName].qa1 = asm.score || 0;
        } else if (asm.assessmentType === 'qa2') {
          subjectMap[subjectName].qa2 = asm.score || 0;
        } else if (asm.assessmentType === 'end_of_term') {
          subjectMap[subjectName].endOfTerm = asm.score || 0;
        }
      });

      let totalScore = 0;
      let subjectCount = 0;

      Object.values(subjectMap).forEach((subject: any) => {
        const finalScore = this.calculateFinalScore(subject, gradeConfig);
        if (finalScore > 0) {
          totalScore += finalScore;
          subjectCount++;
        }
      });

      const overallAverage = subjectCount > 0 ? totalScore / subjectCount : 0;

      reportCard.overallAverage = overallAverage;
      reportCard.overallGrade = this.calculateGrade(overallAverage, gradeConfig);

      await this.reportCardRepository.save(reportCard);
    }

    return { message: `Updated ${reportCards.length} report cards with new grade calculations` };
  }
  // ===== END MODIFIED =====
}