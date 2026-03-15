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
import { Archive } from './entities/archive.entity';
import { StudentReportArchive } from './entities/student-report-archive.entity';
import * as bcrypt from 'bcryptjs';

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

    @InjectRepository(Archive) // ADD THIS
    private archiveRepository: Repository<Archive>, // ADD THIS
    @InjectRepository(StudentReportArchive) // ADD THIS
    private studentReportArchiveRepository: Repository<StudentReportArchive>, // ADD THIS
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
  //     .leftJoinAndSelect('student.assessments', 'assessments')
  //     .leftJoinAndSelect('assessments.subject', 'subject')
  //     .leftJoinAndSelect('student.reportCards', 'reportCards')
  //     .leftJoinAndSelect('student.class', 'class')
  //     .where('student.examNumber = :examNumber', { examNumber: examNumber })

  //   const student = await query.getOne();

  //   if (!student) {
  //     throw new NotFoundException(`Student ${examNumber} not found`);
  //   }

  //   // Check if any assessments are locked for this student
  //   const lockedAssessments = await this.assessmentRepository.find({
  //     where: {
  //       student: { id: student.id },
  //       is_locked: true
  //     }
  //   });

  //   if (lockedAssessments.length > 0) {
  //     return {
  //       id: student.id,
  //       name: student.name,
  //       examNumber: student.examNumber,
  //       class: student.class?.name || 'Unknown',
  //       term: student.class?.term || 'Term 1, 2024/2025',
  //       academicYear: student.class?.academic_year || '2024/2025',
  //       photo: student.photoUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
  //       resultsLocked: true,
  //       message: "Results Locked - Please contact the school administration",
  //       subjects: [],
  //       attendance: { present: 0, absent: 0, late: 0 }
  //     };
  //   }

  //   const activeGradeConfig = await this.getActiveGradeConfiguration(student.schoolId);

  //   // Get the formatted student data
  //   const studentData = this.formatStudentData(student, activeGradeConfig);

  //   // Get report card for current term
  //   const currentTerm = student.class?.term;
  //   const reportCard = student.reportCards?.find(rc => rc.term === currentTerm);

  //   // If no report card or nothing published, return empty data
  //   if (!reportCard || (!reportCard.qa1_published && !reportCard.qa2_published && !reportCard.endOfTerm_published)) {
  //     return {
  //       ...studentData,
  //       subjects: [],
  //       message: "No results have been published yet"
  //     };
  //   }

  //   // Filter subjects based on published status
  //   studentData.subjects = studentData.subjects.map(subject => {
  //     const filteredSubject = { ...subject };

  //     // Hide QA1 if not published
  //     if (!reportCard.qa1_published) {
  //       filteredSubject.qa1 = null;
  //       filteredSubject.qa1_absent = false;
  //     }

  //     // Hide QA2 if not published
  //     if (!reportCard.qa2_published) {
  //       filteredSubject.qa2 = null;
  //       filteredSubject.qa2_absent = false;
  //     }

  //     // Hide End of Term if not published
  //     if (!reportCard.endOfTerm_published) {
  //       filteredSubject.endOfTerm = null;
  //       filteredSubject.endOfTerm_absent = false;
  //     }

  //     return filteredSubject;
  //   });

  //   return studentData;
  // }

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

  //   // 🔴🔴🔴 ADD THIS: Check if any assessments are locked for this student
  //   const lockedAssessments = await this.assessmentRepository.find({
  //     where: {
  //       student: { id: student.id },
  //       is_locked: true
  //     }
  //   });

  //   if (lockedAssessments.length > 0) {
  //     return {
  //       id: student.id,
  //       name: student.name,
  //       examNumber: student.examNumber,
  //       class: student.class?.name || 'Unknown',
  //       term: student.class?.term || 'Term 1, 2025/2026',
  //       academicYear: student.class?.academic_year || '2025/2026',
  //       photo: student.photoUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
  //       resultsLocked: true,
  //       message: "Results Withheld - Please contact the school administration to clear your fee balance",
  //       subjects: [],
  //       attendance: { present: 0, absent: 0, late: 0 },
  //       classRank: 0,
  //       qa1Rank: 0,
  //       qa2Rank: 0,
  //       totalStudents: 0,
  //       teacherRemarks: '',
  //       assessmentStats: {
  //         qa1: { classRank: 0, termAverage: 0, overallGrade: 'N/A' },
  //         qa2: { classRank: 0, termAverage: 0, overallGrade: 'N/A' },
  //         endOfTerm: {
  //           classRank: 0,
  //           termAverage: 0,
  //           overallGrade: 'N/A',
  //           attendance: { present: 0, absent: 0, late: 0 }
  //         },
  //         overall: { termAverage: 0, calculationMethod: 'N/A' }
  //       }
  //     };
  //   }

  //   const activeGradeConfig = await this.getActiveGradeConfiguration(student.schoolId);

  //   // Get the formatted student data
  //   const studentData = this.formatStudentData(student, activeGradeConfig);

  //   // Get report card for current term
  //   const currentTerm = student.class?.term;
  //   const reportCard = student.reportCards?.find(rc => rc.term === currentTerm);

  //   // If no report card or nothing published, return empty data
  //   if (!reportCard || (!reportCard.qa1_published && !reportCard.qa2_published && !reportCard.endOfTerm_published)) {
  //     return {
  //       ...studentData,
  //       subjects: [],
  //       message: "No results have been published yet"
  //     };
  //   }

  //   // Filter subjects based on published status
  //   studentData.subjects = studentData.subjects.map(subject => {
  //     const filteredSubject = { ...subject };

  //     // Hide QA1 if not published
  //     if (!reportCard.qa1_published) {
  //       filteredSubject.qa1 = null;
  //       filteredSubject.qa1_absent = false;
  //     }

  //     // Hide QA2 if not published
  //     if (!reportCard.qa2_published) {
  //       filteredSubject.qa2 = null;
  //       filteredSubject.qa2_absent = false;
  //     }

  //     // Hide End of Term if not published
  //     if (!reportCard.endOfTerm_published) {
  //       filteredSubject.endOfTerm = null;
  //       filteredSubject.endOfTerm_absent = false;
  //     }

  //     return filteredSubject;
  //   });

  //   return studentData;
  // }
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

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

    // CHANGED: Only check for fee locks, not all locks
    const feeLockedAssessments = await this.assessmentRepository.find({
      where: {
        student: { id: student.id },
        is_locked: true,
        lock_reason: 'fee' // ONLY THIS LINE ADDED
      }
    });

    if (feeLockedAssessments.length > 0) {
      return {
        id: student.id,
        name: student.name,
        examNumber: student.examNumber,
        class: student.class?.name || 'Unknown',
        term: student.class?.term || 'Term 1, 2025/2026',
        academicYear: student.class?.academic_year || '2025/2026',
        photo: student.photoUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
        resultsLocked: true,
        message: "Results Withheld - Please contact the school administration to clear your fee balance",
        subjects: [],
        attendance: { present: 0, absent: 0, late: 0 },
        classRank: 0,
        qa1Rank: 0,
        qa2Rank: 0,
        totalStudents: 0,
        teacherRemarks: '',
        assessmentStats: {
          qa1: { classRank: 0, termAverage: 0, overallGrade: 'N/A' },
          qa2: { classRank: 0, termAverage: 0, overallGrade: 'N/A' },
          endOfTerm: {
            classRank: 0,
            termAverage: 0,
            overallGrade: 'N/A',
            attendance: { present: 0, absent: 0, late: 0 }
          },
          overall: { termAverage: 0, calculationMethod: 'N/A' }
        }
      };
    }

    // REST OF YOUR CODE CONTINUES EXACTLY AS IS...
    const activeGradeConfig = await this.getActiveGradeConfiguration(student.schoolId);
    const studentData = this.formatStudentData(student, activeGradeConfig);
    const currentTerm = student.class?.term;
    const reportCard = student.reportCards?.find(rc => rc.term === currentTerm);

    if (!reportCard || (!reportCard.qa1_published && !reportCard.qa2_published && !reportCard.endOfTerm_published)) {
      return {
        ...studentData,
        subjects: [],
        message: "No results have been published yet"
      };
    }

    studentData.subjects = studentData.subjects.map(subject => {
      const filteredSubject = { ...subject };

      if (!reportCard.qa1_published) {
        filteredSubject.qa1 = null;
        filteredSubject.qa1_absent = false;
      }
      if (!reportCard.qa2_published) {
        filteredSubject.qa2 = null;
        filteredSubject.qa2_absent = false;
      }
      if (!reportCard.endOfTerm_published) {
        filteredSubject.endOfTerm = null;
        filteredSubject.endOfTerm_absent = false;
      }

      return filteredSubject;
    });

    return studentData;
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
    const currentTerm = student.class?.term;
    const activeReport = (currentTerm && student.reportCards?.length)
      ? (student.reportCards.find((rc: any) => rc.term === currentTerm) || student.reportCards[0] || {})
      : (student.reportCards?.[0] || {});

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

    // START NEW CODE: Check if parent phone already exists
    // if (studentData.parent_phone) {
    //   const existingParent = await this.studentRepository.findOne({
    //     where: {
    //       parentPhone: studentData.parent_phone,
    //       ...(schoolId && { schoolId })
    //     }
    //   });

    //   if (existingParent) {
    //     throw new ConflictException(`Parent phone number ${studentData.parent_phone} is already registered to student ${existingParent.name} (${existingParent.examNumber})`);
    //   }
    // }
    // END NEW CODE

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

    // START NEW CODE: Hash password only if provided
    let hashedPassword: string | undefined = undefined;
    if (studentData.parent_password) {
      hashedPassword = await this.hashPassword(studentData.parent_password);
    }
    // END NEW CODE

    const student = this.studentRepository.create({
      name: studentData.name,
      examNumber: examNumber,
      class: classEntity,
      photoUrl: studentData.photo_url,
      schoolId: schoolId,

      // NEW FIELDS FROM FRONTEND FORM
      emisCode: studentData.emis_code,
      parentName: studentData.parent_name,
      parentPhone: studentData.parent_phone,
      parentEmail: studentData.parent_email,
      whatsappNumber: studentData.parent_phone, // Using parent_phone for WhatsApp
      parentNationalId: studentData.parent_national_id,
      parentRelationship: studentData.parent_relationship,
      parentAlternatePhone: studentData.parent_alternate_phone,
      parentAddress: studentData.parent_address,
      parentOccupation: studentData.parent_occupation,
      preferredContact: studentData.preferred_contact,
      emergencyContactName: studentData.emergency_contact_name,
      emergencyContactPhone: studentData.emergency_contact_phone,
      emergencyContactRelationship: studentData.emergency_contact_relationship,
      parentPassword: hashedPassword, // Use hashed password
      sendCredentials: studentData.send_credentials || false,
    });
    // END NEW CODE

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

    // START NEW CODE: Check if parent phone is being updated and already exists
    if (updates.parent_phone && updates.parent_phone !== student.parentPhone) {
      const existingParent = await this.studentRepository.findOne({
        where: {
          parentPhone: updates.parent_phone,
          ...(schoolId && { schoolId })
        }
      });

      if (existingParent && existingParent.id !== id) {
        throw new ConflictException(`Parent phone number ${updates.parent_phone} is already registered to student ${existingParent.name} (${existingParent.examNumber})`);
      }
    }
    // END NEW CODE

    const allowedUpdates = [
      'name',
      'photoUrl',
      'emisCode',
      'parentName',
      'parentPhone',
      'parentEmail',
      'whatsappNumber',
      'parentNationalId',
      'parentRelationship',
      'parentAlternatePhone',
      'parentAddress',
      'parentOccupation',
      'preferredContact',
      'emergencyContactName',
      'emergencyContactPhone',
      'emergencyContactRelationship',
      'sendCredentials'

    ];

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

    // START NEW CODE: Handle password separately with hashing
    if (updates.parent_password) {
      student.parentPassword = await this.hashPassword(updates.parent_password);
    }
    // END NEW CODE


    // Map form fields to entity fields - USE THIS APPROACH, not allowedUpdates.forEach
    const fieldMapping = {
      name: 'name',
      photo_url: 'photoUrl',
      emis_code: 'emisCode',
      parent_name: 'parentName',
      parent_phone: 'parentPhone',
      parent_email: 'parentEmail',
      whatsapp_number: 'whatsappNumber',
      parent_national_id: 'parentNationalId',
      parent_relationship: 'parentRelationship',
      parent_alternate_phone: 'parentAlternatePhone',
      parent_address: 'parentAddress',
      parent_occupation: 'parentOccupation',
      preferred_contact: 'preferredContact',
      emergency_contact_name: 'emergencyContactName',
      emergency_contact_phone: 'emergencyContactPhone',
      emergency_contact_relationship: 'emergencyContactRelationship',
      send_credentials: 'sendCredentials'
    };

    // allowedUpdates.forEach(field => {
    //   if (updates[field] !== undefined) {
    //     student[field] = updates[field];
    //   }
    // });
    Object.keys(fieldMapping).forEach(formField => {
      const entityField = fieldMapping[formField];
      if (updates[formField] !== undefined) {
        student[entityField] = updates[formField];
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

    // 🔴🔴🔴 ADD LOCK CHECK HERE
    // Check if this assessment type is locked for this class
    // const existingAssessment = await this.assessmentRepository.findOne({
    //   where: {
    //     student: { id: student.id },
    //     subject: { id: assessmentData.subject_id || assessmentData.subjectId },
    //     assessmentType: assessmentData.assessment_type || assessmentData.assessmentType,
    //     class: { id: student.class.id }
    //   },
    // });

    // // If there's an existing assessment and it's locked, prevent editing
    // if (existingAssessment && existingAssessment.is_locked) {
    //   throw new ForbiddenException(`This ${existingAssessment.assessmentType} assessment is locked and cannot be edited`);
    // }

    // // Also check if ANY assessment of this type in this class is locked
    // const anyLockedOfType = await this.assessmentRepository.findOne({
    //   where: {
    //     class: { id: student.class.id },
    //     assessmentType: assessmentData.assessment_type || assessmentData.assessmentType,
    //     is_locked: true
    //   }
    // });

    // if (anyLockedOfType) {
    //   throw new ForbiddenException(`All ${assessmentData.assessment_type || assessmentData.assessmentType} assessments are locked for this class`);
    // }
    // 🔴🔴🔴 END LOCK CHECK

    // 🔴🔴🔴 ADD LOCK CHECK HERE - ONLY ADD lock_reason to error message
    const existingAssessment = await this.assessmentRepository.findOne({
      where: {
        student: { id: student.id },
        subject: { id: assessmentData.subject_id || assessmentData.subjectId },
        assessmentType: assessmentData.assessment_type || assessmentData.assessmentType,
        class: { id: student.class.id }
      },
    });

    // If there's an existing assessment and it's locked, prevent editing
    if (existingAssessment && existingAssessment.is_locked) {
      // ONLY THIS LINE CHANGED - add reason to error message
      const reason = existingAssessment.lock_reason === 'fee' ? ' (fee unpaid)' : ' (teacher locked)';
      throw new ForbiddenException(`This ${existingAssessment.assessmentType} assessment is locked${reason} and cannot be edited`);
    }

    // Also check if ANY assessment of this type in this class is locked
    const anyLockedOfType = await this.assessmentRepository.findOne({
      where: {
        class: { id: student.class.id },
        assessmentType: assessmentData.assessment_type || assessmentData.assessmentType,
        is_locked: true
      }
    });

    if (anyLockedOfType) {
      // ONLY THIS LINE CHANGED - add reason to error message
      const reason = anyLockedOfType.lock_reason === 'fee' ? ' (fee unpaid)' : ' (teacher locked)';
      throw new ForbiddenException(`All ${assessmentData.assessment_type || assessmentData.assessmentType} assessments are locked${reason} for this class`);
    }
    // 🔴🔴🔴 END LOCK CHECK

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

  async addStudentsToClass(classId: string, studentIds: string[], schoolId?: string) {
    // First verify the class exists and belongs to this school
    const classEntity = await this.classRepository.findOne({
      where: {
        id: classId,
        ...(schoolId && { schoolId })
      }
    });

    if (!classEntity) {
      throw new NotFoundException(`Class ${classId} not found in your school`);
    }

    // Get all the students to update
    const students = await this.studentRepository.find({
      where: {
        id: In(studentIds),
        ...(schoolId && { schoolId })
      },
      relations: ['class'] // Load current class to check
    });

    if (students.length === 0) {
      throw new NotFoundException('No valid students found to add');
    }

    const results = {
      added: [] as string[],
      skipped: [] as { student: string; reason: string }[]
    };

    // Update each student's class with term AND academic year validation
    for (const student of students) {
      // Check if student already has a class
      if (student.class) {
        // Same academic year AND same term - NOT ALLOWED
        if (student.class.academic_year === classEntity.academic_year &&
          student.class.term === classEntity.term) {
          results.skipped.push({
            student: student.name,
            reason: `Already in class ${student.class.name} for ${student.class.academic_year} ${student.class.term}`
          });
          continue;
        }

        // Different term or different academic year - ALLOWED
        console.log(`Student ${student.name} moving from ${student.class.academic_year} ${student.class.term} to ${classEntity.academic_year} ${classEntity.term}`);
      }

      // Update student's class
      student.class = classEntity;
      await this.studentRepository.save(student);
      results.added.push(student.name);
    }

    return {
      message: `Added ${results.added.length} student(s) to class ${classEntity.name}`,
      skipped: results.skipped,
      addedCount: results.added.length,
      skippedCount: results.skipped.length
    };
  }

  // async addStudentsToClass(classId: string, studentIds: string[], schoolId?: string) {
  //   // First verify the class exists and belongs to this school
  //   const classEntity = await this.classRepository.findOne({
  //     where: {
  //       id: classId,
  //       ...(schoolId && { schoolId })
  //     }
  //   });

  //   if (!classEntity) {
  //     throw new NotFoundException(`Class ${classId} not found in your school`);
  //   }

  //   // Get all the students to update
  //   const students = await this.studentRepository.find({
  //     where: {
  //       id: In(studentIds),
  //       ...(schoolId && { schoolId })
  //     },
  //     relations: ['class'] // Load current class to check
  //   });

  //   if (students.length === 0) {
  //     throw new NotFoundException('No valid students found to add');
  //   }

  //   // Update each student's class
  //   for (const student of students) {
  //     student.class = classEntity;
  //     await this.studentRepository.save(student);
  //   }

  //   // Optional: Recalculate ranks for the class if needed
  //   setTimeout(async () => {
  //     await this.calculateAndUpdateRanks(classId, classEntity.term, schoolId);
  //   }, 100);

  //   return {
  //     message: `Successfully added ${students.length} student(s) to class ${classEntity.name}`,
  //     count: students.length
  //   };
  // }

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

      // // Calculate QA1 average (raw scores)
      // let qa1Total = 0;
      // let qa1Count = 0;
      // for (const subject of subjects) {
      //   if (!subject.qa1_absent && subject.qa1 > 0) {
      //     qa1Total += subject.qa1;
      //     qa1Count++;
      //   }
      // }
      // const qa1Average = qa1Count > 0 ? qa1Total / qa1Count : 0;

      // // Calculate QA2 average (raw scores)
      // let qa2Total = 0;
      // let qa2Count = 0;
      // for (const subject of subjects) {
      //   if (!subject.qa2_absent && subject.qa2 > 0) {
      //     qa2Total += subject.qa2;
      //     qa2Count++;
      //   }
      // }
      // const qa2Average = qa2Count > 0 ? qa2Total / qa2Count : 0;

      // Calculate QA1 average (include absent as 0)
      let qa1Total = 0;
      let qa1Count = 0;
      for (const subject of subjects) {
        if (subject.qa1_absent) {
          qa1Count++; // Count absent subjects
          // qa1Total remains 0
        } else if (subject.qa1 !== null && subject.qa1 >= 0) {
          qa1Total += subject.qa1;
          qa1Count++;
        }
      }
      const qa1Average = qa1Count > 0 ? qa1Total / qa1Count : 0;

      // Calculate QA2 average (include absent as 0)
      let qa2Total = 0;
      let qa2Count = 0;
      for (const subject of subjects) {
        if (subject.qa2_absent) {
          qa2Count++; // Count absent subjects
          // qa2Total remains 0
        } else if (subject.qa2 !== null && subject.qa2 >= 0) {
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
  // async getClassResults(classId: string, schoolId?: string, teacherId?: string) { // ADD teacherId parameter
  //   const query = this.classRepository
  //     .createQueryBuilder('class')
  //     .leftJoinAndSelect('class.students', 'students')
  //     .leftJoinAndSelect('class.classTeacher', 'classTeacher')
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

  //   // ===== ADD THIS: Get teacher's subjects for this class =====
  //   let teacherSubjectIds: string[] = [];
  //   // Get teacher's subjects for this class
  //   if (teacherId) {
  //     const teacherAssignments = await this.teachersService.getTeacherAssignments(teacherId);
  //     const assignmentsForThisClass = teacherAssignments.filter(a => a.classId === classId);
  //     teacherSubjectIds = assignmentsForThisClass.map(a => a.subjectId);
  //   }
  //   // ===== END ADD =====

  //   for (const student of classEntity.students) {
  //     // CHANGE 1: Get assessments filtered by class instead of using findByExamNumber
  //     let assessments = await this.assessmentRepository // ADD "let" not "const"
  //       .createQueryBuilder('assessment')
  //       .leftJoinAndSelect('assessment.subject', 'subject')
  //       .leftJoinAndSelect('assessment.student', 'student')
  //       .innerJoin('assessment.class', 'class')
  //       .where('student.id = :studentId', { studentId: student.id })
  //       .andWhere('class.id = :classId', { classId })
  //       .getMany();

  //     // ===== ADD THIS: Filter by teacher's subjects =====
  //     if (teacherId && teacherSubjectIds.length > 0) {
  //       assessments = assessments.filter(asm =>
  //         teacherSubjectIds.includes(asm.subject.id)
  //       );
  //     }
  //     // ===== END ADD =====

  //     // CHANGE 2: Get report card for rankings
  //     const reportCard = await this.reportCardRepository.findOne({
  //       where: {
  //         student: { id: student.id },
  //         term: classEntity.term
  //       }
  //     });

  //     // CHANGE 3: Build subjects from filtered assessments
  //     const subjectMap = new Map<string, any>();

  //     assessments.forEach(asm => {
  //       const subjectName = asm.subject?.name || 'Unknown';

  //       if (!subjectMap.has(subjectName)) {
  //         subjectMap.set(subjectName, {
  //           name: subjectName,
  //           qa1: 0,
  //           qa2: 0,
  //           endOfTerm: 0,
  //           // 👈 NEW: Add absent flags
  //           qa1_absent: false,
  //           qa2_absent: false,
  //           endOfTerm_absent: false,
  //         });
  //       }

  //       const subjectData = subjectMap.get(subjectName);
  //       if (asm.assessmentType === 'qa1') {
  //         subjectData.qa1 = asm.score || 0;
  //         subjectData.qa1_absent = asm.isAbsent || false; // 👈 NEW
  //       } else if (asm.assessmentType === 'qa2') {
  //         subjectData.qa2 = asm.score || 0;
  //         subjectData.qa2_absent = asm.isAbsent || false; // 👈 NEW
  //       } else if (asm.assessmentType === 'end_of_term') {
  //         subjectData.endOfTerm = asm.score || 0;
  //         subjectData.endOfTerm_absent = asm.isAbsent || false; // 👈 NEW
  //       }
  //     });

  //     const subjects = Array.from(subjectMap.values());

  //     if (subjects.length > 0) {
  //       // CHANGE 4: Calculate final scores and grades
  //       const enhancedSubjects = subjects.map(subject => {
  //         const finalScore = this.calculateFinalScore(subject, activeGradeConfig);
  //         const grade = this.calculateGrade(finalScore, activeGradeConfig);
  //         return {
  //           ...subject,
  //           finalScore,
  //           grade
  //         };
  //       });

  //       // CHANGE 5: Calculate totals and average
  //       const totalScore = enhancedSubjects.reduce((sum, subject) => sum + subject.finalScore, 0);
  //       const average = enhancedSubjects.length > 0 ? totalScore / enhancedSubjects.length : 0;

  //       results.push({
  //         id: student.id,
  //         name: student.name,
  //         examNumber: student.examNumber,
  //         classRank: reportCard?.classRank || 0,
  //         totalScore: totalScore,
  //         average: average,
  //         overallGrade: this.calculateGrade(average, activeGradeConfig),
  //         subjects: enhancedSubjects.map(subject => ({
  //           name: subject.name,
  //           qa1: subject.qa1,
  //           qa2: subject.qa2,
  //           endOfTerm: subject.endOfTerm,
  //           finalScore: subject.finalScore,
  //           grade: subject.grade,
  //           // 👈 ADD THESE THREE LINES:
  //           qa1_absent: subject.qa1_absent,
  //           qa2_absent: subject.qa2_absent,
  //           endOfTerm_absent: subject.endOfTerm_absent
  //         }))
  //       });
  //     }
  //   }

  //   // results.sort((a, b) => b.average - a.average);
  //   // results.forEach((result, index) => {
  //   //   result.rank = index + 1;
  //   // });

  //   results.sort((a, b) => b.average - a.average);

  //   // Apply dense ranking
  //   let currentRank = 1;
  //   let previousAverage = results.length > 0 ? results[0].average : null;

  //   for (let i = 0; i < results.length; i++) {
  //     if (i > 0 && Math.abs(results[i].average - previousAverage) > 0.01) {
  //       currentRank++;
  //     }
  //     results[i].rank = currentRank;
  //     previousAverage = results[i].average;
  //   }
  //   return results;
  // }
  // ===== END MODIFIED =====

  // 🔴 ADDED assessmentType parameter with a default of 'overall'
  async getClassResults(classId: string, schoolId?: string, teacherId?: string, assessmentType: string = 'overall') {
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

    let teacherSubjectIds: string[] = [];
    if (teacherId) {
      const teacherAssignments = await this.teachersService.getTeacherAssignments(teacherId);
      const assignmentsForThisClass = teacherAssignments.filter(a => a.classId === classId);
      teacherSubjectIds = assignmentsForThisClass.map(a => a.subjectId);
    }

    for (const student of classEntity.students) {
      let assessments = await this.assessmentRepository
        .createQueryBuilder('assessment')
        .leftJoinAndSelect('assessment.subject', 'subject')
        .leftJoinAndSelect('assessment.student', 'student')
        .innerJoin('assessment.class', 'class')
        .where('student.id = :studentId', { studentId: student.id })
        .andWhere('class.id = :classId', { classId })
        .getMany();

      if (teacherId && teacherSubjectIds.length > 0) {
        assessments = assessments.filter(asm =>
          teacherSubjectIds.includes(asm.subject.id)
        );
      }

      const reportCard = await this.reportCardRepository.findOne({
        where: {
          student: { id: student.id },
          term: classEntity.term
        }
      });

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
        const enhancedSubjects = subjects.map(subject => {
          const finalScore = this.calculateFinalScore(subject, activeGradeConfig);
          const grade = this.calculateGrade(finalScore, activeGradeConfig);
          return {
            ...subject,
            finalScore,
            grade
          };
        });

        const totalScore = enhancedSubjects.reduce((sum, subject) => sum + subject.finalScore, 0);
        const average = enhancedSubjects.length > 0 ? totalScore / enhancedSubjects.length : 0;

        // 🔴 ADDED: Calculate specific QA averages (matching your calculateAndUpdateRanks logic)
        let qa1Total = 0, qa1Count = 0;
        let qa2Total = 0, qa2Count = 0;
        let endTermTotal = 0, endTermCount = 0;

        // enhancedSubjects.forEach(sub => {
        //   if (!sub.qa1_absent && sub.qa1 > 0) { qa1Total += sub.qa1; qa1Count++; }
        //   if (!sub.qa2_absent && sub.qa2 > 0) { qa2Total += sub.qa2; qa2Count++; }
        //   if (!sub.endOfTerm_absent && sub.endOfTerm > 0) { endTermTotal += sub.endOfTerm; endTermCount++; }
        // });
        enhancedSubjects.forEach(sub => {
          // QA1 - include absent as 0
          if (sub.qa1_absent) {
            qa1Count++; // Count absent subjects
            // qa1Total remains 0
          } else if (sub.qa1 !== null && sub.qa1 >= 0) {
            qa1Total += sub.qa1;
            qa1Count++;
          }

          // QA2 - include absent as 0
          if (sub.qa2_absent) {
            qa2Count++; // Count absent subjects
            // qa2Total remains 0
          } else if (sub.qa2 !== null && sub.qa2 >= 0) {
            qa2Total += sub.qa2;
            qa2Count++;
          }

          // End of Term - include absent as 0
          if (sub.endOfTerm_absent) {
            endTermCount++; // Count absent subjects
            // endTermTotal remains 0
          } else if (sub.endOfTerm !== null && sub.endOfTerm >= 0) {
            endTermTotal += sub.endOfTerm;
            endTermCount++;
          }
        });

        const qa1Average = qa1Count > 0 ? qa1Total / qa1Count : 0;
        const qa2Average = qa2Count > 0 ? qa2Total / qa2Count : 0;
        const endTermAverage = endTermCount > 0 ? endTermTotal / endTermCount : 0;

        results.push({
          id: student.id,
          name: student.name,
          examNumber: student.examNumber,
          classRank: reportCard?.classRank || 0,
          totalScore: totalScore,
          average: average,
          qa1Average: qa1Average, // 👈 Added
          qa2Average: qa2Average, // 👈 Added
          endTermAverage: endTermAverage, // 👈 Added
          overallGrade: this.calculateGrade(average, activeGradeConfig),
          subjects: enhancedSubjects.map(subject => ({
            name: subject.name,
            qa1: subject.qa1,
            qa2: subject.qa2,
            endOfTerm: subject.endOfTerm,
            finalScore: subject.finalScore,
            grade: subject.grade,
            qa1_absent: subject.qa1_absent,
            qa2_absent: subject.qa2_absent,
            endOfTerm_absent: subject.endOfTerm_absent
          }))
        });
      }
    }

    // 🔴 THE FIX: Dynamically pick what we are ranking based on the assessmentType
    let rankField = 'average'; // Default overall
    if (assessmentType === 'qa1') rankField = 'qa1Average';
    if (assessmentType === 'qa2') rankField = 'qa2Average';
    if (assessmentType === 'endOfTerm') rankField = 'endTermAverage';

    // Sort descending by the chosen field
    results.sort((a, b) => b[rankField] - a[rankField]);

    // Apply dense ranking based on the chosen field
    let currentRank = 1;
    let previousScore = results.length > 0 ? results[0][rankField] : null;

    for (let i = 0; i < results.length; i++) {
      if (i > 0 && Math.abs(results[i][rankField] - previousScore) > 0.01) {
        currentRank++;
      }
      results[i].rank = currentRank;
      previousScore = results[i][rankField];
    }

    return results;
  }

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

  // Add to your Student entity
  // is_published: boolean default false
  // locked_by_admin: boolean default false

  async publishAssessment(classId: string, term: string, assessmentType: 'qa1' | 'qa2' | 'endOfTerm', publish: boolean) {
    // First, get all students in this class
    const students = await this.studentRepository.find({
      where: { class: { id: classId } }
    });

    const studentIds = students.map(s => s.id);

    if (studentIds.length === 0) {
      return { message: 'No students found in this class' };
    }

    // Then update report cards for these students
    await this.reportCardRepository.update(
      {
        student: { id: In(studentIds) },
        term: term
      },
      {
        [`${assessmentType}_published`]: publish
      }
    );

    return { message: `Assessment ${publish ? 'published' : 'unpublished'} successfully` };
  }


  async lockResults(
    classId: string,
    term: string,
    assessmentType: 'qa1' | 'qa2' | 'endOfTerm',
    lock: boolean,
    lockReason: 'fee' | 'teacher', // ADD THIS PARAMETER
    studentIds?: string[]
  ) {
    // First, get the class to verify term matches
    const classEntity = await this.classRepository.findOne({
      where: { id: classId, term: term }
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found for this term');
    }

    // Build the query
    const queryBuilder = this.assessmentRepository
      .createQueryBuilder()
      .update(Assessment)
      .set({
        is_locked: lock,
        lock_reason: lock ? lockReason : undefined // Change null to undefined
      })
      .where('classId = :classId', { classId })
      .andWhere('assessmentType = :assessmentType', { assessmentType });

    // If specific student IDs are provided, lock only those students
    if (studentIds && studentIds.length > 0) {
      queryBuilder.andWhere('studentId IN (:...studentIds)', { studentIds });
    }

    const result = await queryBuilder.execute();

    return {
      message: `Results ${lock ? 'locked' : 'unlocked'} successfully for ${assessmentType}`,
      studentCount: studentIds?.length || 'all',
      affectedCount: result.affected
    };
  }

  async archiveTermResults(classId: string, term: string, academicYear: string) {
    // First, get the class entity
    const classEntity = await this.classRepository.findOne({
      where: { id: classId }
    });

    if (!classEntity) {
      throw new NotFoundException(`Class with ID ${classId} not found`);
    }

    // Get results for ALL assessment types
    const [overallResults, qa1Results, qa2Results, endOfTermResults] = await Promise.all([
      this.getClassResults(classId, undefined, undefined, 'overall'),
      this.getClassResults(classId, undefined, undefined, 'qa1'),
      this.getClassResults(classId, undefined, undefined, 'qa2'),
      this.getClassResults(classId, undefined, undefined, 'endOfTerm')
    ]);

    // Create archive record with all results
    const archive = this.archiveRepository.create({
      class: classEntity,
      classId: classId,
      term,
      academicYear,
      results: {
        overall: overallResults,
        qa1: qa1Results,
        qa2: qa2Results,
        endOfTerm: endOfTermResults,
        metadata: {
          archivedAt: new Date(),
          term,
          academicYear,
          className: classEntity.name,
          totalStudents: overallResults?.length || 0
        }
      },
      archivedAt: new Date(),
      is_published: false,
      locked_by_admin: false
    });

    const savedArchive = await this.archiveRepository.save(archive);
    console.log('Archive saved successfully with all assessment types:', savedArchive.id);

    return {
      message: 'Results archived successfully',
      archive: savedArchive
    };
  }


  async getArchivedResults(classId: string, term: string, academicYear: string) {
    const result = await this.archiveRepository.findOne({
      where: { classId, term, academicYear }
    });

    // Return empty array if no results found
    return result || [];
  }


  async getLockedAssessments(classId: string, term: string, schoolId?: string) {
    return this.assessmentRepository.find({
      where: {
        class: { id: classId },
        is_locked: true
      },
      relations: ['student', 'subject'],
      select: {
        id: true,
        assessmentType: true,
        score: true,
        is_locked: true,
        lock_reason: true, // Make sure this is included
        student: { id: true, name: true, examNumber: true },
        subject: { id: true, name: true }
      }
    });
  }


  // ====================== REPORT CARD GENERATION HELPERS ======================

  private calculateAverageForType(subjects: any[], type: 'qa1' | 'qa2' | 'endOfTerm'): number {
    const validSubjects = subjects.filter(s => {
      const isAbsent = type === 'qa1' ? s.qa1_absent :
        type === 'qa2' ? s.qa2_absent :
          s.endOfTerm_absent;
      const score = s[type];
      return !isAbsent && score !== null && score !== undefined && typeof score === 'number';
    });

    if (validSubjects.length === 0) return 0;

    const total = validSubjects.reduce((sum, s) => sum + (s[type] as number), 0);
    return total / validSubjects.length;
  }

  private calculateFinalScoreForReportCard(subject: any, gradeConfig: any): number {
    const qa1 = subject.qa1 || 0;
    const qa2 = subject.qa2 || 0;
    const endOfTerm = subject.endOfTerm || 0;

    const qa1Absent = subject.qa1_absent || false;
    const qa2Absent = subject.qa2_absent || false;
    const endOfTermAbsent = subject.endOfTerm_absent || false;

    if (endOfTermAbsent) return 0;

    switch (gradeConfig?.calculation_method) {
      case 'average_all':
        let total = 0;
        let count = 0;
        if (!qa1Absent) { total += qa1; count++; }
        if (!qa2Absent) { total += qa2; count++; }
        if (!endOfTermAbsent) { total += endOfTerm; count++; }
        return count > 0 ? total / count : 0;

      case 'end_of_term_only':
        return endOfTermAbsent ? 0 : endOfTerm;

      case 'weighted_average':
        let weightedTotal = 0;
        let weightTotal = 0;
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

  async generateStudentReportCards(classId: string, term: string, assessmentType: 'qa1' | 'qa2' | 'endOfTerm') {
    console.log(`--- GENERATING REPORT CARDS FOR CLASS ${classId}, TERM ${term}, TYPE ${assessmentType} ---`);

    // 1. Get all students in the class with their assessments and report cards
    const students = await this.studentRepository.find({
      where: { class: { id: classId } },
      relations: ['assessments', 'assessments.subject', 'reportCards', 'class']
    });

    if (students.length === 0) {
      return { message: 'No students found in this class' };
    }

    const activeGradeConfig = await this.getActiveGradeConfiguration(
      students[0]?.class?.schoolId
    );

    // FIX: Explicitly type the array
    const generatedReports: any[] = [];

    // 2. For each student, generate their report card data matching StudentData interface
    for (const student of students) {
      const reportCard = student.reportCards?.find(rc => rc.term === term);

      // Group assessments by subject
      const subjectMap = new Map();

      // Get all subjects (including those with no scores)
      const allSubjects = await this.subjectRepository.find();

      // Initialize all subjects with empty values
      allSubjects.forEach(subject => {
        subjectMap.set(subject.name, {
          name: subject.name,
          qa1: null,
          qa2: null,
          endOfTerm: null,
          qa1_absent: false,
          qa2_absent: false,
          endOfTerm_absent: false,
          grade: 'N/A'
        });
      });

      // Fill in actual assessment data
      student.assessments.forEach(asm => {
        const subjectName = asm.subject?.name || 'Unknown';
        if (subjectMap.has(subjectName)) {
          const subject = subjectMap.get(subjectName);

          if (asm.assessmentType === 'qa1') {
            subject.qa1 = asm.score;
            subject.qa1_absent = asm.isAbsent || false;
          } else if (asm.assessmentType === 'qa2') {
            subject.qa2 = asm.score;
            subject.qa2_absent = asm.isAbsent || false;
          } else if (asm.assessmentType === 'end_of_term') {
            subject.endOfTerm = asm.score;
            subject.endOfTerm_absent = asm.isAbsent || false;
          }
        }
      });

      // Calculate final scores for each subject
      subjectMap.forEach(subject => {
        subject.finalScore = this.calculateFinalScoreForReportCard(subject, activeGradeConfig);
        subject.grade = this.calculateGrade(subject.finalScore, activeGradeConfig, subject.endOfTerm_absent);
      });

      const subjects = Array.from(subjectMap.values());

      // Calculate averages for each assessment type
      const qa1Average = this.calculateAverageForType(subjects, 'qa1');
      const qa2Average = this.calculateAverageForType(subjects, 'qa2');
      const endOfTermAverage = this.calculateAverageForType(subjects, 'endOfTerm');

      // Calculate overall average using grade configuration
      let overallAverage = this.calculateFinalScore(
        { qa1: qa1Average, qa2: qa2Average, endOfTerm: endOfTermAverage },
        activeGradeConfig
      );

      // Build the complete StudentData object
      const studentData: any = {
        id: student.id,
        name: student.name,
        examNumber: student.examNumber,
        class: student.class?.name || 'Unknown',
        term: term,
        academicYear: student.class?.academic_year || '2024/2025',
        photo: student.photoUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',

        subjects: subjects,

        attendance: {
          present: reportCard?.daysPresent || 0,
          absent: reportCard?.daysAbsent || 0,
          late: reportCard?.daysLate || 0
        },

        classRank: reportCard?.classRank || 0,
        qa1Rank: reportCard?.qa1Rank || 0,
        qa2Rank: reportCard?.qa2Rank || 0,
        totalStudents: students.length,
        teacherRemarks: reportCard?.teacherRemarks || 'No remarks available.',

        assessmentStats: {
          qa1: {
            classRank: reportCard?.qa1Rank || 0,
            termAverage: parseFloat(qa1Average.toFixed(1)),
            overallGrade: this.calculateGrade(qa1Average, activeGradeConfig)
          },
          qa2: {
            classRank: reportCard?.qa2Rank || 0,
            termAverage: parseFloat(qa2Average.toFixed(1)),
            overallGrade: this.calculateGrade(qa2Average, activeGradeConfig)
          },
          endOfTerm: {
            classRank: reportCard?.classRank || 0,
            termAverage: parseFloat(endOfTermAverage.toFixed(1)),
            overallGrade: this.calculateGrade(endOfTermAverage, activeGradeConfig),
            attendance: {
              present: reportCard?.daysPresent || 0,
              absent: reportCard?.daysAbsent || 0,
              late: reportCard?.daysLate || 0
            }
          },
          overall: {
            termAverage: parseFloat(overallAverage.toFixed(1)),
            calculationMethod: activeGradeConfig?.calculation_method || 'average_all'
          }
        },

        gradeConfiguration: {
          configuration_name: activeGradeConfig?.configuration_name || 'Default',
          calculation_method: activeGradeConfig?.calculation_method || 'average_all',
          weight_qa1: activeGradeConfig?.weight_qa1 || 33.33,
          weight_qa2: activeGradeConfig?.weight_qa2 || 33.33,
          weight_end_of_term: activeGradeConfig?.weight_end_of_term || 33.34,
          pass_mark: activeGradeConfig?.pass_mark || 50
        }
      };

      generatedReports.push(studentData);
    }

    return generatedReports;
  }

  // In students.service.ts
  async archiveStudentReportCards(classId: string, term: string, assessmentType: 'qa1' | 'qa2' | 'endOfTerm') {
    // First generate the report cards matching your frontend structure
    const result = await this.generateStudentReportCards(classId, term, assessmentType);

    // Check if we got a message (no students found)
    if ('message' in result) {
      return { message: result.message, archives: [] };
    }

    // Now TypeScript knows result is an array of report cards
    const reportCards = result as any[]; // Type assertion to avoid 'never' error
    const archives: StudentReportArchive[] = [];

    for (const reportCard of reportCards) {
      const student = await this.studentRepository.findOne({
        where: { id: reportCard.id }
      });

      const archive = this.studentReportArchiveRepository.create({
        studentId: reportCard.id,
        studentName: reportCard.name,
        examNumber: reportCard.examNumber,
        classId,
        term,
        assessmentType,
        parentEmail: student?.parentEmail,
        parentPhone: student?.parentPhone,
        whatsappNumber: student?.whatsappNumber,
        reportCardData: reportCard, // Now stores the complete StudentData object
        archivedAt: new Date()
      });

      const savedArchive = await this.studentReportArchiveRepository.save(archive);
      archives.push(savedArchive);
    }

    return archives;
  }

  // In students.service.ts
  async sendReportViaEmail(archiveId: string) {
    // TODO: Implement email sending
    // Will use nodemailer or email service
    console.log(`Email sending to be implemented for archive ${archiveId}`);
  }

  async sendReportViaWhatsApp(archiveId: string) {
    // TODO: Implement WhatsApp sending
    // Will use WhatsApp Business API
    console.log(`WhatsApp sending to be implemented for archive ${archiveId}`);
  }

  async sendBulkReports(classId: string, term: string, assessmentType: string) {
    const archives = await this.studentReportArchiveRepository.find({
      where: { classId, term, assessmentType, sentViaEmail: false }
    });

    for (const archive of archives) {
      // Queue for sending (implement later)
      console.log(`Queued report for ${archive.studentName}`);
    }
  }
  async getStudentReportArchives(classId?: string, term?: string, schoolId?: string) {
    const query = this.studentReportArchiveRepository
      .createQueryBuilder('archive');

    if (schoolId) {
      // Join with the 'classes' table using the actual table name
      query.innerJoin('classes', 'class', 'class.id = archive.classId')
        .andWhere('class.schoolId = :schoolId', { schoolId });
    }

    if (classId) {
      query.andWhere('archive.classId = :classId', { classId });
    }

    if (term) {
      query.andWhere('archive.term = :term', { term });
    }

    query.orderBy('archive.archivedAt', 'DESC');

    return query.getMany();
  }

}