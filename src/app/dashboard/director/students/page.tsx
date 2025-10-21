
'use client'

import React, { useState, useMemo, useContext, useEffect } from 'react';
import { File, PenSquare, Search, Sheet, Calendar as CalendarIcon } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Student } from '@/lib/mock-data';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { StudentsContext } from '@/context/StudentsContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { WithId } from '@/firebase';
import { CoursesContext } from '@/context/CoursesContext';
import { GradesContext } from '@/context/GradesContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function DirectorStudentsPage() {
    const { students, updateStudent } = useContext(StudentsContext);
    const { courses } = useContext(CoursesContext);
    const { grades } = useContext(GradesContext);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<WithId<Student> | null>(null);
    const [nameFilter, setNameFilter] = useState('');
    const [courseFilter, setCourseFilter] = useState('all');
    const { toast } = useToast();

    const handleUpdateStudent = (student: Partial<Student> & { id: string }) => {
        try {
            updateStudent(student);
            toast({
                title: 'Éxito',
                description: 'Estudiante actualizado exitosamente.',
            });
        } catch(error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo actualizar el estudiante.',
            });
        }
    };
    
    const openEditForm = (student: WithId<Student>) => {
        setEditingStudent(student);
        setIsFormOpen(true);
    }
    
    const closeForm = () => {
        setIsFormOpen(false);
        setEditingStudent(null);
    }

    const filteredStudents = useMemo(() => {
        let filtered = students;

        if (nameFilter) {
            filtered = filtered.filter(student =>
                student.name.toLowerCase().includes(nameFilter.toLowerCase())
            );
        }

        if (courseFilter !== 'all') {
            const studentIdsInCourse = grades
                .filter(grade => grade.courseId === courseFilter)
                .map(grade => grade.studentId);
            filtered = filtered.filter(student => studentIdsInCourse.includes(student.id));
        }

        return filtered;
    }, [students, nameFilter, courseFilter, grades]);

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text("Reporte de estudiantes", 14, 16);
        doc.autoTable({
        startY: 20,
        head: [['ID', 'Nombre', 'Grado', 'Estado']],
        body: filteredStudents.map(student => [student.id, student.name, student.grade, student.status]),
        });
        doc.save('reporte_estudiantes.pdf');
    };

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredStudents.map(s => ({
            ID: s.id,
            Nombre: s.name,
            Grado: s.grade,
            Estado: s.status,
            Email: s.email,
            'Padre/Encargado': s.parentName,
            CUI: s.birthCertificate,
            'Fecha de Nacimiento': s.dateOfBirth ? format(s.dateOfBirth, 'yyyy-MM-dd') : '',
            Sexo: s.gender,
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Estudiantes');
        XLSX.writeFile(workbook, 'reporte_estudiantes.xlsx');
    };


  return (
    <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <CardTitle>Estudiantes</CardTitle>
                    <CardDescription>Edite la información de los estudiantes inscritos.</CardDescription>
                </div>
                 <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                    <Button variant="outline" onClick={handleExportPDF} className="w-full sm:w-auto">
                        <File className="mr-2 h-4 w-4" />
                        Exportar a PDF
                    </Button>
                    <Button variant="outline" onClick={handleExportExcel} className="w-full sm:w-auto">
                        <Sheet className="mr-2 h-4 w-4" />
                        Exportar a Excel
                    </Button>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative w-full sm:flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Filtrar por nombre..."
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        className="pl-10 w-full"
                    />
                </div>
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                    <SelectTrigger className="w-full sm:w-[220px]">
                        <SelectValue placeholder="Filtrar por curso" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los cursos</SelectItem>
                        {courses.map(course => (
                            <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <ScrollArea className="w-full whitespace-nowrap">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Grado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium truncate max-w-20">{student.id}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.grade}</TableCell>
                      <TableCell>
                          <Badge variant={student.status === 'active' ? 'default' : 'destructive'} 
                                 className={student.status === 'active' ? 'bg-green-500' : ''}>
                              {student.status === 'active' ? 'Activo' : 'Inactivo'}
                          </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEditForm(student)}>
                              <PenSquare className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                          </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
        <StudentFormDialog 
            isOpen={isFormOpen} 
            onClose={closeForm}
            onSubmit={handleUpdateStudent}
            student={editingStudent}
        />
    </div>
  );
}

function StudentFormDialog({ isOpen, onClose, onSubmit, student }: { isOpen: boolean, onClose: () => void, onSubmit: (student: Partial<Student> & { id: string }) => void, student: WithId<Student> | null }) {
    
    const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(student?.dateOfBirth);
    const [age, setAge] = useState<number | null>(null);

    useEffect(() => {
        setDateOfBirth(student?.dateOfBirth);
    }, [student]);

    useEffect(() => {
      if (dateOfBirth) {
        setAge(differenceInYears(new Date(), dateOfBirth));
      } else {
        setAge(null);
      }
    }, [dateOfBirth]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!student) return;

        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const grade = formData.get('grade') as string;
        const parentName = formData.get('parentName') as string;
        const birthCertificate = formData.get('birthCertificate') as string;
        const gender = formData.get('gender') as 'masculino' | 'femenino';
        
        onSubmit({ id: student.id, name, grade, parentName, birthCertificate, gender, dateOfBirth });
        onClose();
    }

    if(!isOpen || !student) return null;

    return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar estudiante</DialogTitle>
          <DialogDescription>
            Realice cambios en el perfil del estudiante aquí.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] -mx-6 px-6">
          <form onSubmit={handleSubmit} className="pr-1">
              <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                      <Label htmlFor="name">Nombre</Label>
                      <Input id="name" name="name" defaultValue={student?.name} required />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input id="email" name="email" type="email" defaultValue={student.email} required disabled />
                     <p className="text-xs text-muted-foreground">El correo electrónico no se puede cambiar.</p>
                </div>
                  <div className="space-y-2">
                      <Label htmlFor="grade">Grado</Label>
                      <Select name="grade" defaultValue={student?.grade} required>
                          <SelectTrigger>
                              <SelectValue placeholder="Seleccione un grado" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="Primer Grado">Primer Grado</SelectItem>
                              <SelectItem value="Segundo Grado">Segundo Grado</SelectItem>
                              <SelectItem value="Tercer Grado">Tercer Grado</SelectItem>
                              <SelectItem value="Cuarto Grado">Cuarto Grado</SelectItem>
                              <SelectItem value="Quinto Grado">Quinto Grado</SelectItem>
                              <SelectItem value="Sexto Grado">Sexto Grado</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor="parentName">Padre o encargado</Label>
                      <Input id="parentName" name="parentName" defaultValue={student?.parentName} />
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor="birthCertificate">CUI</Label>
                      <Input id="birthCertificate" name="birthCertificate" defaultValue={student?.birthCertificate} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="gender">Sexo</Label>
                      <Select name="gender" defaultValue={student?.gender} required>
                          <SelectTrigger id="gender">
                              <SelectValue placeholder="Seleccione el sexo" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="masculino">Masculino</SelectItem>
                              <SelectItem value="femenino">Femenino</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Fecha de nacimiento</Label>
                      <Popover>
                          <PopoverTrigger asChild>
                              <Button
                              variant={"outline"}
                              className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !dateOfBirth && "text-muted-foreground"
                              )}
                              >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateOfBirth ? format(dateOfBirth, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                              <CalendarUI
                              mode="single"
                              selected={dateOfBirth}
                              onSelect={setDateOfBirth}
                              initialFocus
                              locale={es}
                              captionLayout="dropdown-buttons"
                              fromYear={1990}
                              toYear={new Date().getFullYear()}
                              />
                          </PopoverContent>
                      </Popover>
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor="age">Edad</Label>
                      <Input id="age" value={age !== null ? `${age} años` : ''} readOnly disabled />
                  </div>
              </div>
              <DialogFooter className="mt-4 sticky bottom-0 bg-background py-4 -mx-6 px-6 border-t">
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button type="submit">Guardar cambios</Button>
              </DialogFooter>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
