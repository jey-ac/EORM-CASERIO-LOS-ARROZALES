

export type User = {
    id: string;
    name: string;
    email: string;
    password?: string;
    role: 'administrador' | 'director' | 'profesor' | 'estudiante' | 'padre';
    status: 'active' | 'inactive';
    createdAt?: any;
    fcmTokens?: string[];
};

export type Student = User & {
    role: 'estudiante';
    grade: string;
    parentName?: string;
    birthCertificate?: string;
    enrollmentYear?: number;
    gender?: 'masculino' | 'femenino';
    dateOfBirth?: Date;
};

export type Teacher = User & {
    role: 'profesor';
};

export type Course = {
    id: string;
    name: string;
};

export type BimesterGrade = {
    actividades: number;
    parcial: number;
    examen: number;
}

export type Grade = {
    id: string;
    studentId: string;
    courseId: string;
    year: number;
    bimestre1: BimesterGrade;
    bimestre2: BimesterGrade;
    bimestre3: BimesterGrade;
    bimestre4: BimesterGrade;
};

export type Recipient = {
    type: 'all' | 'course' | 'teacher' | 'user';
    id: string;
}

export type Notification = {
    id: string;
    title: string;
    description: string;
    senderId: string;
    recipient: Recipient;
    date: string;
    createdAt?: any;
};


export type CalendarEvent = {
    id: string;
    title: string;
    date: Date;
    description?: string;
    category: 'reunion' | 'academico' | 'feriado' | 'actividad';
};

export type Message = {
    senderId: string;
    text: string;
    timestamp: any;
};

export type Conversation = {
    participants: string[];
    messages: Message[];
    readBy: string[];
};


export type AttendanceStatus = 'presente' | 'ausente' | 'tardanza_justificada' | 'tardanza_no_justificada';

export type AttendanceRecord = {
    studentId: string;
    status: AttendanceStatus;
}

export type DailyAttendance = {
    courseId: string;
    date: string; // YYYY-MM-DD
    records: AttendanceRecord[];
}

export const allGrades = [
    'Primer Grado',
    'Segundo Grado',
    'Tercer Grado',
    'Cuarto Grado',
    'Quinto Grado',
    'Sexto Grado',
];

export const teacherGradeAssignments: { [key: string]: string[] } = {
  'T1': ['Cuarto Grado', 'Quinto Grado'],
  'T2': ['Sexto Grado'],
  'T3': ['Primer Grado', 'Segundo Grado', 'Tercer Grado'],
};

export const gradeCourseAssignments: { [key: string]: string[] } = {
  'Primer Grado': ['C1', 'C4', 'C5', 'C6'],
  'Segundo Grado': ['C1', 'C4', 'C5', 'C6'],
  'Tercer Grado': ['C1', 'C2', 'C4', 'C5'],
  'Cuarto Grado': ['C1', 'C2', 'C3', 'C4'],
  'Quinto Grado': ['C1', 'C2', 'C3', 'C4'],
  'Sexto Grado': ['C1', 'C2', 'C3', 'C4'],
};

// Helper function
export const calculateBimesterScore = (bimester: BimesterGrade | undefined): number => {
    if (!bimester) return 0;
    const score = (bimester.actividades || 0) + (bimester.parcial || 0) + (bimester.examen || 0);
    return Math.round(score);
};

const bimesterHasGrades = (bimester: BimesterGrade | undefined): boolean => {
    if (!bimester) return false;
    return (bimester.actividades || 0) > 0 || (bimester.parcial || 0) > 0 || (bimester.examen || 0) > 0;
}

export const getAverage = (grade: Omit<Grade, 'studentId' | 'courseId' | 'id' | 'year'>) => {
    const bimesters = [grade.bimestre1, grade.bimestre2, grade.bimestre3, grade.bimestre4];
    
    const gradedBimesters = bimesters.filter(bimesterHasGrades);
    
    if (gradedBimesters.length === 0) {
        return 0;
    }
    
    const scores = gradedBimesters.map(bimester => calculateBimesterScore(bimester));
    const sum = scores.reduce((acc, score) => acc + score, 0);

    return Math.round(sum / gradedBimesters.length) || 0;
}
