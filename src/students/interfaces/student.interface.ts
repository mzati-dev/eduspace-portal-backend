// src/students/interfaces/student.interface.ts
export interface Subject {
    name: string;
    qa1: number;
    qa2: number;
    endOfTerm: number;
    grade: string;
}

export interface StudentData {
    id: string;
    name: string;
    examNumber: string;
    class: string;
    term: string;
    photo: string;
    classRank: number;
    totalStudents: number;
    attendance: {
        present: number;
        absent: number;
        late: number;
    };
    subjects: Subject[];
    teacherRemarks: string;
}