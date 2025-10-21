
'use client';

import { useState, useMemo, useContext } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Grade, BimesterGrade, calculateBimesterScore, getAverage, Student } from '@/lib/mock-data';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { File, Sheet } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { GradesContext } from '@/context/GradesContext';
import { CoursesContext } from '@/context/CoursesContext';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { StudentsContext } from '@/context/StudentsContext';
import { UsersContext } from '@/context/UsersContext';
import { doc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WordOfTheDay } from '@/components/WordOfTheDay';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

type GradeAssignment = {
  courseIds: string[];
};

type GradeWithCourseInfo = Omit<Grade, 'id'> & {
    id: string; // Course ID becomes the unique key here
    courseName?: string;
    teacher?: string;
    average: number;
}

const emptyBimester: BimesterGrade = { actividades: 0, parcial: 0, examen: 0 };
const emptyGrade: Omit<Grade, 'id' | 'studentId' | 'courseId' | 'year'> = {
    bimestre1: emptyBimester,
    bimestre2: emptyBimester,
    bimestre3: emptyBimester,
    bimestre4: emptyBimester,
};


export default function StudentDashboard() {
  const { user } = useUser();
  const { grades } = useContext(GradesContext);
  const { courses } = useContext(CoursesContext);
  const { students } = useContext(StudentsContext);
  const { users } = useContext(UsersContext);
  const firestore = useFirestore();
  
  const student = useMemo(() => students.find(s => s.id === user?.uid || s.authUid === user?.uid), [user, students]);

  const gradeAssignmentRef = useMemoFirebase(() => {
    if (!firestore || !student?.grade) return null;
    return doc(firestore, 'gradeAssignments', student.grade);
  }, [firestore, student?.grade]);

  const { data: gradeAssignmentData } = useDoc<GradeAssignment>(gradeAssignmentRef);

  const studentCourses = useMemo(() => {
    if (!gradeAssignmentData || !courses) {
        return [];
    }
    const courseIds = gradeAssignmentData.courseIds || [];
    return courses.filter(c => courseIds.includes(c.id));
  }, [gradeAssignmentData, courses]);

  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedBimester, setSelectedBimester] = useState('all');

  const combinedData: GradeWithCourseInfo[] = useMemo(() => {
    if (!student || !studentCourses) {
        return [];
    }

    const studentGradesForYear = grades.filter(g => g.studentId === student.id && g.year && g.year.toString() === selectedYear);

    return studentCourses.map(course => {
        const gradeData = studentGradesForYear.find(g => g.courseId === course.id);
        const gradeDetails = gradeData || emptyGrade;
        
        // This is a simplification. In a real app, teacher assignment would be more complex.
        const teacher = users.find(u => u.role === 'profesor');
        const average = getAverage(gradeDetails);

        return {
            ...gradeDetails,
            id: course.id, // Use course id as key
            studentId: student.id,
            courseId: course.id,
            year: parseInt(selectedYear),
            courseName: course?.name,
            teacher: teacher?.name || 'No asignado',
            average,
        }
    })
  }, [student, studentCourses, grades, users, selectedYear]);


  const filteredData = useMemo(() => {
    if (selectedCourse === 'all') {
      return combinedData;
    }
    return combinedData.filter(data => data.courseId === selectedCourse);
  }, [selectedCourse, combinedData]);

  const getCardDescription = () => {
    const courseName = selectedCourse === 'all' ? 'todos los cursos' : courses.find(c => c.id === selectedCourse)?.name;
    const year = selectedYear;
    if (selectedBimester === 'all') {
      return `Viendo el resumen anual para ${courseName} del año ${year}.`
    }
    return `Desglose de notas para el ${selectedBimester.replace('bimestre', 'Bimestre ')} en ${courseName} del año ${year}.`
  }

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Reporte de calificaciones - ${student?.name || ''} - ${selectedYear}`, 14, 16);
    doc.autoTable({
      startY: 20,
      head: [['Curso', 'Profesor', 'Bim. 1', 'Bim. 2', 'Bim. 3', 'Bim. 4', 'Prom. final']],
      body: filteredData.map(d => [
        d.courseName,
        d.teacher,
        calculateBimesterScore(d.bimestre1),
        calculateBimesterScore(d.bimestre2),
        calculateBimesterScore(d.bimestre3),
        calculateBimesterScore(d.bimestre4),
        d.average,
      ]),
    });
    doc.save(`calificaciones_${student?.name?.replace(' ', '_')}_${selectedYear}.pdf`);
  };

  const handleExportExcel = () => {
    const dataToExport = filteredData.map(d => ({
      'Curso': d.courseName,
      'Profesor': d.teacher,
      'Bimestre 1': calculateBimesterScore(d.bimestre1),
      'Bimestre 2': calculateBimesterScore(d.bimestre2),
      'Bimestre 3': calculateBimesterScore(d.bimestre3),
      'Bimestre 4': calculateBimesterScore(d.bimestre4),
      'Promedio final': d.average,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Calificaciones ${selectedYear}`);
    XLSX.writeFile(workbook, `calificaciones_${student?.name?.replace(' ', '_')}_${selectedYear}.xlsx`);
  };

  if (!student) {
      return <div>Cargando perfil del estudiante...</div>
  }

  return (
    <div className="grid gap-6">
       <div className='mb-2 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start'>
        <div>
          <h2 className='text-2xl font-bold'>Mis calificaciones</h2>
          <p className='text-muted-foreground'>Viendo calificaciones para {student?.name}</p>
        </div>
        <div className='flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:flex-wrap'>
           <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-full sm:w-auto">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
           <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="w-full sm:w-auto">
                    <SelectValue placeholder="Filtrar por curso" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos los cursos</SelectItem>
                    {studentCourses.map(course => (
                        <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={selectedBimester} onValueChange={setSelectedBimester}>
                <SelectTrigger className="w-full sm:w-auto">
                    <SelectValue placeholder="Filtrar por bimestre" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos los bimestres</SelectItem>
                    <SelectItem value="bimestre1">Bimestre 1</SelectItem>
                    <SelectItem value="bimestre2">Bimestre 2</SelectItem>
                    <SelectItem value="bimestre3">Bimestre 3</SelectItem>
                    <SelectItem value="bimestre4">Bimestre 4</SelectItem>
                </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">Descargar</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <File className="mr-2 h-4 w-4" />
                  PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <Sheet className="mr-2 h-4 w-4" />
                  Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      <div className="mb-6">
        <WordOfTheDay />
      </div>
      
      <Card>
        <CardHeader>
            <div>
              <CardTitle>Resumen de calificaciones</CardTitle>
              <CardDescription>{getCardDescription()}</CardDescription>
            </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full whitespace-nowrap">
            <Table>
                <TableHeader>
                   {selectedBimester === 'all' ? (
                        <TableRow>
                            <TableHead>Curso</TableHead>
                            <TableHead className="text-center">Bim. 1</TableHead>
                            <TableHead className="text-center">Bim. 2</TableHead>
                            <TableHead className="text-center">Bim. 3</TableHead>
                            <TableHead className="text-center">Bim. 4</TableHead>
                            <TableHead className="text-center">Prom. final</TableHead>
                        </TableRow>
                   ) : (
                        <TableRow>
                            <TableHead>Curso</TableHead>
                            <TableHead className="text-center">Actividades (70pts)</TableHead>
                            <TableHead className="text-center">Parcial (10pts)</TableHead>
                            <TableHead className="text-center">Examen (20pts)</TableHead>
                            <TableHead className="text-center">Nota final bimestre</TableHead>
                        </TableRow>
                   )}
                </TableHeader>
                <TableBody>
                    {filteredData.length > 0 ? filteredData.map(data => {
                        const bimesterKey = selectedBimester as keyof typeof data;
                        const bimesterGrade = selectedBimester !== 'all' && typeof data[bimesterKey] === 'object' ? data[bimesterKey] as any : null;
                        const bimesterScore = bimesterGrade ? calculateBimesterScore(bimesterGrade) : 0;
                        return(
                            <TableRow key={data.courseId}>
                                <TableCell className="font-medium">
                                    <div>{data.courseName}</div>
                                    <div className='text-xs text-muted-foreground'>{data.teacher}</div>
                                </TableCell>

                                {selectedBimester === 'all' ? (
                                    <>
                                        <TableCell className="text-center">{calculateBimesterScore(data.bimestre1)}</TableCell>
                                        <TableCell className="text-center">{calculateBimesterScore(data.bimestre2)}</TableCell>
                                        <TableCell className="text-center">{calculateBimesterScore(data.bimestre3)}</TableCell>
                                        <TableCell className="text-center">{calculateBimesterScore(data.bimestre4)}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={data.average >= 80 ? 'default' : data.average >= 60 ? 'secondary' : 'destructive'} 
                                                className={`text-base ${data.average >= 80 ? 'bg-green-500 hover:bg-green-600' : data.average < 60 ? '' : 'bg-yellow-500 text-black hover:bg-yellow-600'}`}>
                                                {data.average}
                                            </Badge>
                                        </TableCell>
                                    </>
                                ) : (
                                    <>
                                        <TableCell className="text-center">{bimesterGrade?.actividades || 0}</TableCell>
                                        <TableCell className="text-center">{bimesterGrade?.parcial || 0}</TableCell>
                                        <TableCell className="text-center">{bimesterGrade?.examen || 0}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={bimesterScore >= 80 ? 'default' : bimesterScore >= 60 ? 'secondary' : 'destructive'} 
                                                className={`text-base ${bimesterScore >= 80 ? 'bg-green-500 hover:bg-green-600' : bimesterScore < 60 ? '' : 'bg-yellow-500 text-black hover:bg-yellow-600'}`}>
                                                {bimesterScore}
                                            </Badge>
                                        </TableCell>
                                    </>
                                )}
                            </TableRow>
                        )
                    }) : (
                        <TableRow>
                            <TableCell colSpan={selectedBimester === 'all' ? 6 : 5} className="text-center text-muted-foreground">
                                No hay calificaciones para mostrar en el año {selectedYear}.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
        </Card>
    </div>
  );
}

    