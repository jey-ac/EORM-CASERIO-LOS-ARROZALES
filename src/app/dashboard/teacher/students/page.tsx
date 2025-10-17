
'use client'

import { useState, useMemo, useEffect, useContext } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AttendanceStatus, Student } from '@/lib/mock-data';
import { Calendar as CalendarIcon, Save, CheckCheck, File, Sheet } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import { es } from 'date-fns/locale'
import { useSearchParams } from 'next/navigation';
import { AttendanceContext } from '@/context/AttendanceContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, WithId } from '@/firebase';
import { CoursesContext } from '@/context/CoursesContext';
import { StudentsContext } from '@/context/StudentsContext';
import { doc, collection } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

type GradeAssignment = {
  courseIds: string[];
}

type TeacherAssignment = {
  gradeIds: string[];
}

export default function TeacherStudentsPage() {
    const searchParams = useSearchParams();
    const courseIdFromQuery = searchParams.get('courseId');
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const { courses } = useContext(CoursesContext);
    const { students } = useContext(StudentsContext);
    
    const gradeAssignmentsCollection = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'gradeAssignments') : null, [firestore, user]);
    const { data: gradeAssignmentsData } = useCollection<GradeAssignment>(gradeAssignmentsCollection);

    const teacherAssignmentRef = useMemoFirebase(() => {
      if (!user || !firestore) return null;
      return doc(firestore, 'teacherAssignments', user.uid);
    }, [firestore, user]);
    const { data: teacherAssignmentData } = useDoc<TeacherAssignment>(teacherAssignmentRef);

    const teacherCourses = useMemo(() => {
        if (!teacherAssignmentData || !gradeAssignmentsData) return [];
        
        const assignedGrades = teacherAssignmentData.gradeIds || [];
        const courseIds = new Set<string>();
        
        gradeAssignmentsData.forEach(assignment => {
            if (assignedGrades.includes(assignment.id)) {
                assignment.courseIds.forEach(courseId => courseIds.add(courseId));
            }
        });

        return courses.filter(course => courseIds.has(course.id));
    }, [teacherAssignmentData, gradeAssignmentsData, courses]);

    const [selectedCourse, setSelectedCourse] = useState(courseIdFromQuery || (teacherCourses.length > 0 ? teacherCourses[0].id : ''));
    const [date, setDate] = useState<Date>(new Date());
    
    const { dailyAttendances, saveAttendance } = useContext(AttendanceContext);

    const studentsInCourse: Student[] = useMemo(() => {
        if (!selectedCourse || !gradeAssignmentsData) return [];

        // Find which grades this course is taught in
        const gradesForCourse = gradeAssignmentsData
            .filter(ga => ga.courseIds.includes(selectedCourse))
            .map(ga => ga.id);

        // Find all students who are in those grades
        return students.filter(student => gradesForCourse.includes(student.grade));

    }, [selectedCourse, students, gradeAssignmentsData]);

    const attendanceRecords = useMemo(() => {
        const dateString = format(date, 'yyyy-MM-dd');
        const todaysAttendance = dailyAttendances.find(
            att => att.courseId === selectedCourse && att.date === dateString
        );

        if (todaysAttendance) {
            return todaysAttendance.records;
        }
        
        return studentsInCourse.map(student => ({
            studentId: student.id,
            status: 'presente' as AttendanceStatus,
        }));
    }, [selectedCourse, date, studentsInCourse, dailyAttendances]);

    const [currentAttendance, setCurrentAttendance] = useState(attendanceRecords);

    useEffect(() => {
        setCurrentAttendance(attendanceRecords);
    }, [attendanceRecords]);

    useEffect(() => {
        if (courseIdFromQuery && teacherCourses.some(c => c.id === courseIdFromQuery)) {
            setSelectedCourse(courseIdFromQuery);
        } else if (teacherCourses.length > 0 && !selectedCourse) {
            setSelectedCourse(teacherCourses[0].id);
        }
    }, [courseIdFromQuery, teacherCourses, selectedCourse]);
    
    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setCurrentAttendance(prev => {
            const existingRecord = prev.find(att => att.studentId === studentId);
            if (existingRecord) {
                return prev.map(att => 
                    att.studentId === studentId ? { ...att, status } : att
                );
            }
            return [...prev, { studentId, status }];
        });
    };
    
    const handleCourseChange = (courseId: string) => {
        setSelectedCourse(courseId);
    }

    const handleMarkAllPresent = () => {
        setCurrentAttendance(studentsInCourse.map(student => ({ studentId: student.id, status: 'presente' })));
    }

    const handleSaveAttendance = () => {
        if (!selectedCourse || !date) return;
        
        try {
            saveAttendance({
                courseId: selectedCourse,
                date: format(date, "yyyy-MM-dd"),
                records: currentAttendance,
            });
            toast({
                title: 'Éxito',
                description: 'Asistencia guardada exitosamente.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo guardar la asistencia.',
            });
        }
    };

    const handleExportPDF = () => {
        if (!selectedCourse || !date) return;
        const doc = new jsPDF();
        const courseName = teacherCourses.find(c => c.id === selectedCourse)?.name;

        doc.text(`Reporte de asistencia`, 14, 16);
        doc.text(`Curso: ${courseName}`, 14, 22);
        doc.text(`Fecha: ${format(date, "PPP", { locale: es })}`, 14, 28);
        
        const tableData = currentAttendance.map(record => {
            const student = studentsInCourse.find(s => s.id === record.studentId);
            return [
                student?.name || 'Desconocido',
                student?.grade || '',
                record.status,
            ];
        });

        doc.autoTable({
            startY: 35,
            head: [['Estudiante', 'Grado', 'Estado']],
            body: tableData,
        });
        doc.save(`asistencia_${courseName}_${format(date, "yyyy-MM-dd")}.pdf`);
    };

    const handleExportExcel = () => {
         if (!selectedCourse || !date) return;
        const courseName = teacherCourses.find(c => c.id === selectedCourse)?.name;
        
        const excelData = currentAttendance.map(record => {
            const student = studentsInCourse.find(s => s.id === record.studentId);
            return {
                Estudiante: student?.name || 'Desconocido',
                Grado: student?.grade || '',
                Estado: record.status,
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Asistencia');
        XLSX.writeFile(workbook, `asistencia_${courseName}_${format(date, "yyyy-MM-dd")}.xlsx`);
    };

    const statusTranslations: {[key in AttendanceStatus]: string} = {
        presente: "Presente",
        ausente: "Ausente",
        tardanza_justificada: "Tardanza Justificada",
        tardanza_no_justificada: "Tardanza No Justificada"
    }

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4">
                        <div>
                            <CardTitle>Estudiantes y asistencia</CardTitle>
                            <CardDescription>
                                Selecciona un curso y una fecha para registrar o consultar la asistencia.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
                        <div className='flex-1 min-w-[180px]'>
                            <p className="text-sm font-medium mb-2">Curso</p>
                             <Select value={selectedCourse} onValueChange={handleCourseChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione un curso" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teacherCourses.map(course => (
                                        <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className='flex-1 min-w-[180px]'>
                            <p className="text-sm font-medium mb-2">Fecha</p>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className="w-full justify-start text-left font-normal"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={(d) => setDate(d || new Date())}
                                    initialFocus
                                    locale={es}
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    {selectedCourse && (
                        <>
                            <div className="mb-4 flex justify-end">
                                <Button variant="secondary" onClick={handleMarkAllPresent}>
                                    <CheckCheck className="mr-2 h-4 w-4" />
                                    Marcar todos como presentes
                                </Button>
                            </div>
                            <ScrollArea className="w-full whitespace-nowrap">
                              <Table>
                                  <TableHeader>
                                      <TableRow>
                                          <TableHead>Estudiante</TableHead>
                                          <TableHead>Grado</TableHead>
                                          <TableHead className="min-w-[200px] text-right">Estado</TableHead>
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                      {studentsInCourse.map(student => (
                                          <TableRow key={student.id}>
                                              <TableCell className="font-medium">{student.name}</TableCell>
                                              <TableCell>{student.grade}</TableCell>
                                              <TableCell className="text-right">
                                                  <Select 
                                                      value={currentAttendance.find(a => a.studentId === student.id)?.status || 'presente'}
                                                      onValueChange={(status) => handleStatusChange(student.id, status as AttendanceStatus)}
                                                  >
                                                      <SelectTrigger className="ml-auto w-full sm:w-[200px]">
                                                          <SelectValue />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                          <SelectItem value="presente">Presente</SelectItem>
                                                          <SelectItem value="ausente">Ausente</SelectItem>
                                                          <SelectItem value="tardanza_justificada">Tardanza justificada</SelectItem>
                                                          <SelectItem value="tardanza_no_justificada">Tardanza no justificada</SelectItem>
                                                      </SelectContent>
                                                  </Select>
                                              </TableCell>
                                          </TableRow>
                                      ))}
                                  </TableBody>
                              </Table>
                            </ScrollArea>
                            <div className="mt-6 flex justify-end">
                                <Button onClick={handleSaveAttendance} disabled={studentsInCourse.length === 0}>
                                    <Save className="mr-2 h-4 w-4" />
                                    Guardar asistencia
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <CardTitle>Vista previa del reporte de asistencia</CardTitle>
                            <CardDescription>
                                Así se verán los datos al exportar para la fecha seleccionada.
                            </CardDescription>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                            <Button variant="outline" onClick={handleExportPDF} disabled={studentsInCourse.length === 0} className="w-full sm:w-auto">
                                <File className="mr-2 h-4 w-4" />
                                PDF
                            </Button>
                            <Button variant="outline" onClick={handleExportExcel} disabled={studentsInCourse.length === 0} className="w-full sm:w-auto">
                                <Sheet className="mr-2 h-4 w-4" />
                                Excel
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="w-full whitespace-nowrap">
                        {currentAttendance.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Estudiante</TableHead>
                                        <TableHead>Grado</TableHead>
                                        <TableHead>Estado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currentAttendance.map(record => {
                                        const student = studentsInCourse.find(s => s.id === record.studentId);
                                        return (
                                            <TableRow key={record.studentId}>
                                                <TableCell>{student?.name || 'Desconocido'}</TableCell>
                                                <TableCell>{student?.grade || ''}</TableCell>
                                                <TableCell>{statusTranslations[record.status]}</TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-center text-sm text-muted-foreground py-4">No hay estudiantes en este curso para mostrar.</p>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
