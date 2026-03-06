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

  // // ===== START MODIFIED: Added schoolId parameter =====
  // async findByExamNumber(examNumber: string, schoolId?: string) {
  //   const query = this.studentRepository
  //     .createQueryBuilder('student')
  //     .leftJoinAndSelect('student.assessments', 'assessments')
  //     .leftJoinAndSelect('assessments.subject', 'subject')
  //     .leftJoinAndSelect('student.reportCards', 'reportCards')
  //     .leftJoinAndSelect('student.class', 'class')
  //     .where('student.examNumber = :examNumber', { examNumber: examNumber })
  //   // .where('student.examNumber = :examNumber', { examNumber: examNumber.toUpperCase() });

  //   // if (schoolId) {
  //   //   query.andWhere('student.schoolId = :schoolId', { schoolId });
  //   // }

  //   const student = await query.getOne();

  //   if (!student) {
  //     throw new NotFoundException(`Student ${examNumber} not found`);
  //   }

  //   // const activeGradeConfig = await this.getActiveGradeConfiguration(schoolId);
  //   const activeGradeConfig = await this.getActiveGradeConfiguration(student.schoolId);
  //   return this.formatStudentData(student, activeGradeConfig);
  // }
  // ===== END MODIFIED =====

  async findByExamNumber(examNumber: string, schoolId?: string) {
    const query = this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.assessments', 'assessments')
      .leftJoinAndSelect('assessments.subject', 'subject')
      .leftJoinAndSelect('student.reportCards', 'reportCards')
      .leftJoinAndSelect('student.class', 'class')
      .where('student.examNumber = :examNumber', { examNumber: examNumber })

    const student = await query.getOne();

    if (!student) {
      throw new NotFoundException(`Student ${examNumber} not found`);
    }

    // 🔴🔴🔴 START ADDING HERE 🔴🔴🔴
    // Recalculate ranks before returning data (only if student has a class)
    // if (student.class) {
    //   // First, ensure ranks are calculated for the entire class
    //   await this.calculateAndUpdateRanks(
    //     student.class.id,
    //     student.class.term || 'Term 1, 2024/2025',
    //     student.schoolId
    //   );

    //   // Then reload the student's report card to get updated ranks
    //   student.reportCards = await this.reportCardRepository.find({
    //     where: {
    //       student: { id: student.id },
    //       term: student.class?.term || 'Term 1, 2024/2025' // Use optional chaining here
    //     }
    //   });
    // }
    // 🔴🔴🔴 END ADDING HERE 🔴🔴🔴

    const activeGradeConfig = await this.getActiveGradeConfiguration(student.schoolId);
    return this.formatStudentData(student, activeGradeConfig);
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

      // if (asm.assessmentType === 'qa1') {
      //   subjectMap[subjectName].qa1 = asm.score;
      //   subjectMap[subjectName].qa1_absent = asm.isAbsent || false; // 👈 NEW
      // } else if (asm.assessmentType === 'qa2') {
      //   subjectMap[subjectName].qa2 = asm.score;
      //   subjectMap[subjectName].qa2_absent = asm.isAbsent || false; // 👈 NEW
      // } else if (asm.assessmentType === 'end_of_term') {
      //   subjectMap[subjectName].endOfTerm = asm.score;
      //   subjectMap[subjectName].endOfTerm_absent = asm.isAbsent || false; // 👈 NEW
      //   subjectMap[subjectName].grade = this.calculateGrade(asm.score, gradeConfig, asm.isAbsent);
      // }
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

  // // ===== NO CHANGES =====
  // private calculateFinalScore(subject: any, gradeConfig: any, studentAssessments?: any[]): number {
  //   const qa1 = subject.qa1 || 0;
  //   const qa2 = subject.qa2 || 0;
  //   const endOfTerm = subject.endOfTerm || 0;

  //   // 👈 NEW: Get absent flags
  //   const qa1Absent = subject.qa1_absent || false;
  //   const qa2Absent = subject.qa2_absent || false;
  //   const endOfTermAbsent = subject.endOfTerm_absent || false;

  //   // 👈 NEW: If absent for end of term, final score is 0
  //   if (endOfTermAbsent) {
  //     return 0;
  //   }

  //   if (studentAssessments) {
  //     const hasQA1 = studentAssessments.some(a => a.assessmentType === 'qa1' && a.score > 0 || a.isAbsent);
  //     const hasQA2 = studentAssessments.some(a => a.assessmentType === 'qa2' && a.score > 0 || a.isAbsent);
  //     const hasEndOfTerm = studentAssessments.some(a => a.assessmentType === 'end_of_term' && a.score > 0 || a.isAbsent);

  //     if ((hasQA1 || hasQA2) && !hasEndOfTerm) {
  //       return endOfTerm;
  //     }
  //   }

  //   switch (gradeConfig.calculation_method) {
  //     case 'average_all':
  //       // 👈 NEW: Don't include absent assessments in average
  //       let total = 0;
  //       let count = 0;
  //       if (!qa1Absent) { total += qa1; count++; }
  //       if (!qa2Absent) { total += qa2; count++; }
  //       if (!endOfTermAbsent) { total += endOfTerm; count++; }
  //       return count > 0 ? total / count : 0;

  //       return (qa1 + qa2 + endOfTerm) / 3;
  //     case 'end_of_term_only':
  //       // return endOfTerm;
  //       // 👈 NEW: If absent, return 0
  //       return endOfTermAbsent ? 0 : endOfTerm;

  //     case 'weighted_average':
  //       // 👈 NEW: Only include non-absent assessments
  //       let weightedTotal = 0;
  //       let weightTotal = 0;
  //       if (!qa1Absent) {
  //         weightedTotal += qa1 * gradeConfig.weight_qa1;
  //         weightTotal += gradeConfig.weight_qa1;
  //       }
  //       if (!qa2Absent) {
  //         weightedTotal += qa2 * gradeConfig.weight_qa2;
  //         weightTotal += gradeConfig.weight_qa2;
  //       }
  //       if (!endOfTermAbsent) {
  //         weightedTotal += endOfTerm * gradeConfig.weight_end_of_term;
  //         weightTotal += gradeConfig.weight_end_of_term;
  //       }
  //       return weightTotal > 0 ? weightedTotal / weightTotal : 0;

  //     default:
  //       return (qa1 + qa2 + endOfTerm) / 3;



  //     //   return (qa1 * gradeConfig.weight_qa1 +
  //     //     qa2 * gradeConfig.weight_qa2 +
  //     //     endOfTerm * gradeConfig.weight_end_of_term) / 100;
  //     // default:
  //     //   return (qa1 + qa2 + endOfTerm) / 3;
  //   }
  // }
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

  // async upsertAssessment(assessmentData: any, schoolId?: string) {
  //   if (schoolId) {
  //     const student = await this.studentRepository.findOne({
  //       where: {
  //         id: assessmentData.student_id || assessmentData.studentId,
  //         schoolId
  //       },
  //       relations: ['class']
  //     });
  //     if (!student) {
  //       throw new NotFoundException('Student not found in your school');
  //     }
  //   }

  //   const student = await this.studentRepository.findOne({
  //     where: { id: assessmentData.student_id || assessmentData.studentId },
  //     relations: ['class']
  //   });

  //   if (!student) {
  //     throw new NotFoundException('Student not found');
  //   }

  //   if (!student.class) {
  //     throw new NotFoundException('Student is not assigned to any class');
  //   }

  //   // 🔴🔴🔴 NEW CODE: Check if this field was actually modified by user
  //   // If score is null or undefined, skip processing this field entirely
  //   if (assessmentData.score === null || assessmentData.score === undefined) {
  //     console.log('Field not modified, skipping...');
  //     return { skipped: true, message: 'Field not modified' };
  //   }
  //   // 🔴🔴🔴 END NEW CODE

  //   const isAbsent = assessmentData.is_absent === true;

  //   // 🔴🔴🔴 MODIFIED: Handle empty string as "no change"
  //   if (assessmentData.score === '') {
  //     console.log('Empty string received - treating as no change');
  //     return { skipped: true, message: 'Empty field - no change' };
  //   }
  //   // 🔴🔴🔴 END MODIFIED

  //   const activeConfig = await this.getActiveGradeConfiguration(schoolId);

  //   // 🔴🔴🔴 MODIFIED: Only create/update if we have actual data
  //   const data = {
  //     student: { id: assessmentData.student_id || assessmentData.studentId },
  //     subject: { id: assessmentData.subject_id || assessmentData.subjectId },
  //     assessmentType: assessmentData.assessment_type || assessmentData.assessmentType,
  //     score: isAbsent ? 0 : Number(assessmentData.score), // Ensure score is number
  //     isAbsent: isAbsent,
  //     grade: isAbsent ? 'AB' : this.calculateGrade(Number(assessmentData.score), activeConfig),
  //     class: { id: student.class.id }
  //   };

  //   const existing = await this.assessmentRepository.findOne({
  //     where: {
  //       student: { id: data.student.id },
  //       subject: { id: data.subject.id },
  //       assessmentType: data.assessmentType,
  //       class: { id: student.class.id }
  //     },
  //   });

  //   if (existing) {
  //     // 🔴🔴🔴 MODIFIED: Check if values actually changed before updating
  //     const hasChanges =
  //       existing.score !== data.score ||
  //       existing.isAbsent !== data.isAbsent ||
  //       existing.grade !== data.grade;

  //     if (!hasChanges) {
  //       console.log('No changes detected, skipping update');
  //       return { unchanged: true, message: 'No changes detected' };
  //     }
  //     // 🔴🔴🔴 END MODIFIED

  //     Object.assign(existing, data);
  //     const result = await this.assessmentRepository.save(existing);

  //     if (student.class) {
  //       setTimeout(async () => {
  //         await this.calculateAndUpdateRanks(
  //           student.class!.id,
  //           student.class!.term || 'Term 1, 2024/2025',
  //           schoolId
  //         );
  //       }, 100);
  //     }

  //     return result;
  //   } else {
  //     // 🔴🔴🔴 MODIFIED: Only create if score is not 0 or isAbsent is true
  //     // This prevents creating records for empty fields
  //     if (data.score === 0 && !data.isAbsent) {
  //       console.log('Score is 0 but not absent - not creating record');
  //       return { skipped: true, message: 'Zero without absent - not saving' };
  //     }
  //     // 🔴🔴🔴 END MODIFIED

  //     const assessment = this.assessmentRepository.create(data);
  //     const result = await this.assessmentRepository.save(assessment);

  //     if (student.class) {
  //       setTimeout(async () => {
  //         await this.calculateAndUpdateRanks(
  //           student.class!.id,
  //           student.class!.term || 'Term 1, 2024/2025',
  //           schoolId
  //         );
  //       }, 100);
  //     }

  //     return result;
  //   }
  // }

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

      if (student.class) {
        setTimeout(async () => {
          await this.calculateAndUpdateRanks(
            student.class!.id,
            student.class!.term || 'Term 1, 2024/2025',
            schoolId
          );
        }, 100);
      }

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

      if (student.class) {
        setTimeout(async () => {
          await this.calculateAndUpdateRanks(
            student.class!.id,
            student.class!.term || 'Term 1, 2024/2025',
            schoolId
          );
        }, 100);
      }

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

  // ===== START MODIFIED: Added schoolId parameter =====
  // async createSubject(subjectData: { name: string }, schoolId?: string) {
  //   const subject = this.subjectRepository.create({
  //     ...subjectData,
  //     schoolId: schoolId,
  //   });
  //   return this.subjectRepository.save(subject);
  // }
  // src/students/students.service.ts

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


  // async calculateAndUpdateRanks(classId: string, term: string, schoolId?: string) {
  //   console.log(`--- STARTING RANK CALCULATION (Exact String Match) ---`);

  //   // 1. Fetch Class
  //   const query = this.classRepository
  //     .createQueryBuilder('class')
  //     .leftJoinAndSelect('class.students', 'students')
  //     .where('class.id = :classId', { classId });

  //   if (schoolId) query.andWhere('class.schoolId = :schoolId', { schoolId });

  //   const classEntity = await query.getOne();
  //   if (!classEntity) throw new NotFoundException(`Class ${classId} not found`);

  //   const studentIds = classEntity.students.map((s) => s.id);
  //   const results: any[] = [];

  //   // 2. Calculate Averages
  //   for (const studentId of studentIds) {
  //     // Get assessments for THIS CLASS only
  //     const assessments = await this.assessmentRepository.find({
  //       where: {
  //         student: { id: studentId },
  //         class: { id: classId },
  //         assessmentType: In(['qa1', 'qa2', 'end_of_term']),
  //       },
  //     });

  //     // Helper to calculate Average
  //     const calculateAvg = (type: string) => {
  //       const typeAssessments = assessments.filter(a => a.assessmentType === type);
  //       // Only count subjects where score > 0 (or strictly present)
  //       const validAssessments = typeAssessments.filter(a => a.score > 0);

  //       const sum = validAssessments.reduce((acc, curr) => acc + curr.score, 0);
  //       const count = validAssessments.length;

  //       // Returns raw number
  //       return count > 0 ? sum / count : 0;
  //     };

  //     results.push({
  //       studentId,
  //       qa1Raw: calculateAvg('qa1'),
  //       qa2Raw: calculateAvg('qa2'),
  //       endTermRaw: calculateAvg('end_of_term'),
  //     });
  //   }

  //   // 3. RANKING LOGIC (The "Nuclear" Option)
  //   // We convert score to string "XX.XX" to guarantee equality
  //   const applyDenseRanking = (items: any[], rawField: string) => {

  //     // Add a 'formatted' string field to each item for comparison
  //     const itemsWithString = items.map(item => {
  //       const raw = item[rawField];
  //       return {
  //         ...item,
  //         // "toFixed(2)" turns 66.6666667 into string "66.67"
  //         // This removes ALL floating point microscopic differences
  //         formattedScore: parseFloat(raw.toFixed(2))
  //       };
  //     });

  //     // Sort by the FORMATTED score (Descending)
  //     itemsWithString.sort((a, b) => b.formattedScore - a.formattedScore);

  //     const rankedMap = new Map<string, number>();
  //     if (itemsWithString.length === 0) return rankedMap;

  //     let currentRank = 1;
  //     let previousScore = itemsWithString[0].formattedScore;

  //     // Assign Rank 1 to first student
  //     rankedMap.set(itemsWithString[0].studentId, currentRank);

  //     for (let i = 1; i < itemsWithString.length; i++) {
  //       const item = itemsWithString[i];
  //       const currentScore = item.formattedScore;

  //       // COMPARE: Is "85.50" different from "85.50"?
  //       if (currentScore < previousScore) {
  //         currentRank++; // Different score -> Rank increases (1, 1, 2)
  //       }
  //       // If equal, Rank stays same (1, 1)

  //       rankedMap.set(item.studentId, currentRank);
  //       previousScore = currentScore;
  //     }

  //     return rankedMap;
  //   };

  //   // Calculate Ranks
  //   const qa1Ranks = applyDenseRanking(results, 'qa1Raw');
  //   const qa2Ranks = applyDenseRanking(results, 'qa2Raw');
  //   const endTermRanks = applyDenseRanking(results, 'endTermRaw');

  //   // 4. Update Database
  //   for (const studentId of studentIds) {
  //     let reportCard = await this.reportCardRepository.findOne({
  //       where: { student: { id: studentId }, term },
  //     });

  //     if (!reportCard) {
  //       reportCard = this.reportCardRepository.create({
  //         student: { id: studentId },
  //         term,
  //         totalStudents: studentIds.length,
  //       });
  //     }

  //     reportCard.qa1Rank = qa1Ranks.get(studentId) || 0;
  //     reportCard.qa2Rank = qa2Ranks.get(studentId) || 0;
  //     reportCard.classRank = endTermRanks.get(studentId) || 0;
  //     reportCard.totalStudents = studentIds.length;

  //     await this.reportCardRepository.save(reportCard);
  //   }

  //   console.log(`--- FINISHED: Ranks updated using 2-decimal Fixed Comparison ---`);
  //   return { message: 'Ranks calculated successfully' };
  // }

  // async calculateAndUpdateRanks(classId: string, term: string, schoolId?: string) {
  //   console.log(`--- STARTING RANK CALCULATION (Consistent with getClassResults) ---`);

  //   // 1. Fetch Class
  //   const query = this.classRepository
  //     .createQueryBuilder('class')
  //     .leftJoinAndSelect('class.students', 'students')
  //     .where('class.id = :classId', { classId });

  //   if (schoolId) query.andWhere('class.schoolId = :schoolId', { schoolId });

  //   const classEntity = await query.getOne();
  //   if (!classEntity) throw new NotFoundException(`Class ${classId} not found`);

  //   const students = classEntity.students;
  //   const studentResults: any[] = [];

  //   // 2. Calculate Averages for EACH STUDENT (same logic as getClassResults)
  //   for (const student of students) {
  //     // Get assessments for THIS CLASS only
  //     const assessments = await this.assessmentRepository.find({
  //       where: {
  //         student: { id: student.id },
  //         class: { id: classId },
  //         assessmentType: In(['qa1', 'qa2', 'end_of_term']),
  //       },
  //       relations: ['subject']
  //     });

  //     // Build subjects from assessments (same as getClassResults)
  //     const subjectMap = new Map<string, any>();

  //     assessments.forEach(asm => {
  //       const subjectName = asm.subject?.name || 'Unknown';

  //       if (!subjectMap.has(subjectName)) {
  //         subjectMap.set(subjectName, {
  //           qa1: 0,
  //           qa2: 0,
  //           endOfTerm: 0,
  //         });
  //       }

  //       const subjectData = subjectMap.get(subjectName);
  //       if (asm.assessmentType === 'qa1') {
  //         subjectData.qa1 = asm.score || 0;
  //       } else if (asm.assessmentType === 'qa2') {
  //         subjectMap.get(subjectName).qa2 = asm.score || 0;
  //       } else if (asm.assessmentType === 'end_of_term') {
  //         subjectMap.get(subjectName).endOfTerm = asm.score || 0;
  //       }
  //     });

  //     const subjects = Array.from(subjectMap.values());

  //     // Get active grade config
  //     const activeGradeConfig = await this.getActiveGradeConfiguration(schoolId);

  //     // Calculate final scores and grades (same as getClassResults)
  //     const enhancedSubjects = subjects.map(subject => {
  //       const finalScore = this.calculateFinalScore(subject, activeGradeConfig);
  //       return {
  //         ...subject,
  //         finalScore,
  //         grade: this.calculateGrade(finalScore, activeGradeConfig)
  //       };
  //     });

  //     // Calculate average (same as getClassResults)
  //     const totalScore = enhancedSubjects.reduce((sum, subject) => sum + subject.finalScore, 0);
  //     const average = enhancedSubjects.length > 0 ? totalScore / enhancedSubjects.length : 0;

  //     // Only include students who have at least one valid assessment
  //     const hasValidScores = enhancedSubjects.some(subject =>
  //       subject.qa1 > 0 || subject.qa2 > 0 || subject.endOfTerm > 0
  //     );

  //     if (hasValidScores) {
  //       studentResults.push({
  //         studentId: student.id,
  //         average,
  //         qa1Avg: enhancedSubjects.reduce((sum, s) => sum + s.qa1, 0) / enhancedSubjects.length,
  //         qa2Avg: enhancedSubjects.reduce((sum, s) => sum + s.qa2, 0) / enhancedSubjects.length,
  //         endTermAvg: enhancedSubjects.reduce((sum, s) => sum + s.endOfTerm, 0) / enhancedSubjects.length,
  //       });
  //     }
  //   }

  //   // 3. DENSE RANKING (Must match getClassResults logic EXACTLY)
  //   const calculateRanks = (items: any[], scoreField: string): Map<string, number> => {
  //     const rankMap = new Map<string, number>();

  //     // Sort by score descending (same as getClassResults)
  //     const sorted = [...items]
  //       .sort((a, b) => b[scoreField] - a[scoreField]);

  //     if (sorted.length === 0) return rankMap;

  //     // Apply DENSE ranking (same as getClassResults)
  //     let currentRank = 1;
  //     let previousScore = sorted[0][scoreField];

  //     // First student gets rank 1
  //     rankMap.set(sorted[0].studentId, currentRank);

  //     for (let i = 1; i < sorted.length; i++) {
  //       const item = sorted[i];
  //       const currentScore = item[scoreField];

  //       // Use same tolerance as getClassResults
  //       if (Math.abs(currentScore - previousScore) > 0.01) {
  //         currentRank++;
  //       }

  //       rankMap.set(item.studentId, currentRank);
  //       previousScore = currentScore;
  //     }

  //     return rankMap;
  //   };

  //   // Calculate ranks using EXACT SAME LOGIC as getClassResults
  //   const qa1Ranks = calculateRanks(studentResults, 'qa1Avg');
  //   const qa2Ranks = calculateRanks(studentResults, 'qa2Avg');
  //   const endTermRanks = calculateRanks(studentResults, 'endTermAvg');

  //   // 4. Update ALL students in the class (including those without scores)
  //   for (const student of students) {
  //     let reportCard = await this.reportCardRepository.findOne({
  //       where: { student: { id: student.id }, term },
  //     });

  //     if (!reportCard) {
  //       reportCard = this.reportCardRepository.create({
  //         student: { id: student.id },
  //         term,
  //         totalStudents: students.length,
  //       });
  //     }

  //     // Check if student has valid scores
  //     const studentHasScores = studentResults.some(r => r.studentId === student.id);

  //     if (studentHasScores) {
  //       // Student has scores: assign proper rank
  //       reportCard.qa1Rank = qa1Ranks.get(student.id) || 0;
  //       reportCard.qa2Rank = qa2Ranks.get(student.id) || 0;
  //       reportCard.classRank = endTermRanks.get(student.id) || 0;
  //     } else {
  //       // Student has NO scores: rank = 0 (will be excluded from getClassResults)
  //       reportCard.qa1Rank = 0;
  //       reportCard.qa2Rank = 0;
  //       reportCard.classRank = 0;
  //     }

  //     // reportCard.totalStudents = students.length;
  //     reportCard.totalStudents = studentResults.length;

  //     await this.reportCardRepository.save(reportCard);
  //   }

  //   console.log(`--- FINISHED: Ranks updated for ${students.length} students ---`);
  //   console.log(`--- Students with valid scores: ${studentResults.length} ---`);

  //   return {
  //     message: 'Ranks calculated successfully',
  //     studentsWithScores: studentResults.length,
  //     totalStudents: students.length
  //   };
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

    // 2️⃣ Load ALL assessments for this class in ONE query
    const assessments = await this.assessmentRepository.find({
      where: {
        class: { id: classId },
        student: { id: In(studentIds) },
        assessmentType: In(['qa1', 'qa2', 'end_of_term']),
      },
      relations: ['student'],
    });

    // 3️⃣ Group by student
    const byStudent = new Map<string, any[]>();

    for (const asm of assessments) {
      const sid = asm.student.id;
      if (!byStudent.has(sid)) byStudent.set(sid, []);
      byStudent.get(sid)!.push(asm);
    }

    // 4️⃣ Build result averages — ONLY students with end_of_term scores enter ranking
    const results: any[] = [];

    for (const [studentId, items] of byStudent.entries()) {

      const avg = (type: string) => {
        const valid = items.filter(a => a.assessmentType === type && a.score > 0);
        if (valid.length === 0) return 0;
        return valid.reduce((s, a) => s + a.score, 0) / valid.length;
      };

      const endAvg = avg('end_of_term');

      // // 🚨 KEY FIX — skip students with NO end term scores
      // if (endAvg === 0) continue;

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

    // 5️⃣ Dense ranking with float safety
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

      rc.qa1Rank = qa1Ranks.get(sid) || 0;
      rc.qa2Rank = qa2Ranks.get(sid) || 0;
      rc.classRank = endRanks.get(sid) || 0;

      // ✅ KEY FIX — only count ranked students
      rc.totalStudents = totalRanked;

      await this.reportCardRepository.save(rc);
    }

    console.log('--- FINISHED RANK CALCULATION ---');

  }


  // async calculateAndUpdateRanks(classId: string, term: string, schoolId?: string) {
  //   const query = this.classRepository
  //     .createQueryBuilder('class')
  //     .leftJoinAndSelect('class.students', 'students')
  //     .where('class.id = :classId', { classId });

  //   if (schoolId) {
  //     query.andWhere('class.schoolId = :schoolId', { schoolId });
  //   }

  //   const classEntity = await query.getOne();

  //   if (!classEntity) {
  //     throw new NotFoundException(`Class ${classId} not found`);
  //   }

  //   const studentIds = classEntity.students.map(s => s.id);
  //   const results: any[] = [];

  //   for (const studentId of studentIds) {
  //     const assessments = await this.assessmentRepository.find({
  //       where: {
  //         student: { id: studentId },
  //         assessmentType: In(['qa1', 'qa2', 'end_of_term'])
  //       },
  //       relations: ['subject']
  //     });

  //     const qa1Total = assessments
  //       .filter(a => a.assessmentType === 'qa1')
  //       .reduce((sum, a) => sum + a.score, 0);

  //     const qa2Total = assessments
  //       .filter(a => a.assessmentType === 'qa2')
  //       .reduce((sum, a) => sum + a.score, 0);

  //     const endTermTotal = assessments
  //       .filter(a => a.assessmentType === 'end_of_term')
  //       .reduce((sum, a) => sum + a.score, 0);

  //     const qa1Subjects = assessments.filter(a => a.assessmentType === 'qa1' && a.score > 0).length;
  //     const qa2Subjects = assessments.filter(a => a.assessmentType === 'qa2' && a.score > 0).length;
  //     const endTermSubjects = assessments.filter(a => a.assessmentType === 'end_of_term' && a.score > 0).length;

  //     const qa1Avg = qa1Subjects > 0 ? qa1Total / qa1Subjects : 0;
  //     const qa2Avg = qa2Subjects > 0 ? qa2Total / qa2Subjects : 0;
  //     const endTermAvg = endTermSubjects > 0 ? endTermTotal / endTermSubjects : 0;

  //     results.push({
  //       studentId,
  //       qa1Avg,
  //       qa2Avg,
  //       endTermAvg,
  //     });
  //   }

  //   // Helper function for dense ranking (tie handling)
  //   // const applyDenseRanking = (items: any[], scoreField: string) => {
  //   //   // Sort by score descending
  //   //   const sorted = [...items]
  //   //     .filter(item => item[scoreField] > 0)
  //   //     .sort((a, b) => b[scoreField] - a[scoreField]);

  //   //   // Apply dense ranking
  //   //   let rank = 1;
  //   //   let previousScore = null;
  //   //   let skipCount = 0;

  //   //   const rankedItems = new Map<string, number>();

  //   //   for (let i = 0; i < sorted.length; i++) {
  //   //     const item = sorted[i];

  //   //     if (previousScore !== null && item[scoreField] === previousScore) {
  //   //       // Tie: Same rank as previous student
  //   //       skipCount++;
  //   //       rankedItems.set(item.studentId, rank);
  //   //     } else {
  //   //       // New score: Update rank
  //   //       rank += skipCount;
  //   //       skipCount = 0;
  //   //       rankedItems.set(item.studentId, rank);
  //   //     }

  //   //     previousScore = item[scoreField];
  //   //   }

  //   //   return rankedItems;
  //   // };

  //   // Helper function for dense ranking (tie handling) - SIMPLE CORRECT VERSION
  //   //   const applyDenseRanking = (items: any[], scoreField: string) => {
  //   //     // Sort by score descending
  //   //     const sorted = [...items]
  //   //       .filter(item => item[scoreField] > 0)
  //   //       .sort((a, b) => b[scoreField] - a[scoreField]);

  //   //     const rankedItems = new Map<string, number>();

  //   //     if (sorted.length === 0) return rankedItems;

  //   //     let currentRank = 1;
  //   //     let previousScore = sorted[0][scoreField];

  //   //     // First student gets rank 1
  //   //     rankedItems.set(sorted[0].studentId, currentRank);

  //   //     for (let i = 1; i < sorted.length; i++) {
  //   //       const item = sorted[i];
  //   //       const currentScore = item[scoreField];

  //   //       if (currentScore !== previousScore) {
  //   //         // Different score: increase rank by 1
  //   //         currentRank++;  // ✅ FIXED: Changed from i + 1 to currentRank++
  //   //       }
  //   //       // Same score: keep same rank

  //   //       rankedItems.set(item.studentId, currentRank);
  //   //       previousScore = currentScore;
  //   //     }

  //   //     return rankedItems;
  //   //   };

  //   //   // Calculate ranks with tie handling
  //   //   const qa1Ranks = applyDenseRanking(results, 'qa1Avg');
  //   //   const qa2Ranks = applyDenseRanking(results, 'qa2Avg');
  //   //   const endTermRanks = applyDenseRanking(results, 'endTermAvg');

  //   //   // Update report cards with correct ranks
  //   //   for (const studentId of studentIds) {
  //   //     let reportCard = await this.reportCardRepository.findOne({
  //   //       where: {
  //   //         student: { id: studentId },
  //   //         term,
  //   //       },
  //   //     });

  //   //     if (!reportCard) {
  //   //       reportCard = this.reportCardRepository.create({
  //   //         student: { id: studentId },
  //   //         term,
  //   //         totalStudents: studentIds.length,
  //   //       });
  //   //     }

  //   //     const studentResult = results.find(r => r.studentId === studentId);
  //   //     if (studentResult) {
  //   //       // Get ranks with tie handling (returns 0 if no valid score)
  //   //       reportCard.qa1Rank = qa1Ranks.get(studentId) || 0;
  //   //       reportCard.qa2Rank = qa2Ranks.get(studentId) || 0;
  //   //       reportCard.classRank = endTermRanks.get(studentId) || 0;
  //   //       reportCard.totalStudents = studentIds.length;
  //   //     }

  //   //     await this.reportCardRepository.save(reportCard);
  //   //   }

  //   //   return { message: 'Ranks calculated and updated successfully with tie handling' };
  //   // }

  //   // Helper function for dense ranking (tie handling) - FIXED WITH ROUNDING
  //   const applyDenseRanking = (items: any[], scoreField: string) => {
  //     // HELPER: Round to 2 decimal places to fix floating point errors
  //     // This ensures 85.00001 and 84.99999 are both treated as 85.00
  //     const roundScore = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

  //     // Sort by score descending
  //     const sorted = [...items]
  //       .filter(item => item[scoreField] > 0)
  //       .sort((a, b) => b[scoreField] - a[scoreField]);

  //     const rankedItems = new Map<string, number>();

  //     if (sorted.length === 0) return rankedItems;

  //     let currentRank = 1;
  //     // Initialize previousScore using the rounded value of the first item
  //     let previousScore = roundScore(sorted[0][scoreField]);

  //     // First student gets rank 1
  //     rankedItems.set(sorted[0].studentId, currentRank);

  //     for (let i = 1; i < sorted.length; i++) {
  //       const item = sorted[i];
  //       // Round the current score before comparing
  //       const currentScore = roundScore(item[scoreField]);

  //       if (currentScore !== previousScore) {
  //         // Different score: increase rank by 1 (Dense Ranking 1, 1, 2)
  //         currentRank++;
  //       }
  //       // If scores are equal (after rounding), rank stays the same

  //       rankedItems.set(item.studentId, currentRank);
  //       previousScore = currentScore;
  //     }

  //     return rankedItems;
  //   };

  //   // Calculate ranks with tie handling
  //   const qa1Ranks = applyDenseRanking(results, 'qa1Avg');
  //   const qa2Ranks = applyDenseRanking(results, 'qa2Avg');
  //   const endTermRanks = applyDenseRanking(results, 'endTermAvg');

  //   // Update report cards with correct ranks
  //   for (const studentId of studentIds) {
  //     let reportCard = await this.reportCardRepository.findOne({
  //       where: {
  //         student: { id: studentId },
  //         term,
  //       },
  //     });

  //     if (!reportCard) {
  //       reportCard = this.reportCardRepository.create({
  //         student: { id: studentId },
  //         term,
  //         totalStudents: studentIds.length,
  //       });
  //     }

  //     const studentResult = results.find(r => r.studentId === studentId);
  //     if (studentResult) {
  //       // Get ranks with tie handling (returns 0 if no valid score)
  //       reportCard.qa1Rank = qa1Ranks.get(studentId) || 0;
  //       reportCard.qa2Rank = qa2Ranks.get(studentId) || 0;
  //       reportCard.classRank = endTermRanks.get(studentId) || 0;
  //       reportCard.totalStudents = studentIds.length;
  //     }

  //     await this.reportCardRepository.save(reportCard);
  //   }

  //   return { message: 'Ranks calculated and updated successfully with tie handling' };
  // }

  // // ===== START MODIFIED: Added schoolId parameter =====
  // async getClassResults(classId: string, schoolId?: string) {
  //   const query = this.classRepository
  //     .createQueryBuilder('class')
  //     .leftJoinAndSelect('class.students', 'students')
  //     .leftJoinAndSelect('class.classTeacher', 'classTeacher') // ADDED
  //     .where('class.id = :classId', { classId });

  //   if (schoolId) {
  //     query.andWhere('class.schoolId = :schoolId', { schoolId });
  //   }

  //   const classEntity = await query.getOne();

  //   if (!classEntity) {
  //     throw new NotFoundException(`Class ${classId} not found`);
  //   }

  //   const activeGradeConfig = await this.getActiveGradeConfiguration(schoolId);
  //   const results: any[] = [];

  //   for (const student of classEntity.students) {
  //     const studentData = await this.findByExamNumber(student.examNumber, schoolId);

  //     if (studentData && studentData.subjects && studentData.subjects.length > 0) {
  //       results.push({
  //         id: student.id,
  //         name: student.name,
  //         examNumber: student.examNumber,
  //         classRank: studentData.classRank || 0,
  //         totalScore: studentData.subjects.reduce((sum, subject) => {
  //           const finalScore = subject.finalScore || ((subject.qa1 + subject.qa2 + subject.endOfTerm) / 3);
  //           return sum + finalScore;
  //         }, 0),
  //         average: studentData.subjects.reduce((sum, subject) => {
  //           const finalScore = subject.finalScore || ((subject.qa1 + subject.qa2 + subject.endOfTerm) / 3);
  //           return sum + finalScore;
  //         }, 0) / studentData.subjects.length,
  //         overallGrade: this.calculateGrade(
  //           studentData.subjects.reduce((sum, subject) => {
  //             const finalScore = subject.finalScore || ((subject.qa1 + subject.qa2 + subject.endOfTerm) / 3);
  //             return sum + finalScore;
  //           }, 0) / studentData.subjects.length,
  //           activeGradeConfig
  //         ),
  //         subjects: studentData.subjects.map(subject => ({
  //           name: subject.name,
  //           qa1: subject.qa1,
  //           qa2: subject.qa2,
  //           endOfTerm: subject.endOfTerm,
  //           finalScore: subject.finalScore || ((subject.qa1 + subject.qa2 + subject.endOfTerm) / 3),
  //           grade: subject.grade
  //         }))
  //       });
  //     }
  //   }

  //   results.sort((a, b) => b.average - a.average);
  //   results.forEach((result, index) => {
  //     result.rank = index + 1;
  //   });

  //   return results;
  // }
  // // ===== END MODIFIED =====
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


    // REPLACE WITH THIS (11 lines):
    // results.sort((a, b) => b.average - a.average);

    // // Apply dense ranking
    // let currentRank = 1;
    // let previousAverage = results.length > 0 ? results[0].average : null;

    // for (let i = 0; i < results.length; i++) {
    //   if (i > 0 && Math.abs(results[i].average - previousAverage) > 0.01) {
    //     currentRank++;
    //   }
    //   results[i].rank = currentRank;
    //   previousAverage = results[i].average;
    // }
    // return results;
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