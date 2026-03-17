import { Controller, Get, Post, Body, Param, Delete, Query, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { TeachersService } from './teachers.service';

@Controller('teachers')
export class TeachersController {
    constructor(private readonly teachersService: TeachersService) { }

    // CREATE teacher
    @Post()
    async createTeacher(
        @Body() body: {
            name: string;
            email: string;
            password: string;
        },
        @Query('schoolId') schoolId: string
    ) {
        if (!schoolId) {
            return {
                success: false,
                message: 'School ID is required'
            };
        }

        const teacher = await this.teachersService.createTeacher(
            body.name,
            body.email,
            body.password,
            schoolId
        );

        return {
            success: true,
            message: 'Teacher created successfully',
            data: teacher
        };
    }

    // GET teachers
    // @Get()
    // async getTeachers(@Query('schoolId') schoolId: string) {
    //     if (!schoolId) {
    //         return {
    //             success: false,
    //             message: 'School ID is required'
    //         };
    //     }

    //     const teachers = await this.teachersService.getTeachersBySchool(schoolId);

    //     return {
    //         success: true,
    //         data: teachers
    //     };
    // }

    // GET teachers (LIST) OR get single teacher profile (if teacherId provided)
    @Get()
    async getTeachers(
        @Query('schoolId') schoolId: string,
        @Query('teacherId') teacherId?: string  // ← ADDED optional teacherId parameter
    ) {
        if (!schoolId) {
            return {
                success: false,
                message: 'School ID is required'
            };
        }

        // ===== MODIFIED: Now passing teacherId to service =====
        const result = await this.teachersService.getTeachersBySchool(schoolId, teacherId);

        return {
            success: true,
            data: result
        };
    }

    // DELETE teacher
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async deleteTeacher(
        @Param('id') id: string,
        @Query('schoolId') schoolId: string
    ) {
        if (!schoolId) {
            return {
                success: false,
                message: 'School ID is required'
            };
        }

        const result = await this.teachersService.deleteTeacher(id, schoolId);

        return {
            success: true,
            message: result.message
        };
    }

    // ===== START: NEW TEACHER ASSIGNMENT ENDPOINTS =====

    // Assign teacher to class and subject
    @Post('assign')
    async assignTeacher(
        @Body() body: {
            teacherId: string;
            classId: string;
            subjectId: string;
        }
    ) {
        const assignment = await this.teachersService.assignTeacherToClassSubject(
            body.teacherId,
            body.classId,
            body.subjectId
        );

        return {
            success: true,
            message: 'Teacher assigned successfully',
            data: assignment
        };
    }

    // Get teacher's assignments
    @Get(':teacherId/assignments')
    async getTeacherAssignments(@Param('teacherId') teacherId: string) {
        const assignments = await this.teachersService.getTeacherAssignments(teacherId);

        return {
            success: true,
            data: assignments
        };
    }

    // Get teacher's classes
    @Get(':teacherId/classes')
    async getTeacherClasses(@Param('teacherId') teacherId: string) {
        const classes = await this.teachersService.getTeacherClasses(teacherId);

        return {
            success: true,
            data: classes
        };
    }

    // Get teacher's subjects
    @Get(':teacherId/subjects')
    async getTeacherSubjects(@Param('teacherId') teacherId: string) {
        const subjects = await this.teachersService.getTeacherSubjects(teacherId);

        return {
            success: true,
            data: subjects
        };
    }

    // Get teacher's students
    @Get(':teacherId/students')
    async getTeacherStudents(@Param('teacherId') teacherId: string) {
        const students = await this.teachersService.getTeacherStudents(teacherId);

        return {
            success: true,
            data: students
        };
    }

    // Remove teacher assignment
    @Delete('assign/remove')
    @HttpCode(HttpStatus.OK)
    async removeTeacherAssignment(
        @Body() body: {
            teacherId: string;
            classId: string;
            subjectId: string;
        }
    ) {
        await this.teachersService.removeTeacherAssignment(
            body.teacherId,
            body.classId,
            body.subjectId
        );

        return {
            success: true,
            message: 'Assignment removed successfully'
        };
    }
    // ===== END: NEW TEACHER ASSIGNMENT ENDPOINTS =====

    // ===== START: CLASS TEACHER ENDPOINTS =====

    // Assign class teacher to a class
    @Post('class-teacher/assign')
    async assignClassTeacher(
        @Body() body: {
            teacherId: string;
            classId: string;
        }
    ) {
        const result = await this.teachersService.assignClassTeacher(
            body.teacherId,
            body.classId
        );

        return {
            success: true,
            message: result.message,
            data: {
                teacherId: result.teacherId,
                teacherName: result.teacherName,
                classId: result.classId,
                className: result.className
            }
        };
    }

    // Remove class teacher from a class
    @Delete('class-teacher/remove/:classId')
    @HttpCode(HttpStatus.OK)
    async removeClassTeacher(@Param('classId') classId: string) {
        const result = await this.teachersService.removeClassTeacher(classId);

        return {
            success: true,
            message: result.message
        };
    }

    // Get class teacher for a specific class
    @Get('class-teacher/:classId')
    async getClassTeacher(@Param('classId') classId: string) {
        const classTeacher = await this.teachersService.getClassTeacher(classId);

        return {
            success: true,
            data: classTeacher
        };
    }

    // Check if teacher is class teacher for a class
    @Get('is-class-teacher/:teacherId/:classId')
    async isClassTeacher(
        @Param('teacherId') teacherId: string,
        @Param('classId') classId: string
    ) {
        const isClassTeacher = await this.teachersService.isClassTeacher(teacherId, classId);

        return {
            success: true,
            data: { isClassTeacher }
        };
    }
    // ===== END: CLASS TEACHER ENDPOINTS =====
    // ===== START: TEACHER PROFILE ENDPOINTS =====

    // ===== START: TEACHER SELF-UPDATE ENDPOINT (FOR TEACHER TO UPDATE THEIR OWN PROFILE) =====
    /**
     * Update teacher profile (used by teacher after login)
     */
    @Patch(':teacherId/profile')
    async updateTeacherProfile(
        @Param('teacherId') teacherId: string,
        @Body() body: any,
        @Query('schoolId') schoolId: string
    ) {
        try {
            const profile = await this.teachersService.updateTeacherProfile(teacherId, body, schoolId);
            return {
                success: true,
                message: 'Profile updated successfully',
                data: profile
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
    // ===== END: TEACHER SELF-UPDATE ENDPOINT =====

    /**
     * Get teacher profile
     */
    // @Get(':teacherId/profile')
    // async getTeacherProfile(
    //     @Param('teacherId') teacherId: string,
    //     @Query('schoolId') schoolId: string
    // ) {
    //     try {
    //         const profile = await this.teachersService.getTeacherProfile(teacherId, schoolId);
    //         return {
    //             success: true,
    //             data: profile
    //         };
    //     } catch (error) {
    //         return {
    //             success: false,
    //             message: error.message
    //         };
    //     }
    // }

    /**
     * Update teacher profile
     */
    // @Patch(':teacherId/profile')
    // async updateTeacherProfile(
    //     @Param('teacherId') teacherId: string,
    //     @Body() body: any,
    //     @Query('schoolId') schoolId: string
    // ) {
    //     try {
    //         const profile = await this.teachersService.updateTeacherProfile(teacherId, body, schoolId);
    //         return {
    //             success: true,
    //             message: 'Profile updated successfully',
    //             data: profile
    //         };
    //     } catch (error) {
    //         return {
    //             success: false,
    //             message: error.message
    //         };
    //     }
    // }

    /**
     * Upload profile image
     */
    // @Post(':teacherId/profile-image')
    // async uploadProfileImage(
    //     @Param('teacherId') teacherId: string,
    //     @Body() body: any, // In real app, use @UploadedFile() with multer
    //     @Query('schoolId') schoolId: string
    // ) {
    //     try {
    //         // For now, we'll just return success
    //         // In production, handle file upload with multer
    //         const result = await this.teachersService.uploadProfileImage(teacherId, body, schoolId);
    //         return {
    //             success: true,
    //             message: 'Profile image uploaded successfully',
    //             data: result
    //         };
    //     } catch (error) {
    //         return {
    //             success: false,
    //             message: error.message
    //         };
    //     }
    // }

    /**
     * Change password
     */
    @Post(':teacherId/change-password')
    async changePassword(
        @Param('teacherId') teacherId: string,
        @Body() body: { currentPassword: string; newPassword: string },
        @Query('schoolId') schoolId: string
    ) {
        try {
            const result = await this.teachersService.changePassword(
                teacherId,
                body.currentPassword,
                body.newPassword,
                schoolId
            );
            return {
                success: true,
                message: result.message
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
    // ===== END: TEACHER PROFILE ENDPOINTS =====
}
