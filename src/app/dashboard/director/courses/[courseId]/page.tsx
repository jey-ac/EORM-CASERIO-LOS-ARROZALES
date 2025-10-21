
'use client'

import { useContext, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Grade, BimesterGrade, calculateBimesterScore, allGrades, getAverage } from '@/lib/mock-data';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GradesContext } from '@/context/GradesContext';
import { CoursesContext } from '@/context/CoursesContext';
import { StudentsContext } from '@/context/StudentsContext';
import { useFirestore, useCollection, WithId, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';

type GradeAssignment = {
  courseIds: string[];
};

type GradeWithStudentInfo = Omit<Grade, 'id'> & {
    studentName?: string;
    studentGrade?: string;
    average: number;
}

const emptyBimester: BimesterGrade = { actividades: 0, parcial: 0, examen: 0 };

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const { courses } = useContext(CoursesContext);
  const { students } = useContext(StudentsContext);
  const course = courses.find(c => c.id === courseId);
  const { grades } = useContext(GradesContext);
  const { user } = useUser();
  const firestore = useFirestore();
  const gradeAssignmentsCollection = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'gradeAssignments') : null, [firestore, user]);
  const { data: gradeAssignmentsData } = useCollection<GradeAssignment>(gradeAssignmentsCollection);

  const gradesTaughtIn = useMemo(() => {
    if (!gradeAssignmentsData || !courseId) return [];
    
    return allGrades.filter(gradeName => {
        const assignment = gradeAssignmentsData.find(a => a.id === gradeName);
        return assignment?.courseIds.includes(courseId);
    });
  }, [courseId, gradeAssignmentsData]);

  const studentsInCourse = useMemo(() => {
    return students.filter(student => gradesTaughtIn.includes(student.grade));
  }, [students, gradesTaughtIn]);

  const combinedData: GradeWithStudentInfo[] = useMemo(() => {
      if (!courseId) return [];
      return studentsInCourse.map((student) => {
          const gradeData = grades.find(g => g.studentId === student.id && g.courseId === courseId);
          
          const emptyGrade: Omit<Grade, 'id'> = {
            studentId: student.id,
            courseId: courseId,
            year: new Date().getFullYear(),
            bimestre1: emptyBimester,
            bimestre2: emptyBimester,
            bimestre3: emptyBimester,
            bimestre4: emptyBimester,
          };

          const gradeDetails = gradeData || emptyGrade;
          const average = getAverage(gradeDetails);
          return { 
              ...gradeDetails,
              studentId: student.id,
              courseId: courseId,
              studentName: student.name, 
              studentGrade: student.grade, 
              average 
          };
      });
  }, [studentsInCourse, grades, courseId]);


  if (!course) {
    // This can happen briefly on first load
    return <div>Cargando...</div>;
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/dashboard/director/courses">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Atrás</span>
                </Link>
            </Button>
            <div>
                <h1 className="text-2xl font-bold">{course.name}</h1>
                 <p className="text-muted-foreground">
                    {gradesTaughtIn.length > 0 ? `Impartido en: ${gradesTaughtIn.join(', ')}` : 'No asignado a ningún grado'}
                </p>
            </div>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Estudiantes matriculados</CardTitle>
          <CardDescription>Rendimiento de los estudiantes en este curso.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full whitespace-nowrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Grado</TableHead>
                  <TableHead className="text-center">Prom.</TableHead>
                  <TableHead className="text-center">Bim. 1</TableHead>
                  <TableHead className="text-center">Bim. 2</TableHead>
                  <TableHead className="text-center">Bim. 3</TableHead>
                  <TableHead className="text-center">Bim. 4</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combinedData.map((data) => (
                  <TableRow key={data.studentId}>
                      <TableCell className="font-medium flex items-center gap-3">
                          <Avatar className="h-8 w-8 border-2 border-background">
                              <AvatarFallback>{data.studentName?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          {data.studentName}
                      </TableCell>
                    <TableCell>{data.studentGrade}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={data.average >= 80 ? 'default' : data.average >= 60 ? 'secondary' : 'destructive'} 
                              className={data.average >= 80 ? 'bg-green-500 hover:bg-green-600' : data.average < 60 ? '' : 'bg-yellow-500 text-black hover:bg-yellow-600'}>
                        {data.average}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{calculateBimesterScore(data.bimestre1)}</TableCell>
                    <TableCell className="text-center">{calculateBimesterScore(data.bimestre2)}</TableCell>
                    <TableCell className="text-center">{calculateBimesterScore(data.bimestre3)}</TableCell>
                    <TableCell className="text-center">{calculateBimesterScore(data.bimestre4)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
