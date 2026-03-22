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

    async getFeeStructures(schoolId: string, term?: string, academicYear?: string): Promise<FeeStructure[]> {
        const where: any = { isActive: true };

        if (term) where.term = term;
        if (academicYear) where.academicYear = academicYear;

        // Get all classes for this school to get their fee structures
        const classes = await this.classRepository.find({
            where: { schoolId: schoolId }
        });

        const classIds = classes.map(c => c.id);

        if (classIds.length > 0) {
            where.classId = In(classIds);
        }

        return this.feeStructureRepository.find({ where, order: { term: 'ASC' } });
    }

    async getStudentFees(schoolId: string, filters: any): Promise<StudentFee[]> {
        // Get all students in this school
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
            // Get fee structures for this term
            const feeStructures = await this.feeStructureRepository.find({
                where: { term: filters.term, classId: filters.classId || undefined }
            });
            const feeStructureIds = feeStructures.map(fs => fs.id);
            if (feeStructureIds.length > 0) {
                // This requires a more complex query - for now, filter in memory
                const fees = await this.studentFeeRepository.find({ where });
                return fees.filter(f => feeStructureIds.includes(f.feeStructureId));
            }
        }

        if (filters.status) {
            where.status = filters.status;
        }

        const fees = await this.studentFeeRepository.find({ where });

        // Apply date filters if needed
        if (filters.fromDate || filters.toDate) {
            const payments = await this.paymentRepository.find({
                where: {
                    studentId: In(studentIds),
                    ...(filters.fromDate && { date: Between(filters.fromDate, filters.toDate || filters.fromDate) })
                }
            });

            // Filter fees that have payments in the date range
            const studentIdsWithPayments = [...new Set(payments.map(p => p.studentId))];
            return fees.filter(f => studentIdsWithPayments.includes(f.studentId));
        }

        return fees;
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

        // Get all payments for these students
        const payments = await this.paymentRepository.find({
            where: { studentId: In(studentIds), status: 'completed' },
            order: { date: 'DESC' }
        });

        // Get all student fees
        const studentFees = await this.studentFeeRepository.find({
            where: { studentId: In(studentIds) }
        });

        const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
        const expectedRevenue = studentFees.reduce((sum, sf) => sum + (sf.feeStructure?.total || 0), 0);

        const today = new Date().toISOString().split('T')[0];
        const todayPayments = payments.filter(p => p.date === today);
        const paidToday = todayPayments.reduce((sum, p) => sum + p.amount, 0);

        // Get payments this month
        const thisMonth = new Date().getMonth();
        const thisMonthPayments = payments.filter(p => new Date(p.date).getMonth() === thisMonth);
        const paidThisMonth = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);

        // Get payments this term (simplified - based on term filter)
        let paidThisTerm = 0;
        if (term) {
            const termPayments = await this.paymentRepository.find({
                where: { studentId: In(studentIds), status: 'completed' },
                order: { date: 'DESC' }
            });
            // In a real implementation, you'd filter by term dates
            paidThisTerm = termPayments.reduce((sum, p) => sum + p.amount, 0);
        }

        const overdue = studentFees.filter(sf => sf.status === 'overdue').length;
        const pendingThisWeek = studentFees.filter(sf => {
            const dueDate = sf.feeStructure?.dueDate;
            if (!dueDate) return false;
            const due = new Date(dueDate);
            const now = new Date();
            const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays <= 7 && diffDays >= 0 && sf.status !== 'paid';
        }).reduce((sum, sf) => sum + sf.balance, 0);

        return {
            totalCollected,
            expectedRevenue,
            collectionRate: expectedRevenue > 0 ? (totalCollected / expectedRevenue) * 100 : 0,
            overdue,
            paidToday,
            pendingThisWeek,
            paidThisMonth,
            paidThisTerm: paidThisTerm || 0,
        };
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
        const studentFee = await this.studentFeeRepository.findOne({
            where: { studentId: data.studentId }
        });

        if (studentFee) {
            studentFee.paid += data.amount;
            studentFee.balance -= data.amount;
            studentFee.status = studentFee.balance <= 0 ? 'paid' : 'partial';

            studentFee.lastPayment = {
                date: paymentDate,
                amount: data.amount,
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

    async getPaymentHistory(schoolId: string, studentId?: string, fromDate?: string, toDate?: string): Promise<Payment[]> {
        const students = await this.studentRepository.find({
            where: { schoolId: schoolId }
        });

        const studentIds = students.map(s => s.id);

        const where: any = { studentId: In(studentIds) };

        if (studentId) {
            where.studentId = studentId;
        }

        if (fromDate && toDate) {
            where.date = Between(fromDate, toDate);
        } else if (fromDate) {
            where.date = Between(fromDate, fromDate);
        }

        return this.paymentRepository.find({
            where,
            order: { date: 'DESC' }
        });
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
}