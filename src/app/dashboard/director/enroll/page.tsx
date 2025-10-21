
'use client'

import { useContext, useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, User, FileText, GraduationCap, File, Sheet, Calendar as CalendarIcon, VenetianMask, Mail } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StudentsContext } from '@/context/StudentsContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
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


export default function EnrollPage() {
  const { students, addStudent } = useContext(StudentsContext);
  const { toast } = useToast();
  const [yearFilter, setYearFilter] = useState('2025');
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>();
  const [age, setAge] = useState<number | null>(null);

  useEffect(() => {
    if (dateOfBirth) {
      setAge(differenceInYears(new Date(), dateOfBirth));
    } else {
      setAge(null);
    }
  }, [dateOfBirth]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('studentName') as string;
    const email = formData.get('email') as string;
    const grade = formData.get('grade') as string;
    const parentName = formData.get('parentName') as string;
    const birthCertificate = formData.get('birthCertificate') as string;
    const enrollmentYear = parseInt(formData.get('enrollmentYear') as string, 10);
    const gender = formData.get('gender') as 'masculino' | 'femenino';

    if (name && email && grade && parentName && birthCertificate && enrollmentYear && gender && dateOfBirth) {
      try {
        addStudent({ name, email, grade, parentName, birthCertificate, enrollmentYear, gender, dateOfBirth });
        toast({
          title: 'Éxito',
          description: '¡Alumno inscrito exitosamente! El estudiante ahora debe ser activado en el portal del administrador.',
        });
        (e.target as HTMLFormElement).reset();
        setDateOfBirth(undefined);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo inscribir al alumno.',
        });
      }
    } else {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Por favor, complete todos los campos.',
        });
    }
  };
  
  const filteredStudents = useMemo(() => {
    return students.filter(student => student.enrollmentYear?.toString() === yearFilter);
  }, [students, yearFilter]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Reporte de estudiantes inscritos - ${yearFilter}`, 14, 16);
    doc.autoTable({
      startY: 20,
      head: [['Nombre', 'Grado', 'Sexo', 'Nacimiento', 'Edad', 'Encargado', 'CUI']],
      body: filteredStudents.map(student => [
        student.name, 
        student.grade, 
        student.gender || '',
        student.dateOfBirth ? format(student.dateOfBirth, 'dd/MM/yyyy') : '',
        student.dateOfBirth ? differenceInYears(new Date(), student.dateOfBirth) : '',
        student.parentName || '', 
        student.birthCertificate || ''
      ]),
    });
    doc.save(`reporte_inscritos_${yearFilter}.pdf`);
  };

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredStudents.map(student => ({
      'Nombre del alumno': student.name,
      'Grado': student.grade,
      'Sexo': student.gender,
      'Fecha de Nacimiento': student.dateOfBirth ? format(student.dateOfBirth, 'dd/MM/yyyy') : '',
      'Edad': student.dateOfBirth ? differenceInYears(new Date(), student.dateOfBirth) : '',
      'Nombre del padre/encargado': student.parentName || '',
      'CUI': student.birthCertificate || '',
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Inscritos ${yearFilter}`);
    XLSX.writeFile(workbook, `reporte_inscritos_${yearFilter}.xlsx`);
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
              <div>
                  <CardTitle>Inscribir nuevo alumno</CardTitle>
                  <CardDescription>
                    Complete el formulario para registrar a un nuevo alumno en la escuela.
                  </CardDescription>
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                <div className="space-y-2">
                <Label htmlFor="studentName">Nombre completo del alumno</Label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="studentName" name="studentName" placeholder="Ej: Juan José Pérez García" required className="pl-10" />
                </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input id="email" name="email" type="email" placeholder="ejemplo@correo.com" required className="pl-10" />
                  </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="grade">Grado a inscribir</Label>
                     <div className="relative">
                         <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Select name="grade" required>
                            <SelectTrigger id="grade" className="pl-10">
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
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="parentName">Nombre completo del padre o encargado</Label>
                   <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="parentName" name="parentName" placeholder="Ej: María López" required className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthCertificate">Código único de identificación (CUI)</Label>
                   <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="birthCertificate" name="birthCertificate" placeholder="Ej: 1234 56789 0101" required className="pl-10" />
                  </div>
                </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Sexo</Label>
                <div className="relative">
                  <VenetianMask className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Select name="gender" required>
                      <SelectTrigger id="gender" className="pl-10">
                          <SelectValue placeholder="Seleccione el sexo" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="femenino">Femenino</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Fecha de nacimiento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal pl-10 relative",
                        !dateOfBirth && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
                      fromYear={new Date().getFullYear() - 20}
                      toYear={new Date().getFullYear() - 5}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className='space-y-2'>
                    <Label htmlFor="age">Edad</Label>
                    <Input id="age" value={age !== null ? `${age} años` : ''} readOnly disabled />
                </div>
                <div className='space-y-2'>
                    <Label htmlFor="enrollmentYear">Año de inscripción</Label>
                    <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Select name="enrollmentYear" defaultValue="2025" required>
                            <SelectTrigger id="enrollmentYear" className="pl-10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2025">2025</SelectItem>
                                <SelectItem value="2026">2026</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              <UserPlus className="mr-2 h-4 w-4" />
              Inscribir alumno
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
                <div>
                    <CardTitle>Vista previa del reporte de inscritos</CardTitle>
                    <CardDescription>
                        Así se verán los datos al exportar el reporte para el año seleccionado.
                    </CardDescription>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full sm:w-auto">
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                        <SelectTrigger className="w-full sm:w-[120px]">
                            <SelectValue placeholder="Año" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2025">2025</SelectItem>
                            <SelectItem value="2026">2026</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex gap-2 w-full">
                        <Button variant="outline" onClick={handleExportPDF} className="flex-1">
                        <File className="mr-2 h-4 w-4" />
                        PDF
                        </Button>
                        <Button variant="outline" onClick={handleExportExcel} className="flex-1">
                        <Sheet className="mr-2 h-4 w-4" />
                        Excel
                        </Button>
                    </div>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full whitespace-nowrap">
              {filteredStudents.length > 0 ? (
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Nombre</TableHead>
                              <TableHead>Grado</TableHead>
                              <TableHead>Sexo</TableHead>
                              <TableHead>Nacimiento</TableHead>
                              <TableHead>Edad</TableHead>
                              <TableHead>Encargado</TableHead>
                              <TableHead>CUI</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {filteredStudents.map(student => (
                              <TableRow key={student.id}>
                                  <TableCell className="font-medium">{student.name}</TableCell>
                                  <TableCell>{student.grade}</TableCell>
                                  <TableCell className="capitalize">{student.gender || 'N/A'}</TableCell>
                                  <TableCell>{student.dateOfBirth ? format(student.dateOfBirth, "PPP", { locale: es }) : 'N/A'}</TableCell>
                                  <TableCell>{student.dateOfBirth ? `${differenceInYears(new Date(), student.dateOfBirth)} años` : 'N/A'}</TableCell>
                                  <TableCell>{student.parentName || 'N/A'}</TableCell>
                                  <TableCell>{student.birthCertificate || 'N/A'}</TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              ) : (
                  <p className="text-muted-foreground text-sm text-center py-4">No hay estudiantes inscritos para el año {yearFilter}.</p>
              )}
            </ScrollArea>
          </CardContent>
      </Card>
    </div>
  );
}

    