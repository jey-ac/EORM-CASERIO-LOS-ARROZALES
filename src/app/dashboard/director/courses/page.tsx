
'use client'

import { useState, useContext, useMemo } from 'react';
import { BookOpen, File, Sheet, PlusCircle, MoreVertical, PenSquare, Trash2 } from 'lucide-react';
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
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CoursesContext } from '@/context/CoursesContext';
import { StudentsContext } from '@/context/StudentsContext';
import { Course } from '@/lib/mock-data';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useFirestore, useCollection, WithId, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

type GradeAssignment = {
  id?: string;
  courseIds: string[];
}

export default function DirectorCoursesPage() {
  const { courses, addCourse, updateCourse, deleteCourse } = useContext(CoursesContext);
  const { students } = useContext(StudentsContext);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<WithId<Course> | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<WithId<Course> | null>(null);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const gradeAssignmentsCollection = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'gradeAssignments') : null, [firestore, user]);
  const { data: assignmentsData, isLoading } = useCollection<GradeAssignment>(gradeAssignmentsCollection);

  const handleAddCourse = (courseName: string) => {
    if (courseName.trim() === '') return;
    try {
        addCourse({ name: courseName });
        setIsFormOpen(false);
        toast({
            title: 'Éxito',
            description: 'Curso creado exitosamente.',
        });
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo crear el curso.',
        });
    }
  };

  const handleUpdateCourse = (courseId: string, courseName: string) => {
    if (courseName.trim() === '') return;
    try {
        updateCourse({ id: courseId, name: courseName });
        setIsFormOpen(false);
        setEditingCourse(null);
        toast({
            title: 'Éxito',
            description: 'Curso actualizado exitosamente.',
        });
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo actualizar el curso.',
        });
    }
  };

  const handleDeleteCourse = (courseId: string) => {
    try {
        deleteCourse(courseId);
        setDeletingCourse(null);
        toast({
            title: 'Éxito',
            description: 'Curso eliminado exitosamente.',
        });
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo eliminar el curso.',
        });
    }
  }

  const openForm = (course: WithId<Course> | null = null) => {
    setEditingCourse(course);
    setIsFormOpen(true);
  }

  const closeForm = () => {
    setEditingCourse(null);
    setIsFormOpen(false);
  }

  const coursesWithDetails = useMemo(() => {
    if (isLoading || !assignmentsData) {
      return courses.map(course => ({
        ...course,
        studentCount: 0,
      }));
    }

    return courses.map(course => {
      const gradesTaughtIn = assignmentsData
        .filter(assignment => assignment.courseIds.includes(course.id))
        .map(assignment => assignment.id);
      
      const studentCount = students.filter(student => 
        gradesTaughtIn.includes(student.grade)
      ).length;

      return {
        ...course,
        studentCount,
      };
    });
  }, [courses, students, assignmentsData, isLoading]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de cursos", 14, 16);
    doc.autoTable({
      startY: 20,
      head: [['Nombre del curso', 'Estudiantes matriculados']],
      body: coursesWithDetails.map(course => [
        course.name,
        course.studentCount,
      ]),
    });
    doc.save('reporte_cursos.pdf');
  };

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(coursesWithDetails.map(course => ({
      'Nombre del curso': course.name,
      'Estudiantes matriculados': course.studentCount,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cursos');
    XLSX.writeFile(workbook, 'reporte_cursos.xlsx');
  };


  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <CardTitle>Cursos</CardTitle>
                <CardDescription>Explore, cree, edite y elimine los cursos de la escuela.</CardDescription>
            </div>
             <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button onClick={() => openForm()} className="w-full sm:w-auto">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Crear curso
                </Button>
                <Button variant="outline" onClick={handleExportPDF} className="w-full sm:w-auto">
                  <File className="mr-2 h-4 w-4" />
                  Exportar a PDF
                </Button>
                <Button variant="outline" onClick={handleExportExcel} className="w-full sm:w-auto">
                  <Sheet className="mr-2 h-4 w-4" />
                  Exportar a excel
                </Button>
            </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coursesWithDetails.map(course => (
              <Card key={course.id}>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="rounded-lg bg-primary p-3 text-primary-foreground flex-shrink-0">
                                <BookOpen className="h-6 w-6" />
                            </div>
                            <div className="min-w-0">
                                <CardTitle className="truncate">{course.name}</CardTitle>
                                <CardDescription>&nbsp;</CardDescription>
                            </div>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openForm(course)}>
                                    <PenSquare className="mr-2 h-4 w-4" />
                                    <span>Editar</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeletingCourse(course)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Eliminar</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                    <Link href={`/dashboard/director/courses/${course.id}`} className="w-full">
                        <Button variant="outline" className="w-full">Ver detalles del curso</Button>
                    </Link>
                </div>
              </Card>
          ))}
        </CardContent>
      </Card>
      <CourseFormDialog 
        isOpen={isFormOpen}
        onClose={closeForm}
        onSubmit={editingCourse ? (name) => handleUpdateCourse(editingCourse.id, name) : handleAddCourse}
        course={editingCourse}
      />
      <DeleteConfirmationDialog
        isOpen={!!deletingCourse}
        onClose={() => setDeletingCourse(null)}
        onConfirm={() => deletingCourse && handleDeleteCourse(deletingCourse.id)}
        courseName={deletingCourse?.name}
      />
    </div>
  );
}

function CourseFormDialog({ isOpen, onClose, onSubmit, course }: { isOpen: boolean, onClose: () => void, onSubmit: (name: string) => void, course?: WithId<Course> | null }) {
    
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const name = formData.get('name') as string;
      onSubmit(name);
  }

  if(!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{course ? 'Editar curso' : 'Crear nuevo curso'}</DialogTitle>
          <DialogDescription>
            {course ? 'Modifique el nombre del curso.' : 'Complete los detalles para agregar un nuevo curso a la escuela.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                  <Label htmlFor="name">Nombre del curso</Label>
                  <Input id="name" name="name" defaultValue={course?.name} placeholder="Ej: Programación" required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit">{course ? 'Guardar cambios' : 'Crear curso'}</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteConfirmationDialog({ isOpen, onClose, onConfirm, courseName }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, courseName?: string }) {
    if (!isOpen) return null;

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente el curso <span className='font-bold'>{courseName}</span> y todos sus datos asociados, como las calificaciones.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
                        Sí, eliminar curso
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
