
'use client'

import { Bell, BookOpen, UserCheck, Users, CheckCircle, XCircle, FileDown, Clock, AlertCircle } from 'lucide-react';
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
import { getAverage, calculateBimesterScore } from '@/lib/mock-data';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { useMemo, useContext } from 'react';
import { GradesContext } from '@/context/GradesContext';
import { StudentsContext } from '@/context/StudentsContext';
import { CoursesContext } from '@/context/CoursesContext';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';


const chartConfig = {
  average: {
    label: 'Promedio',
    color: 'hsl(var(--chart-2))',
  },
  studentCount: {
    label: 'Estudiantes',
    color: 'hsl(var(--chart-1))',
  },
   presentes: {
    label: 'Presentes',
    color: 'hsl(var(--chart-1))',
    icon: CheckCircle,
  },
  ausentes: {
    label: 'Ausentes',
    color: 'hsl(var(--destructive))',
    icon: XCircle,
  },
} satisfies ChartConfig;

type GradeAssignment = {
  id?: string;
  courseIds: string[];
}

type TeacherAssignment = {
  gradeIds: string[];
}

export default function TeacherDashboard() {
  const { grades } = useContext(GradesContext);
  const { students } = useContext(StudentsContext);
  const { courses } = useContext(CoursesContext);
  const { user } = useUser();
  const firestore = useFirestore();

  const gradeAssignmentsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'gradeAssignments') : null, [firestore]);
  const { data: gradeAssignmentsData, isLoading: assignmentsLoading } = useCollection<GradeAssignment>(gradeAssignmentsCollection);

  const teacherAssignmentRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'teacherAssignments', user.uid);
  }, [firestore, user]);
  const { data: teacherAssignmentData, isLoading: teacherAssignmentLoading } = useDoc<TeacherAssignment>(teacherAssignmentRef);
  
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

  const studentsInTeacherCourses = useMemo(() => {
    if (!teacherAssignmentData) return [];
    const teacherGrades = teacherAssignmentData.gradeIds || [];
    return students.filter(student => teacherGrades.includes(student.grade));
  }, [students, teacherAssignmentData]);


  const courseAverages = useMemo(() => {
    if (assignmentsLoading || teacherAssignmentLoading) return [];

    return teacherCourses.map(course => {
      const gradesForCourse = grades.filter(g => g.courseId === course.id);
      
      const teacherGrades = teacherAssignmentData?.gradeIds || [];
      const studentsInCourseForTeacher = students.filter(s => 
          teacherGrades.includes(s.grade)
      );

      const relevantGrades = gradesForCourse.filter(g => studentsInCourseForTeacher.some(s => s.id === g.studentId));

      if (relevantGrades.length === 0) {
        return { name: course.name, average: 0 };
      }
      
      const totalAverage = relevantGrades.reduce((acc, grade) => acc + getAverage(grade), 0);
      return {
          name: course.name,
          average: Math.round(totalAverage / relevantGrades.length),
      }
    });
  }, [grades, teacherCourses, students, teacherAssignmentData, assignmentsLoading, teacherAssignmentLoading]);

  const recentStudentPerformance = useMemo(() => {
    if (assignmentsLoading || teacherAssignmentLoading) return [];
    
    const teacherGrades = teacherAssignmentData?.gradeIds || [];
    const studentsOfTeacher = students.filter(s => teacherGrades.includes(s.grade));
    
    // Get the most recent grades for these students across all teacher's courses
    const performanceData: { studentName: string, courseName: string, average: number }[] = [];
    
    studentsOfTeacher.forEach(student => {
      teacherCourses.forEach(course => {
        const grade = grades.find(g => g.studentId === student.id && g.courseId === course.id);
        if (grade) {
          performanceData.push({
            studentName: student.name,
            courseName: course.name,
            average: getAverage(grade),
          });
        }
      });
    });

    // A real implementation might sort by date, but for now we just take the first few
    return performanceData;
  }, [grades, students, teacherCourses, teacherAssignmentData, assignmentsLoading, teacherAssignmentLoading]);


  const totalStudents = studentsInTeacherCourses.length;

  // Simulación de asistencia más detallada
  const studentsAbsent = Math.floor(totalStudents * 0.1); // 10% absent
  const studentsLate = Math.floor(totalStudents * 0.05); // 5% late
  const studentsPresent = totalStudents - studentsAbsent - studentsLate;

  return (
    <div className="grid gap-4 md:gap-6">
       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presentes (hoy)</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentsPresent}</div>
            <p className="text-xs text-muted-foreground">de {totalStudents} estudiantes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ausentes (hoy)</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentsAbsent}</div>
             <p className="text-xs text-muted-foreground">de {totalStudents} estudiantes</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tardanzas (hoy)</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentsLate}</div>
             <p className="text-xs text-muted-foreground">de {totalStudents} estudiantes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de cursos</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teacherCourses.length}</div>
             <p className="text-xs text-muted-foreground">Cursos asignados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        <Card>
           <CardHeader>
            <CardTitle>Rendimiento general por curso</CardTitle>
            <CardDescription>Promedio de calificaciones en sus cursos.</CardDescription>
           </CardHeader>
          <CardContent>
             <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart accessibilityLayer data={courseAverages}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis domain={[50, 100]} />
                <Tooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="average" fill="var(--color-average)" radius={4}>
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Rendimiento reciente de estudiantes</CardTitle>
                <CardDescription>Un vistazo al rendimiento de los estudiantes en sus cursos.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                 <ScrollArea className="h-[250px] w-full whitespace-nowrap">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Estudiante</TableHead>
                          <TableHead>Curso</TableHead>
                          <TableHead className="text-center">Prom.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentStudentPerformance.slice(0, 5).map((data, index) => (
                          <TableRow key={`${data.studentName}-${data.courseName}-${index}`}>
                            <TableCell className="font-medium">{data.studentName}</TableCell>
                            <TableCell>{data.courseName}</TableCell>
                            <TableCell className="text-center">
                               <Badge variant={data.average >= 80 ? 'default' : data.average >= 60 ? 'secondary' : 'destructive'} 
                                      className={data.average >= 80 ? 'bg-green-500 hover:bg-green-600' : data.average < 60 ? '' : 'bg-yellow-500 text-black hover:bg-yellow-600'}>
                                {data.average}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
