
'use client'

import { useContext, useState, useMemo } from 'react';
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
import { Grade, BimesterGrade, calculateBimesterScore, getAverage } from '@/lib/mock-data';
import { ArrowLeft, ClipboardCheck, PenSquare } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { GradesContext } from '@/context/GradesContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useUser, WithId, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { CoursesContext } from '@/context/CoursesContext';
import { StudentsContext } from '@/context/StudentsContext';
import { UsersContext } from '@/context/UsersContext';
import { collection, doc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

type GradeWithStudentInfo = Grade & {
    studentName?: string;
    average: number;
}

type GradeAssignment = {
  courseIds: string[];
}

type TeacherAssignment = {
  gradeIds: string[];
}

const emptyBimester: BimesterGrade = { actividades: 0, parcial: 0, examen: 0 };

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const { courses } = useContext(CoursesContext);
  const { students } = useContext(StudentsContext);
  const { users } = useContext(UsersContext);
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedYear, setSelectedYear] = useState('2025');

  const course = courses.find(c => c.id === courseId);
  const teacher = users.find(u => u.id === user?.uid);

  const gradeAssignmentsCollection = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'gradeAssignments') : null, [firestore, user]);
  const { data: gradeAssignmentsData } = useCollection<GradeAssignment>(gradeAssignmentsCollection);

  const teacherAssignmentRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'teacherAssignments', user.uid);
  }, [firestore, user]);
  const { data: teacherAssignmentData } = useDoc<TeacherAssignment>(teacherAssignmentRef);

  const studentsInCourse = useMemo(() => {
    if (!courseId || !gradeAssignmentsData || !teacherAssignmentData) return [];

    const gradesForThisCourse = gradeAssignmentsData
      .filter(ga => ga.courseIds.includes(courseId))
      .map(ga => ga.id);
    
    const teacherGrades = teacherAssignmentData.gradeIds || [];

    const relevantGradesForTeacher = gradesForThisCourse.filter(g => teacherGrades.includes(g));

    return students.filter(student => relevantGradesForTeacher.includes(student.grade));
  }, [courseId, students, gradeAssignmentsData, teacherAssignmentData]);


  const { grades, updateGrade } = useContext(GradesContext);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeWithStudentInfo | null>(null);
  const { toast } = useToast();

  if (!course) {
    // This can happen on first load, but shouldn't be permanent
    return <div>Cargando detalles del curso...</div>;
  }
  
  const combinedData: GradeWithStudentInfo[] = useMemo(() => {
    return studentsInCourse.map(student => {
      const gradeData = grades.find(g => g.studentId === student.id && g.courseId === courseId && g.year && g.year.toString() === selectedYear);
      
      const emptyGrade: Omit<Grade, 'id'> = {
        studentId: student.id,
        courseId: courseId,
        year: parseInt(selectedYear),
        bimestre1: emptyBimester,
        bimestre2: emptyBimester,
        bimestre3: emptyBimester,
        bimestre4: emptyBimester,
      };

      const gradeDetails = gradeData || emptyGrade;
      const average = getAverage(gradeDetails);

      return {
        id: gradeData?.id || `${student.id}_${courseId}_${selectedYear}`, // Create a stable key
        studentId: student.id,
        courseId: courseId,
        year: parseInt(selectedYear),
        studentName: student.name,
        average,
        bimestre1: gradeDetails.bimestre1,
        bimestre2: gradeDetails.bimestre2,
        bimestre3: gradeDetails.bimestre3,
        bimestre4: gradeDetails.bimestre4,
      };
    });
  }, [studentsInCourse, grades, courseId, selectedYear]);

  const handleOpenForm = (grade: GradeWithStudentInfo) => {
    setEditingGrade(grade);
    setIsFormOpen(true);
  }

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingGrade(null);
  }

  const handleUpdateGrade = (updatedGrade: WithId<Grade>) => {
    try {
        updateGrade(updatedGrade);
        handleCloseForm();
        toast({
            title: 'Éxito',
            description: 'Calificaciones guardadas exitosamente.',
        });
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudieron guardar las calificaciones.',
        });
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/dashboard/teacher/courses">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Atrás</span>
                </Link>
            </Button>
            <div>
                <h1 className="text-2xl font-bold">{course.name}</h1>
                <p className="text-muted-foreground">Impartido por {teacher?.name}</p>
            </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
            </Select>
            <Button asChild className='w-full sm:w-auto'>
                <Link href={`/dashboard/teacher/students?courseId=${course.id}`}>
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Tomar asistencia
                </Link>
            </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Estudiantes matriculados</CardTitle>
          <CardDescription>Ver y editar el rendimiento de los estudiantes para el año {selectedYear}.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full whitespace-nowrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead className="text-center">Prom.</TableHead>
                  <TableHead className="text-center">Bim. 1</TableHead>
                  <TableHead className="text-center">Bim. 2</TableHead>
                  <TableHead className="text-center">Bim. 3</TableHead>
                  <TableHead className="text-center">Bim. 4</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combinedData.map((data) => (
                  <TableRow key={data.studentId}>
                    <TableCell className="font-medium">{data.studentName}</TableCell>
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
                    <TableCell className="text-right">
                      <Dialog open={isFormOpen && editingGrade?.studentId === data.studentId} onOpenChange={(isOpen) => !isOpen && handleCloseForm()}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenForm(data)}>
                              <PenSquare className="h-4 w-4" />
                              <span className="sr-only">Editar calificación</span>
                          </Button>
                        </DialogTrigger>
                        {editingGrade && (
                          <GradeFormDialog
                              onSubmit={handleUpdateGrade}
                              grade={editingGrade}
                              onClose={handleCloseForm}
                          />
                        )}
                      </Dialog>
                    </TableCell>
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


function GradeFormDialog({ onClose, onSubmit, grade }: { onClose: () => void, onSubmit: (grade: Grade) => void, grade: GradeWithStudentInfo }) {
    
    const [bimestre1, setBimestre1] = useState(grade.bimestre1);
    const [bimestre2, setBimestre2] = useState(grade.bimestre2);
    const [bimestre3, setBimestre3] = useState(grade.bimestre3);
    const [bimestre4, setBimestre4] = useState(grade.bimestre4);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        const updatedGrade: Grade = {
            id: grade.id,
            studentId: grade.studentId,
            courseId: grade.courseId,
            year: grade.year,
            bimestre1,
            bimestre2,
            bimestre3,
            bimestre4,
        };
        onSubmit(updatedGrade);
    }
    
    return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Editar calificaciones para {grade.year}</DialogTitle>
        <DialogDescription>
          Modificar las notas para el estudiante <span className="font-semibold">{grade.studentName}</span>.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
          <Tabs defaultValue="bimestre1" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="bimestre1">Bimestre 1</TabsTrigger>
                <TabsTrigger value="bimestre2">Bimestre 2</TabsTrigger>
                <TabsTrigger value="bimestre3">Bimestre 3</TabsTrigger>
                <TabsTrigger value="bimestre4">Bimestre 4</TabsTrigger>
            </TabsList>
            <BimesterFormTab value="bimestre1" bimesterGrade={bimestre1} setBimesterGrade={setBimestre1} />
            <BimesterFormTab value="bimestre2" bimesterGrade={bimestre2} setBimesterGrade={setBimestre2} />
            <BimesterFormTab value="bimestre3" bimesterGrade={bimestre3} setBimesterGrade={setBimestre3} />
            <BimesterFormTab value="bimestre4" bimesterGrade={bimestre4} setBimesterGrade={setBimestre4} />
          </Tabs>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Guardar cambios</Button>
          </DialogFooter>
      </form>
    </DialogContent>
  )
}

function BimesterFormTab({ value, bimesterGrade, setBimesterGrade }: { value: string, bimesterGrade: BimesterGrade, setBimesterGrade: (grade: BimesterGrade) => void }) {
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value: inputValue } = e.target;
        // Parse the value, if it's empty or not a number, default to 0
        const numericValue = parseInt(inputValue, 10);
        setBimesterGrade({ ...bimesterGrade, [name]: isNaN(numericValue) ? 0 : numericValue });
    }
    
    return (
        <TabsContent value={value}>
            <div className="grid gap-4 py-4 sm:grid-cols-3">
                <div className="space-y-2">
                    <Label htmlFor={`${value}-actividades`}>Actividades (70pts)</Label>
                    <Input id={`${value}-actividades`} name="actividades" type="text" pattern="\d*" value={bimesterGrade.actividades} onChange={handleChange} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor={`${value}-parcial`}>Parcial (10pts)</Label>
                    <Input id={`${value}-parcial`} name="parcial" type="text" pattern="\d*" value={bimesterGrade.parcial} onChange={handleChange} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor={`${value}-examen`}>Examen (20pts)</Label>
                    <Input id={`${value}-examen`} name="examen" type="text" pattern="\d*" value={bimesterGrade.examen} onChange={handleChange} />
                </div>
            </div>
        </TabsContent>
    )
}
