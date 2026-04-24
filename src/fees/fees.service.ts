// src/modules/fees/fees.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { FeeStructure } from './entities/fee-structure.entity';
import { Payment } from './entities/payment.entity';
import { Reminder } from './entities/reminder.entity';
import { StudentFee } from './entities/student-fee.entity';
import { Student } from '../students/entities/student.entity';
import { Class } from '../students/entities/class.entity';

@Injectable()
export class FeesService {
    constructor(
        @InjectRepository(FeeStructure)
        private feeStructureRepository: Repository<FeeStructure>,
        @InjectRepository(Payment)
        private paymentRepository: Repository<Payment>,
        @InjectRepository(Reminder)
        private reminderRepository: Repository<Reminder>,
        @InjectRepository(StudentFee)
        private studentFeeRepository: Repository<StudentFee>,
        @InjectRepository(Student)
        private studentRepository: Repository<Student>,
        @InjectRepository(Class)
        private classRepository: Repository<Class>,
    ) { }

    // async getFeeStructures(schoolId: string, term?: string, academicYear?: string): Promise<FeeStructure[]> {
    //     const where: any = { isActive: true };

    //     if (term) where.term = term;
    //     if (academicYear) where.academicYear = academicYear;

    //     // Get all classes for this school to get their fee structures
    //     const classes = await this.classRepository.find({
    //         where: { schoolId: schoolId }
    //     });

    //     const classIds = classes.map(c => c.id);

    //     if (classIds.length > 0) {
    //         where.classId = In(classIds);
    //     }

    //     return this.feeStructureRepository.find({ where, order: { term: 'ASC' } });
    // }

    // async getFeeStructures(schoolId: string, term?: string, academicYear?: string): Promise<FeeStructure[]> {
    //     const where: any = { isActive: true };

    //     if (term) where.term = term;
    //     if (academicYear) where.academicYear = academicYear;

    //     // Get all classes for this school
    //     const classes = await this.classRepository.find({
    //         where: { schoolId: schoolId }
    //     });

    //     const classIds = classes.map(c => c.id);

    //     if (classIds.length > 0) {
    //         // Include fee structures that are for specific classes OR for all classes (classId is null)
    //         where.classId = In([...classIds, null]);
    //     }

    //     return this.feeStructureRepository.find({ where, order: { term: 'ASC' } });
    // }

    async getFeeStructures(schoolId: string, term?: string, academicYear?: string): Promise<FeeStructure[]> {
        const where: any = {
            isActive: true,
            schoolId: schoolId  // ← ADD THIS LINE
        };

        if (term) where.term = term;
        if (academicYear) where.academicYear = academicYear;

        // Get all classes for this school
        const classes = await this.classRepository.find({
            where: { schoolId: schoolId }
        });

        const classIds = classes.map(c => c.id);

        if (classIds.length > 0) {
            where.classId = In([...classIds, null]);
        }

        return this.feeStructureRepository.find({ where, order: { term: 'ASC' } });
    }

    // async getStudentFees(schoolId: string, filters: any): Promise<StudentFee[]> {
    //     // Get all students in this school
    //     const students = await this.studentRepository.find({
    //         where: { schoolId: schoolId },
    //         relations: ['class'],
    //     });

    //     const studentIds = students.map(s => s.id);

    //     if (studentIds.length === 0) {
    //         return [];
    //     }

    //     let where: any = { studentId: In(studentIds) };

    //     if (filters.classId) {
    //         const classStudents = students.filter(s => s.class?.id === filters.classId);
    //         where.studentId = In(classStudents.map(s => s.id));
    //     }

    //     if (filters.term) {
    //         // Get fee structures for this term
    //         const feeStructures = await this.feeStructureRepository.find({
    //             where: { term: filters.term, classId: filters.classId || undefined }
    //         });
    //         const feeStructureIds = feeStructures.map(fs => fs.id);
    //         if (feeStructureIds.length > 0) {
    //             // This requires a more complex query - for now, filter in memory
    //             let fees = await this.studentFeeRepository.find({ where });

    //             // If no fees found, sync first
    //             if (fees.length === 0) {
    //                 await this.syncStudentFees(schoolId, filters.term);
    //                 fees = await this.studentFeeRepository.find({ where });
    //             }

    //             return fees.filter(f => feeStructureIds.includes(f.feeStructureId));
    //         }
    //     }

    //     if (filters.status) {
    //         where.status = filters.status;
    //     }

    //     let fees = await this.studentFeeRepository.find({ where });

    //     // If no fees found and term is provided, sync first
    //     if (fees.length === 0 && filters.term) {
    //         await this.syncStudentFees(schoolId, filters.term);
    //         fees = await this.studentFeeRepository.find({ where });
    //     }

    //     // Apply date filters if needed
    //     if (filters.fromDate || filters.toDate) {
    //         const payments = await this.paymentRepository.find({
    //             where: {
    //                 studentId: In(studentIds),
    //                 ...(filters.fromDate && { date: Between(filters.fromDate, filters.toDate || filters.fromDate) })
    //             }
    //         });

    //         // Filter fees that have payments in the date range
    //         const studentIdsWithPayments = [...new Set(payments.map(p => p.studentId))];
    //         return fees.filter(f => studentIdsWithPayments.includes(f.studentId));
    //     }

    //     return fees;
    // }

    async getStudentFees(schoolId: string, filters: any): Promise<StudentFee[]> {
        const students = await this.studentRepository.find({
            where: { schoolId: schoolId },
            relations: ['class'],
        });

        const studentIds = students.map(s => s.id);

        if (studentIds.length === 0) {
            return [];
        }

        let where: any = { studentId: In(studentIds) };

        if (filters.classId) {
            const classStudents = students.filter(s => s.class?.id === filters.classId);
            where.studentId = In(classStudents.map(s => s.id));
        }

        if (filters.term) {
            const feeStructures = await this.feeStructureRepository.find({
                where: { term: filters.term }
            });
            const feeStructureIds = feeStructures.map(fs => fs.id);

            if (feeStructureIds.length > 0) {
                const fees = await this.studentFeeRepository.find({
                    where: {
                        studentId: where.studentId,
                        feeStructureId: In(feeStructureIds)
                    }
                });
                return fees;
            }
            return [];
        }

        if (filters.status) {
            where.status = filters.status;
        }

        return await this.studentFeeRepository.find({ where });
    }


    async getFeeSummary(schoolId: string, term?: string, classId?: string): Promise<any> {
        const students = await this.studentRepository.find({
            where: { schoolId: schoolId },
            relations: ['class'],
        });

        let filteredStudents = students;
        if (classId) {
            filteredStudents = students.filter(s => s.class?.id === classId);
        }

        const studentIds = filteredStudents.map(s => s.id);

        // Get all payments
        const payments = await this.paymentRepository.find({
            where: { studentId: In(studentIds), status: 'completed' },
        });

        // Get all student fees
        const studentFees = await this.studentFeeRepository.find({
            where: { studentId: In(studentIds) },
        });

        // Calculate totals using loops (NOT join or map)
        let totalCollected = 0;
        for (const p of payments) {
            totalCollected += Number(p.amount);
        }

        let expectedRevenue = 0;
        for (const sf of studentFees) {
            if (sf.feeStructure && sf.feeStructure.total) {
                expectedRevenue += Number(sf.feeStructure.total);
            }
        }

        const today = new Date().toISOString().split('T')[0];

        let paidToday = 0;
        for (const p of payments) {
            if (p.date === today) {
                paidToday += Number(p.amount);
            }
        }

        // Calculate pending this week
        let pendingThisWeek = 0;
        for (const sf of studentFees) {
            if (sf.status !== 'paid') {
                pendingThisWeek += Number(sf.balance || 0);
            }
        }

        return {
            totalCollected,
            expectedRevenue,
            collectionRate: expectedRevenue > 0 ? (totalCollected / expectedRevenue) * 100 : 0,
            overdue: studentFees.filter(sf => sf.status === 'overdue').length,
            paidToday,
            pendingThisWeek,
            paidThisMonth: totalCollected,
            paidThisTerm: totalCollected,
        };
    }

    // Add this method to fees.service.ts
    async syncStudentFees(schoolId: string, term?: string): Promise<{ created: number }> {
        // Get all students in this school
        const students = await this.studentRepository.find({
            where: { schoolId: schoolId },
            relations: ['class'],
        });

        if (students.length === 0) {
            return { created: 0 };
        }

        // Get active fee structures
        const where: any = { isActive: true };
        if (term) where.term = term;

        const feeStructures = await this.feeStructureRepository.find({ where });

        if (feeStructures.length === 0) {
            return { created: 0 };
        }

        let created = 0;

        for (const student of students) {
            // Find the appropriate fee structure (by term and class)
            const feeStructure = feeStructures.find(fs =>
                fs.term === (term || 'Term 1') &&
                (!fs.classId || fs.classId === student.class?.id)
            );

            if (!feeStructure) continue;

            // Check if student fee record already exists
            const existing = await this.studentFeeRepository.findOne({
                where: {
                    studentId: student.id,
                    feeStructureId: feeStructure.id
                }
            });

            if (!existing) {
                // Create new student fee record
                const studentFee = this.studentFeeRepository.create({
                    studentId: student.id,
                    studentName: student.name,
                    examNumber: student.examNumber,
                    class: student.class?.name || 'N/A',
                    classId: student.class?.id || '',
                    parentPhone: student.parentPhone,
                    parentEmail: student.parentEmail,
                    feeStructureId: feeStructure.id,
                    feeStructure: {
                        id: feeStructure.id,
                        term: feeStructure.term,
                        academicYear: feeStructure.academicYear,
                        tuition: feeStructure.tuition,
                        development: feeStructure.development,
                        sports: feeStructure.sports,
                        library: feeStructure.library,
                        transport: feeStructure.transport,
                        meal: feeStructure.meal || 0,      // ← ADD THIS
                        exam: feeStructure.exam || 0,      // ← ADD THIS
                        customFees: feeStructure.customFees || [], // ← ADD THIS
                        total: feeStructure.total,
                        dueDate: feeStructure.dueDate,
                    },
                    paid: 0,
                    balance: feeStructure.total,
                    status: 'unpaid',
                });

                await this.studentFeeRepository.save(studentFee);
                created++;
            }
        }

        return { created };
    }

    async createFeeStructure(schoolId: string, data: any): Promise<FeeStructure> {
        const classes = await this.classRepository.find({
            where: { schoolId: schoolId }
        });

        // Calculate standard fees total including meal and exam
        const standardTotal = (data.tuition || 0) +
            (data.development || 0) +
            (data.sports || 0) +
            (data.library || 0) +
            (data.transport || 0) +
            (data.meal || 0) +
            (data.exam || 0);

        // Calculate custom fees total
        const customTotal = (data.customFees || []).reduce((sum: number, fee: any) => sum + (fee.amount || 0), 0);
        const total = standardTotal + customTotal;

        // const feeData: Partial<FeeStructure> = {
        //     ...data,
        //     total: total,
        //     isActive: true,
        //     // classId: data.classId || null,
        //     classId: data.classId && data.classId !== '' ? data.classId : null,
        //     className: data.classId ? classes.find(c => c.id === data.classId)?.name : null
        // };

        // const feeData: Partial<FeeStructure> = {
        //     ...data,
        //     total: total,
        //     isActive: true,
        //     classId: data.classId && data.classId !== '' ? data.classId : null,
        //     className: data.classId ? classes.find(c => c.id === data.classId)?.name : null
        // };

        const feeData: Partial<FeeStructure> = {
            ...data,
            total: total,
            isActive: true,
            schoolId: schoolId,  // ← ADD THIS LINE
            classId: data.classId && data.classId !== '' ? data.classId : null,
            className: data.classId ? classes.find(c => c.id === data.classId)?.name : null
        };

        const feeStructure = this.feeStructureRepository.create(feeData);
        const saved = await this.feeStructureRepository.save(feeStructure);

        await this.syncStudentFees(schoolId, data.term);

        return saved;
    }

    async updateFeeStructure(schoolId: string, id: string, data: any): Promise<FeeStructure> {
        const feeStructure = await this.feeStructureRepository.findOne({
            where: { id, isActive: true }
        });

        if (!feeStructure) {
            throw new NotFoundException('Fee structure not found');
        }

        // Calculate standard fees total including meal and exam
        const standardTotal = (data.tuition !== undefined ? data.tuition : feeStructure.tuition) +
            (data.development !== undefined ? data.development : feeStructure.development) +
            (data.sports !== undefined ? data.sports : feeStructure.sports) +
            (data.library !== undefined ? data.library : feeStructure.library) +
            (data.transport !== undefined ? data.transport : feeStructure.transport) +
            (data.meal !== undefined ? data.meal : feeStructure.meal || 0) +
            (data.exam !== undefined ? data.exam : feeStructure.exam || 0);

        // Calculate custom fees total
        const customFees = data.customFees !== undefined ? data.customFees : feeStructure.customFees || [];
        const customTotal = customFees.reduce((sum: number, fee: any) => sum + (fee.amount || 0), 0);
        const total = standardTotal + customTotal;

        const updated = await this.feeStructureRepository.save({
            ...feeStructure,
            ...data,
            total: total
        });

        await this.syncStudentFees(schoolId, updated.term);

        return updated;
    }

    async deleteFeeStructure(schoolId: string, id: string): Promise<void> {
        const feeStructure = await this.feeStructureRepository.findOne({
            where: { id, isActive: true }
        });

        if (!feeStructure) {
            throw new NotFoundException('Fee structure not found');
        }

        // Soft delete - mark as inactive
        feeStructure.isActive = false;
        await this.feeStructureRepository.save(feeStructure);
    }

    async recordPayment(data: any, userId: string): Promise<Payment> {
        // Generate receipt number
        const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const paymentDate = data.date || new Date().toISOString().split('T')[0];

        // 1. Intercept the 'any' type here. 
        // By strictly typing this as Partial<Payment>, we force TypeORM 
        // to use the single-entity version of .create() and .save()
        const paymentData: Partial<Payment> = {
            ...data,
            receiptNumber,
            recordedBy: userId,
            date: paymentDate,
            status: 'completed',
        };

        // 2. Now TypeORM strictly knows 'payment' is a single object
        const payment = this.paymentRepository.create(paymentData);

        // 3. And strictly returns a single Payment object
        const savedPayment = await this.paymentRepository.save(payment);

        // Update student fee record
        // const studentFee = await this.studentFeeRepository.findOne({
        //     where: { studentId: data.studentId }
        // });

        // if (studentFee) {
        //     studentFee.paid += data.amount;
        //     studentFee.balance -= data.amount;
        //     studentFee.status = studentFee.balance <= 0 ? 'paid' : 'partial';

        //     studentFee.lastPayment = {
        //         date: paymentDate,
        //         amount: data.amount,
        //         method: data.method,
        //         reference: data.reference || '',
        //     };

        //     await this.studentFeeRepository.save(studentFee);
        // }

        // Update student fee record
        const studentFee = await this.studentFeeRepository.findOne({
            where: { studentId: data.studentId }
        });

        if (studentFee) {
            const amount = Number(data.amount);
            studentFee.paid = Number(studentFee.paid) + amount;
            studentFee.balance = Number(studentFee.balance) - amount;
            studentFee.status = studentFee.balance <= 0 ? 'paid' : 'partial';

            studentFee.lastPayment = {
                date: paymentDate,
                amount: amount,
                method: data.method,
                reference: data.reference || '',
            };

            await this.studentFeeRepository.save(studentFee);
        }

        return savedPayment;
    }

    async sendReminders(data: any, userId: string): Promise<{ success: boolean; sent: number; failed: number }> {
        const { studentIds, type, customMessage } = data;

        let sent = 0;
        let failed = 0;

        // Get students to get their contact info
        const students = await this.studentRepository.find({
            where: { id: In(studentIds) }
        });

        for (const student of students) {
            let message = customMessage || `Dear Parent, fees payment for ${student.name} is due. Please pay to avoid penalties.`;

            // In real implementation, you would integrate with SMS/Email service here
            // For now, we just record the reminder

            const reminder = this.reminderRepository.create({
                studentId: student.id,
                type,
                sentAt: new Date(),
                status: 'sent',
                message,
                sentBy: userId,
                recipientCount: 1,
            });

            await this.reminderRepository.save(reminder);
            sent++;
        }

        return { success: true, sent, failed };
    }

    // async getPaymentHistory(schoolId: string, studentId?: string, fromDate?: string, toDate?: string): Promise<Payment[]> {
    //     const students = await this.studentRepository.find({
    //         where: { schoolId: schoolId }
    //     });

    //     const studentIds = students.map(s => s.id);

    //     const where: any = { studentId: In(studentIds) };

    //     if (studentId) {
    //         where.studentId = studentId;
    //     }

    //     if (fromDate && toDate) {
    //         where.date = Between(fromDate, toDate);
    //     } else if (fromDate) {
    //         where.date = Between(fromDate, fromDate);
    //     }

    //     return this.paymentRepository.find({
    //         where,
    //         order: { date: 'DESC' }
    //     });
    // }

    // async getPaymentHistory(schoolId: string, studentId?: string, fromDate?: string, toDate?: string): Promise<any[]> {
    //     const students = await this.studentRepository.find({
    //         where: { schoolId: schoolId }
    //     });

    //     const studentIds = students.map(s => s.id);

    //     const where: any = { studentId: In(studentIds) };

    //     if (studentId) {
    //         where.studentId = studentId;
    //     }

    //     if (fromDate && toDate) {
    //         where.date = Between(fromDate, toDate);
    //     } else if (fromDate) {
    //         where.date = Between(fromDate, fromDate);
    //     }

    //     const payments = await this.paymentRepository.find({
    //         where,
    //         order: { date: 'DESC' }
    //     });

    //     // Add student details to each payment
    //     // const paymentsWithStudents = await Promise.all(payments.map(async (payment) => {
    //     //     const student = await this.studentRepository.findOne({
    //     //         where: { id: payment.studentId }
    //     //     });
    //     //     return {
    //     //         ...payment,
    //     //         studentName: student?.name || 'Unknown',
    //     //         examNumber: student?.examNumber || 'Unknown'
    //     //     };
    //     // }));
    //     const paymentsWithStudents = await Promise.all(payments.map(async (payment) => {
    //         const student = await this.studentRepository.findOne({
    //             where: { id: payment.studentId },
    //             relations: ['class']
    //         });
    //         return {
    //             ...payment,
    //             studentName: student?.name || 'Unknown',
    //             examNumber: student?.examNumber || 'Unknown',
    //             className: student?.class?.name || 'Unknown'
    //         };
    //     }));

    //     return paymentsWithStudents;
    // }

    async getPaymentHistory(
        schoolId: string,
        studentId?: string,
        fromDate?: string,
        toDate?: string,
        term?: string,
        classId?: string
    ): Promise<any[]> {
        // Get all students in this school with their class
        const students = await this.studentRepository.find({
            where: { schoolId: schoolId },
            relations: ['class'],
        });

        let filteredStudents = students;

        // Filter by class if provided
        if (classId) {
            filteredStudents = filteredStudents.filter(s => s.class?.id === classId);
        }

        // Filter by term if provided
        if (term) {
            filteredStudents = filteredStudents.filter(s => s.class?.term === term);
        }

        const studentIds = filteredStudents.map(s => s.id);

        if (studentIds.length === 0) {
            return [];
        }

        const where: any = { studentId: In(studentIds) };

        if (studentId) {
            where.studentId = studentId;
        }

        if (fromDate && toDate) {
            where.date = Between(fromDate, toDate);
        } else if (fromDate) {
            where.date = Between(fromDate, fromDate);
        }

        const payments = await this.paymentRepository.find({
            where,
            order: { date: 'DESC' }
        });

        const paymentsWithStudents = await Promise.all(payments.map(async (payment) => {
            const student = await this.studentRepository.findOne({
                where: { id: payment.studentId },
                relations: ['class']
            });
            return {
                ...payment,
                studentName: student?.name || 'Unknown',
                examNumber: student?.examNumber || 'Unknown',
                className: student?.class?.name || 'Unknown'
            };
        }));

        return paymentsWithStudents;
    }

    async getReminderHistory(schoolId: string, studentId?: string): Promise<Reminder[]> {
        const students = await this.studentRepository.find({
            where: { schoolId: schoolId }
        });

        const studentIds = students.map(s => s.id);

        const where: any = { studentId: In(studentIds) };

        if (studentId) {
            where.studentId = studentId;
        }

        return this.reminderRepository.find({
            where,
            order: { sentAt: 'DESC' }
        });
    }

    async generateReceipt(receiptNumber: string): Promise<{ buffer: Buffer; filename: string }> {
        const payment = await this.paymentRepository.findOne({
            where: { receiptNumber }
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        const student = await this.studentRepository.findOne({
            where: { id: payment.studentId },
            relations: ['class']
        });

        const studentFee = await this.studentFeeRepository.findOne({
            where: { studentId: payment.studentId }
        });

        // Generate PDF receipt (simplified - returns JSON for now)
        const receiptData = {
            receiptNumber: payment.receiptNumber,
            date: payment.date,
            studentName: student?.name || 'Unknown',
            examNumber: student?.examNumber || 'Unknown',
            class: student?.class?.name || 'Unknown',
            amount: payment.amount,
            method: payment.method,
            reference: payment.reference,
            balance: studentFee?.balance || 0,
        };

        const buffer = Buffer.from(JSON.stringify(receiptData, null, 2));
        const filename = `receipt-${receiptNumber}.pdf`;

        return { buffer, filename };
    }

    async generateReceiptByPaymentId(paymentId: string): Promise<{ buffer: Buffer; filename: string }> {
        const payment = await this.paymentRepository.findOne({
            where: { id: paymentId }
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        return this.generateReceipt(payment.receiptNumber);
    }

    async exportReport(schoolId: string, format: string, filters: any): Promise<{ buffer: Buffer; filename: string }> {
        const studentFees = await this.getStudentFees(schoolId, filters);
        const payments = await this.getPaymentHistory(schoolId, undefined, filters.fromDate, filters.toDate);

        const reportData = {
            generatedAt: new Date().toISOString(),
            filters,
            summary: await this.getFeeSummary(schoolId, filters.term, filters.classId),
            studentFees,
            payments,
        };

        const jsonString = JSON.stringify(reportData, null, 2);
        const buffer = Buffer.from(jsonString);
        const filename = `fees-report-${new Date().toISOString().split('T')[0]}.json`;

        return { buffer, filename };
    }

    // ✅ ADD THIS METHOD HERE - at the very end, before the closing }
    async getUniqueTerms(schoolId: string): Promise<string[]> {
        const result = await this.classRepository
            .createQueryBuilder('class')
            .select('DISTINCT class.term', 'term')
            .where('class.schoolId = :schoolId', { schoolId })
            .orderBy('class.term', 'ASC')
            .getRawMany();

        return result.map(r => r.term);
    }
}