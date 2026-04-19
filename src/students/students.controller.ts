import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Headers, UseInterceptors, UploadedFile } from '@nestjs/common';
import { StudentsService } from './students.service';
import { FileInterceptor } from '@nestjs/platform-express';

// Main Students Controller
@Controller('api/students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) { }

  @Post('calculate-ranks')
  async calculateRanks(
    @Body() body: { class_id: string; term: string; schoolId?: string },
    @Query('schoolId') schoolId?: string
  ) {
    const finalSchoolId = body.schoolId || schoolId;


    // return this.studentsService.calculateAndUpdateRanks(body.class_id, body.term, finalSchoolId);

    // 1. Run the calculation logic (it returns void, which is fine now)
    await this.studentsService.calculateAndUpdateRanks(body.class_id, body.term, finalSchoolId);

    // 2. Return a success object so the frontend has JSON to parse
    return {
      success: true,
      message: 'Ranks calculation completed successfully.'
    };
  }

  @Get('class/:classId/results')
  async getClassResults(
    @Param('classId') classId: string,
    @Query('schoolId') schoolId?: string,
    @Headers('x-teacher-id') teacherId?: string // ADD THIS
  ) {
    return this.studentsService.getClassResults(classId, schoolId, teacherId);
  }

  @Get('results/:examNumber')
  async getStudentResults(
    @Param('examNumber') examNumber: string,
    @Query('schoolId') schoolId?: string
  ) {
    return this.studentsService.findByExamNumber(examNumber, schoolId);
  }

  @Get()
  async getAllStudents(@Query('schoolId') schoolId?: string) {
    return this.studentsService.findAll(schoolId);
  }

  @Get(':id/assessments')
  async getStudentAssessments(
    @Param('id') id: string,
    @Query('schoolId') schoolId?: string
  ) {
    return this.studentsService.getStudentAssessments(id, schoolId);
  }

  @Get(':id/report-cards/:term')
  async getStudentReportCard(
    @Param('id') id: string,
    @Param('term') term: string,
    @Query('schoolId') schoolId?: string
  ) {
    return this.studentsService.getStudentReportCard(id, term, schoolId);
  }

  @Post()
  async createStudent(
    @Body() studentData: any,
    @Query('schoolId') schoolId?: string
  ) {
    return this.studentsService.create(studentData, schoolId);
  }

  @Patch(':id')
  async updateStudent(
    @Param('id') id: string,
    @Body() updates: any,
    @Query('schoolId') schoolId?: string
  ) {
    return this.studentsService.update(id, updates, schoolId);
  }

  @Delete(':id')
  async deleteStudent(
    @Param('id') id: string,
    @Query('schoolId') schoolId?: string
  ) {
    return this.studentsService.remove(id, schoolId);
  }
}

// Assessments Controller
@Controller('api/assessments')
export class AssessmentsController {
  constructor(private readonly studentsService: StudentsService) { }

  @Post('upsert')
  async upsertAssessment(
    @Body() assessmentData: any,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.studentsService.upsertAssessment(assessmentData, schoolId);
  }
}

// Report Cards Controller - MODIFIED
@Controller('api/report-cards')
export class ReportCardsController {
  constructor(private readonly studentsService: StudentsService) { }

  @Post('upsert')
  async upsertReportCard(
    @Body() reportCardData: any,
    @Query('schoolId') schoolId?: string,
    @Headers('x-teacher-id') teacherId?: string // ADDED HEADER
  ) {
    return this.studentsService.upsertReportCard(reportCardData, schoolId, teacherId);
  }
}

// Subjects Controller
@Controller('api/subjects')
export class SubjectsController {
  constructor(private readonly studentsService: StudentsService) { }

  @Get()
  async getAllSubjects(@Query('schoolId') schoolId?: string) {
    return this.studentsService.findAllSubjects(schoolId);
  }

  @Post()
  async createSubject(
    @Body() subjectData: { name: string },
    @Query('schoolId') schoolId?: string
  ) {
    return this.studentsService.createSubject(subjectData, schoolId);
  }

  @Delete(':id')
  async deleteSubject(
    @Param('id') id: string,
    @Query('schoolId') schoolId?: string
  ) {
    return this.studentsService.deleteSubject(id, schoolId);
  }
}

// Grade Configurations Controller
@Controller('api/grade-configs')
export class GradeConfigsController {
  constructor(private readonly studentsService: StudentsService) { }

  @Get('active')
  async getActiveGradeConfig(@Query('schoolId') schoolId?: string) {
    return this.studentsService.getActiveGradeConfiguration(schoolId);
  }

  @Get()
  async getAllGradeConfigs(@Query('schoolId') schoolId?: string) {
    return this.studentsService.getAllGradeConfigurations(schoolId);
  }

  @Post()
  async createGradeConfig(
    @Body() configData: any,
    @Query('schoolId') schoolId?: string
  ) {
    return this.studentsService.createGradeConfiguration(configData, schoolId);
  }

  @Patch(':id')
  async updateGradeConfig(
    @Param('id') id: string,
    @Body() updates: any,
    @Query('schoolId') schoolId?: string
  ) {
    return this.studentsService.updateGradeConfiguration(id, updates, schoolId);
  }

  @Post(':id/activate')
  async activateGradeConfig(
    @Param('id') id: string,
    @Query('schoolId') schoolId?: string
  ) {
    return this.studentsService.setActiveConfiguration(id, schoolId);
  }
}

// Classes Controller
@Controller('api/classes')
export class ClassesController {
  constructor(private readonly studentsService: StudentsService) { }

  @Get()
  async getAllClasses(@Query('schoolId') schoolId?: string) {
    return this.studentsService.findAllClasses(schoolId);
  }

  @Get(':id/students')
  async getClassStudents(
    @Param('id') id: string,
    @Query('schoolId') schoolId?: string
  ) {
    return this.studentsService.getClassStudents(id, schoolId);
  }

  @Post()
  async createClass(
    @Body() classData: { name: string; academic_year: string; term: string; start_date: string; end_date: string },
    @Query('schoolId') schoolId?: string
  ) {
    return this.studentsService.createClass(classData, schoolId);
  }

  @Delete(':id')
  async deleteClass(
    @Param('id') id: string,
    @Query('schoolId') schoolId?: string
  ) {
    return this.studentsService.deleteClass(id, schoolId);
  }

  @Post('add-students')
  async addStudentsToClass(
    @Body() body: { classId: string; studentIds: string[] },
    @Query('schoolId') schoolId?: string
  ) {
    return this.studentsService.addStudentsToClass(body.classId, body.studentIds, schoolId);
  }

  @Post('publish-assessment')
  async publishAssessment(
    @Body() body: { classId: string; term: string; assessmentType: 'qa1' | 'qa2' | 'endOfTerm'; publish: boolean },
    @Query('schoolId') schoolId?: string
  ) {
    return this.studentsService.publishAssessment(body.classId, body.term, body.assessmentType, body.publish);
  }

  // @Post('lock-results')
  // async lockResults(
  //   @Body() body: { classId: string; term: string; lock: boolean },
  //   @Query('schoolId') schoolId?: string
  // ) {
  //   return this.studentsService.lockResults(body.classId, body.term, body.lock);
  // }

  @Post('lock-results')
  async lockResults(
    @Body() body: {
      classId: string;
      term: string;
      assessmentType: 'qa1' | 'qa2' | 'endOfTerm'; // Add this
      lock: boolean;
      lockReason: 'fee' | 'teacher'; // ADD THIS
      studentIds?: string[]; // Add this - optional array of student IDs
    },
    @Query('schoolId') schoolId?: string
  ) {
    return this.studentsService.lockResults(
      body.classId,
      body.term,
      body.assessmentType, // Pass this
      body.lock,
      body.lockReason, // ADD THIS
      body.studentIds // Pass this
    );
  }

  @Post('archive-results')
  async archiveResults(
    @Body() body: { classId: string; term: string; academicYear: string },
    @Query('schoolId') schoolId?: string
  ) {
    return this.studentsService.archiveTermResults(body.classId, body.term, body.academicYear);
  }

  // @Get('archived-results')
  // async getArchivedResults(
  //   @Query('classId') classId: string,
  //   @Query('term') term: string,
  //   @Query('academicYear') academicYear: string,
  //   @Query('schoolId') schoolId?: string
  // ) {
  //   return this.studentsService.getArchivedResults(classId, term, academicYear);
  // }

  // @Get('archived-results')
  // async getArchivedResults(
  //   @Query('classId') classId: string,
  //   @Query('term') term: string,
  //   @Query('academicYear') academicYear: string,
  //   @Query('schoolId') schoolId?: string
  // ) {
  //   const result = await this.studentsService.getArchivedResults(classId, term, academicYear);
  //   // Always return an array
  //   return result || [];
  // }

  @Get('archived-results')
  async getArchivedResults(
    @Query('classId') classId?: string,
    @Query('term') term?: string,
    @Query('academicYear') academicYear?: string,
    @Query('schoolId') schoolId?: string
  ) {
    const result = await this.studentsService.getArchivedResults(classId, term, academicYear, schoolId);
    return result || [];
  }

  @Get('locked-assessments')
  async getLockedAssessments(
    @Query('classId') classId: string,
    @Query('term') term: string,
    @Query('schoolId') schoolId?: string
  ) {
    return this.studentsService.getLockedAssessments(classId, term, schoolId);
  }

  // In students.controller.ts
  // @Post('archive-student-reports')
  // async archiveStudentReports(
  //   @Body() body: { classId: string; term: string; assessmentType: 'qa1' | 'qa2' | 'endOfTerm' } // 👈 FIXED
  // ) {
  //   return this.studentsService.archiveStudentReportCards(
  //     body.classId,
  //     body.term,
  //     body.assessmentType
  //   );
  // }
  @Post('archive-student-reports')
  async archiveStudentReports(
    @Body() body: { classId: string; term: string; assessmentType: 'qa1' | 'qa2' | 'endOfTerm'; studentIds?: string[] }
  ) {
    return this.studentsService.archiveStudentReportCards(
      body.classId,
      body.term,
      body.assessmentType,
      body.studentIds  // 👈 ADD THIS PARAMETER
    );
  }

  @Post('send-report/:archiveId/email')
  async sendReportEmail(@Param('archiveId') archiveId: string) {
    return this.studentsService.sendReportViaEmail(archiveId);
  }

  @Post('send-report/:archiveId/whatsapp')
  async sendReportWhatsApp(@Param('archiveId') archiveId: string) {
    return this.studentsService.sendReportViaWhatsApp(archiveId);
  }
  @Post('generate-report-cards')
  async generateReportCards(
    @Body() body: { classId: string; term: string; assessmentType: 'qa1' | 'qa2' | 'endOfTerm' }
  ) {
    // This generates and returns the report cards WITHOUT saving them
    return this.studentsService.generateStudentReportCards(
      body.classId,
      body.term,
      body.assessmentType
    );
  }

  @Get('preview-report-cards/:classId')
  async previewReportCards(
    @Param('classId') classId: string,
    @Query('term') term: string,
    @Query('assessmentType') assessmentType: 'qa1' | 'qa2' | 'endOfTerm'
  ) {
    // Preview report cards for a class (GET version for quick preview)
    return this.studentsService.generateStudentReportCards(
      classId,
      term,
      assessmentType
    );
  }
  @Get('student-report-archives')
  async getStudentReportArchives(
    @Query('classId') classId?: string,
    @Query('term') term?: string,
    @Query('schoolId') schoolId?: string
  ) {
    return this.studentsService.getStudentReportArchives(classId, term, schoolId);
  }

  @Get(':studentId/attendance')
  async getStudentAttendance(@Param('studentId') studentId: string) {
    return this.studentsService.getStudentAttendance(studentId);
  }

  // Add these endpoints to your ClassesController
  @Post('import/preview')
  @UseInterceptors(FileInterceptor('file'))
  async previewImportFile(
    @UploadedFile() file: any,
    @Body('classId') classId: string,
    @Body('schoolId') schoolId?: string  // ← Changed from @Query to @Body
  ) {
    return this.studentsService.previewImportFile(file, classId, schoolId);
  }

  @Post('import/batch')
  async importSelectedStudents(
    @Body() body: { classId: string; students: Array<{ name: string; examNumber?: string }>; schoolId?: string }
  ) {
    return this.studentsService.importSelectedStudents(body.classId, body.students, body.schoolId);
  }

}