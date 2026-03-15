import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../students/entities/student.entity';

@Injectable()
export class ParentsService {
    constructor(
        @InjectRepository(Student)
        private studentRepository: Repository<Student>,
    ) { }

    async findChildrenByParentId(parentId: string, schoolId?: string) {
        // First get the parent's phone number from the student record using the parentId
        const parentStudent = await this.studentRepository.findOne({
            where: { id: parentId },
            relations: ['class', 'school']
        });

        if (!parentStudent || !parentStudent.parentPhone) {
            return [];
        }

        // Find all students with this parent phone number
        const query = this.studentRepository
            .createQueryBuilder('student')
            .leftJoinAndSelect('student.class', 'class')
            .leftJoinAndSelect('student.school', 'school')
            .where('student.parentPhone = :parentPhone', {
                parentPhone: parentStudent.parentPhone
            });

        if (schoolId) {
            query.andWhere('student.schoolId = :schoolId', { schoolId });
        }

        const students = await query.getMany();

        // Transform to the expected format
        return students.map(student => ({
            id: student.id,
            name: student.name,
            exam_number: student.examNumber,
            class_id: student.class?.id,
            class_name: student.class?.name,
            class_term: student.class?.term,
            academic_year: student.class?.academic_year,
            photo_url: student.photoUrl,
            grade: student.class?.name?.match(/\d+/)?.[0] || 'Unknown',
            school: student.school?.name || 'School',
            admissionNo: student.examNumber
        }));
    }
}