
'use client';

import { useState, useContext, useMemo } from 'react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { allGrades } from '@/lib/mock-data';
import { PenSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { CoursesContext } from '@/context/CoursesContext';
import { useFirestore, useCollection, WithId, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';

type GradeAssignment = {
  id?: string;
  courseIds: string[];
}

export default function DirectorGradesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const gradeAssignmentsCollection = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'gradeAssignments') : null, [firestore, user]);
  const { data: assignmentsData, isLoading } = useCollection<GradeAssignment>(gradeAssignmentsCollection);

  const assignments: Record<string, string[]> = useMemo(() => {
    if (!assignmentsData) return {};
    return assignmentsData.reduce((acc, item) => {
      acc[item.id] = item.courseIds;
      return acc;
    }, {} as Record<string, string[]>);
  }, [assignmentsData]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const { toast } = useToast();

  const openAssignmentForm = (grade: string) => {
    setSelectedGrade(grade);
    setIsFormOpen(true);
  };

  const closeAssignmentForm = () => {
    setSelectedGrade(null);
    setIsFormOpen(false);
  };

  const handleUpdateAssignments = async (gradeName: string, courseIds: string[]) => {
    if (!firestore) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo conectar a la base de datos."
        });
        return;
    }
    try {
      const gradeDocRef = doc(firestore, 'gradeAssignments', gradeName);
      await setDoc(gradeDocRef, { courseIds });
      toast({
        title: 'Éxito',
        description: `Cursos para ${gradeName} actualizados.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar la asignación de cursos.',
      });
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestionar grados</CardTitle>
          <CardDescription>Asigna cursos a cada grado académico.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full whitespace-nowrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grado</TableHead>
                  <TableHead>Cursos asignados</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allGrades.map(grade => (
                  <TableRow key={grade}>
                    <TableCell className="font-medium">{grade}</TableCell>
                    <TableCell>
                      {isLoading ? (
                           <Badge variant="secondary">Cargando...</Badge>
                      ) : (
                          <Badge variant="secondary">{(assignments[grade] || []).length} cursos</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openAssignmentForm(grade)}>
                        <PenSquare className="mr-2 h-4 w-4" />
                        Gestionar cursos
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {selectedGrade && (
        <AssignmentForm
          isOpen={isFormOpen}
          onClose={closeAssignmentForm}
          grade={selectedGrade}
          assignments={assignments[selectedGrade] || []}
          onSave={handleUpdateAssignments}
        />
      )}
    </div>
  );
}

function AssignmentForm({
  isOpen,
  onClose,
  grade,
  assignments,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  grade: string;
  assignments: string[];
  onSave: (gradeName: string, courseIds: string[]) => void;
}) {
  const { courses: mockCourses, loading } = useContext(CoursesContext);
  const [selectedCourses, setSelectedCourses] = useState(assignments);

  const handleCheckboxChange = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleSaveChanges = () => {
    onSave(grade, selectedCourses);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar cursos a {grade}</DialogTitle>
          <DialogDescription>
            Seleccione los cursos que se impartirán en este grado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Cursos disponibles</Label>
            <ScrollArea className="space-y-2 rounded-md border p-4 max-h-60">
                {loading ? <p className="text-sm text-muted-foreground text-center py-2">Cargando cursos...</p> 
                : mockCourses.length > 0 ? (
                    mockCourses.map(course => (
                        <div key={course.id} className="flex items-center space-x-2 py-1">
                            <Checkbox
                                id={`course-${course.id}`}
                                checked={selectedCourses.includes(course.id)}
                                onCheckedChange={() => handleCheckboxChange(course.id)}
                            />
                            <Label htmlFor={`course-${course.id}`} className="font-normal">
                                {course.name}
                            </Label>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">No hay cursos creados.</p>
                )}
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSaveChanges}>
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
