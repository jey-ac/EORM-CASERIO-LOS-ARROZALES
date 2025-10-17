
'use client'

import { useMemo, useContext } from 'react';
import { BookOpen } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { CoursesContext } from '@/context/CoursesContext';
import { StudentsContext } from '@/context/StudentsContext';
import { UsersContext } from '@/context/UsersContext';
import { collection, doc } from 'firebase/firestore';

type GradeAssignment = {
  courseIds: string[];
}

type TeacherAssignment = {
  gradeIds: string[];
}

export default function CoursesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { users } = useContext(UsersContext);
  const { students } = useContext(StudentsContext);
  const { courses } = useContext(CoursesContext);

  const gradeAssignmentsCollection = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'gradeAssignments') : null, [firestore, user]);
  const { data: gradeAssignmentsData } = useCollection<GradeAssignment>(gradeAssignmentsCollection);

  const teacherAssignmentRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'teacherAssignments', user.uid);
  }, [firestore, user]);
  const { data: teacherAssignmentData } = useDoc<TeacherAssignment>(teacherAssignmentRef);

  const teacher = useMemo(() => users.find(u => u.id === user?.uid), [users, user]);

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

  const coursesWithStudentCount = useMemo(() => {
    if (!teacherAssignmentData || !gradeAssignmentsData) {
        return teacherCourses.map(course => ({...course, studentCount: 0}));
    }

    const assignedGradesForTeacher = teacherAssignmentData.gradeIds || [];
    
    return teacherCourses.map(course => {
      // Find grades where this course is taught
      const gradesForCourse = gradeAssignmentsData
        .filter(ga => ga.courseIds.includes(course.id))
        .map(ga => ga.id);

      // Find the intersection of grades for the course and grades for the teacher
      const relevantGrades = gradesForCourse.filter(g => assignedGradesForTeacher.includes(g));

      // Count students in those relevant grades
      const studentCount = students.filter(student => relevantGrades.includes(student.grade)).length;

      return {
        ...course,
        studentCount,
      }
    });
  }, [teacherCourses, students, gradeAssignmentsData, teacherAssignmentData]);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
            <CardTitle>Mis cursos</CardTitle>
            <CardDescription>Explore los cursos que imparte y los estudiantes matriculados en cada uno.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coursesWithStudentCount.map(course => (
              <Card key={course.id}>
                <CardHeader>
                    <div className="flex items-start gap-4">
                        <div className="rounded-lg bg-primary p-3 text-primary-foreground flex-shrink-0">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <div className='min-w-0'>
                            <CardTitle className="truncate">{course.name}</CardTitle>
                            <CardDescription className="truncate">{teacher?.name}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex -space-x-2 overflow-hidden">
                       {students.slice(0, 3).map(student => (
                          <Avatar key={student.id} className="h-8 w-8 border-2 border-background">
                            <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                       ))}
                    </div>
                    <Badge variant="secondary">{course.studentCount} estudiantes</Badge>
                  </div>
                </CardContent>
                 <div className="p-6 pt-0">
                    <Link href={`/dashboard/teacher/course/${course.id}`} className="w-full">
                        <Button variant="outline" className="w-full">Ver detalles del curso</Button>
                    </Link>
                </div>
              </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
