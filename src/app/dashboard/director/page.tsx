
'use client'

import { Bell, BookOpen, Users, UserCheck } from 'lucide-react';
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

    const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <div className="grid gap-4 md:gap-6">
       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de estudiantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground mb-2">Estudiantes por grado</p>
             <ChartContainer config={chartConfig} className="h-[100px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={studentsByGradeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={40} strokeWidth={2}>
                      {studentsByGradeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de cursos</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCourses}</div>
            <p className="text-xs text-muted-foreground mb-2">Estudiantes por curso</p>
            <ChartContainer config={chartConfig} className="h-[100px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={studentsPerCourseData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                        <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => value.slice(0, 3)} />
                        <YAxis hide />
                        <ChartTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent indicator="dot" />} />
                        <Bar dataKey="studentCount" fill="var(--color-studentCount)" radius={2} />
                    </BarChart>
                </ResponsiveContainer>
             </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notificaciones</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.length}</div>
            <p className="text-xs text-muted-foreground mb-2">Enviadas este año académico</p>
            <ScrollArea className="h-24">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead className="h-8">Recientes</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {notifications.slice(0,3).map(notification => (
                          <TableRow key={notification.id}>
                              <TableCell className="py-1 truncate">{notification.title}</TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
           <CardHeader>
            <CardTitle>Rendimiento general por curso</CardTitle>
            <CardDescription>Promedio de calificaciones en todos los cursos.</CardDescription>
           </CardHeader>
          <CardContent>
             <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart accessibilityLayer data={gradeAveragesData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
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

        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Distribución de estudiantes</CardTitle>
                <CardDescription>Cantidad de estudiantes por grado.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={studentsByGradeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} strokeWidth={2} paddingAngle={5}>
                        {studentsByGradeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
