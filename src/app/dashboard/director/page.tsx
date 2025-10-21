'use client'

import { Bell, BookOpen, Users, UserCheck, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getAverage } from '@/lib/mock-data';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useContext, useMemo } from 'react';
import { GradesContext } from '@/context/GradesContext';
import { StudentsContext } from '@/context/StudentsContext';
import { CoursesContext } from '@/context/CoursesContext';
import { NotificationsContext } from '@/context/NotificationsContext';
import { AttendanceContext } from '@/context/AttendanceContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { WordOfTheDay } from '@/components/WordOfTheDay';

const chartConfig = {
  average: {
    label: 'Promedio',
    color: 'hsl(var(--primary))',
  },
  value: {
    label: 'Estudiantes',
  },
  studentCount: {
    label: 'Estudiantes',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

type GradeAssignment = {
  id?: string;
  courseIds: string[];
}

export default function DirectorPage() {
    const { grades } = useContext(GradesContext);
    const { students } = useContext(StudentsContext);
    const { courses } = useContext(CoursesContext);
    const { notifications } = useContext(NotificationsContext);
    const { dailyAttendances } = useContext(AttendanceContext);
    const firestore = useFirestore();

    const gradeAssignmentsCollection = useMemoFirebase(() => (firestore) ? collection(firestore, 'gradeAssignments') : null, [firestore]);
    const { data: assignmentsData, isLoading: assignmentsLoading } = useCollection<GradeAssignment>(gradeAssignmentsCollection);


    const totalStudents = students.length;
    const totalCourses = courses.length;

    const studentsByGrade: {[key: string]: number} = students.reduce((acc, student) => {
        acc[student.grade] = (acc[student.grade] || 0) + 1;
        return acc;
    }, {} as {[key: string]: number});

    const studentsByGradeData = Object.keys(studentsByGrade).map(grade => ({
        name: grade,
        value: studentsByGrade[grade]
    }));
    
    const coursesWithDetails = useMemo(() => {
        if (assignmentsLoading || !assignmentsData) {
            return courses.map(course => ({
                ...course,
                studentCount: 0,
                average: 0,
            }));
        }

        return courses.map(course => {
            const gradesTaughtIn = assignmentsData
                .filter(assignment => assignment.courseIds.includes(course.id))
                .map(assignment => assignment.id);
            
            const studentsInCourse = students.filter(student => 
                gradesTaughtIn.includes(student.grade)
            );
            const studentCount = studentsInCourse.length;

            const gradesForCourse = grades.filter(g => g.courseId === course.id && studentsInCourse.some(s => s.id === g.studentId));
            
            let average = 0;
            if (gradesForCourse.length > 0) {
                const totalAverage = gradesForCourse.reduce((acc, grade) => acc + getAverage(grade), 0);
                average = Math.round(totalAverage / gradesForCourse.length);
            }

            return {
                ...course,
                studentCount,
                average,
            };
        });
    }, [courses, students, grades, assignmentsData, assignmentsLoading]);

    const studentsPerCourseData = coursesWithDetails.map(c => ({ name: c.name, studentCount: c.studentCount }));
    const gradeAveragesData = coursesWithDetails.map(c => ({ name: c.name, average: c.average }));
    
    const todayString = format(new Date(), 'yyyy-MM-dd');
    const todayAttendance = useMemo(() => {
        const todaysRecords = dailyAttendances
            .filter(att => att.date === todayString)
            .flatMap(att => att.records);

        if (todaysRecords.length === 0) {
            return { present: '-', absent: '-', late: '-' };
        }
        
        const summary = {
            present: 0,
            absent: 0,
            late: 0,
        };

        const processedStudents = new Set<string>();

        // Iterate over all students to check their status for today
        students.forEach(student => {
            if (processedStudents.has(student.id)) return;

            const studentRecordsToday = todaysRecords.filter(rec => rec.studentId === student.id);
            
            if (studentRecordsToday.length > 0) {
                if (studentRecordsToday.some(r => r.status === 'ausente')) {
                    summary.absent++;
                } else if (studentRecordsToday.some(r => r.status.startsWith('tardanza'))) {
                    summary.late++;
                } else {
                    summary.present++;
                }
            } else {
                 summary.absent++;
            }
            processedStudents.add(student.id);
        });
        
        return summary;
    }, [dailyAttendances, todayString, students]);

    const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <div className="grid gap-4 md:gap-6">
       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de estudiantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">Estudiantes activos e inactivos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presentes (hoy)</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAttendance.present}</div>
             <p className="text-xs text-muted-foreground">{typeof todayAttendance.present === 'number' ? `de ${totalStudents} estudiantes` : 'No se ha tomado asistencia'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ausentes (hoy)</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAttendance.absent}</div>
            <p className="text-xs text-muted-foreground">{typeof todayAttendance.absent === 'number' ? `de ${totalStudents} estudiantes` : 'No se ha tomado asistencia'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tardanzas (hoy)</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAttendance.late}</div>
            <p className="text-xs text-muted-foreground">{typeof todayAttendance.late === 'number' ? `de ${totalStudents} estudiantes` : 'No se ha tomado asistencia'}</p>
          </CardContent>
        </Card>
      </div>
      
      <WordOfTheDay />

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        <Card>
           <CardHeader>
            <CardTitle>Rendimiento general por curso</CardTitle>
            <CardDescription>Promedio de calificaciones en todos los cursos.</CardDescription>
           </CardHeader>
          <CardContent className="pl-2">
             <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart accessibilityLayer data={gradeAveragesData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => value.slice(0, 3)} />
                <YAxis domain={[50, 100]} />
                <ChartTooltip
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
                <CardTitle>Distribución de estudiantes</CardTitle>
                <CardDescription>Cantidad de estudiantes por grado.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      <Pie data={studentsByGradeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} strokeWidth={2} paddingAngle={5}>
                        {studentsByGradeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-1 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Resumen de cursos</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Curso</TableHead>
                    <TableHead>Estudiantes inscritos</TableHead>
                    <TableHead className="text-center">Promedio general</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coursesWithDetails.map(course => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.name}</TableCell>
                      <TableCell>{course.studentCount}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={course.average >= 80 ? 'default' : course.average >= 60 ? 'secondary' : 'destructive'} 
                                className={course.average >= 80 ? 'bg-green-500 hover:bg-green-600' : course.average < 60 ? '' : 'bg-yellow-500 text-black hover:bg-yellow-600'}>
                          {course.average}
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
