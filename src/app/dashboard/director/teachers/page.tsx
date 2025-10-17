
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
import { Teacher, allGrades } from '@/lib/mock-data';
import { PenSquare, PlusCircle, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UsersContext } from '@/context/UsersContext';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, WithId, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';


type TeacherAssignment = {
  gradeIds: string[];
}

export default function DirectorTeachersPage() {
  const { users } = useContext(UsersContext);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const mockTeachers = useMemo(() => users.filter(u => u.role === 'profesor') as WithId<Teacher>[], [users]);
  
  const assignmentsCollection = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'teacherAssignments') : null, [firestore, user]);
  const { data: assignmentsData, isLoading } = useCollection<TeacherAssignment>(assignmentsCollection);
  
  const assignments: Record<string, string[]> = useMemo(() => {
    if (!assignmentsData) return {};
    return assignmentsData.reduce((acc, item) => {
      acc[item.id] = item.gradeIds;
      return acc;
    }, {} as Record<string, string[]>);
  }, [assignmentsData]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<WithId<Teacher> | null>(null);

  const openAssignmentForm = (teacher: WithId<Teacher>) => {
    setSelectedTeacher(teacher);
    setIsFormOpen(true);
  };

  const closeAssignmentForm = () => {
    setSelectedTeacher(null);
    setIsFormOpen(false);
  };

  const handleUpdateAssignments = async (teacherId: string, gradeIds: string[]) => {
    if (!firestore) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo conectar a la base de datos."
        });
        return;
    }
    try {
      const assignmentRef = doc(firestore, 'teacherAssignments', teacherId);
      await setDoc(assignmentRef, { gradeIds });
      toast({
        title: 'Éxito',
        description: 'Las asignaciones del profesor han sido guardadas.',
      });
      closeAssignmentForm();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron guardar las asignaciones.',
      });
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestionar profesores</CardTitle>
          <CardDescription>Asigna grados a los profesores y gestiona sus responsabilidades.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full whitespace-nowrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profesor</TableHead>
                  <TableHead>Grados asignados</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTeachers.map(teacher => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">{teacher.name}</TableCell>
                    <TableCell>
                      {isLoading ? (
                        <Badge variant="secondary">Cargando...</Badge>
                      ) : (
                        <Badge variant="secondary">{(assignments[teacher.id] || []).length} grados</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openAssignmentForm(teacher)}>
                        <PenSquare className="mr-2 h-4 w-4" />
                        Gestionar asignaciones
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {selectedTeacher && (
        <AssignmentForm
          isOpen={isFormOpen}
          onClose={closeAssignmentForm}
          teacher={selectedTeacher}
          assignments={assignments[selectedTeacher.id] || []}
          allAssignments={assignments}
          onSave={handleUpdateAssignments}
        />
      )}
    </div>
  );
}

function AssignmentForm({
  isOpen,
  onClose,
  teacher,
  assignments,
  allAssignments,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher;
  assignments: string[];
  allAssignments: Record<string, string[]>;
  onSave: (teacherId: string, gradeIds: string[]) => void;
}) {
  const [currentAssignments, setCurrentAssignments] = useState(assignments);
  const [selectedGrade, setSelectedGrade] = useState('');

  const handleAddGrade = () => {
    if (selectedGrade && !currentAssignments.includes(selectedGrade)) {
      setCurrentAssignments(prev => [...prev, selectedGrade]);
      setSelectedGrade('');
    }
  };

  const handleRemoveGrade = (gradeName: string) => {
    setCurrentAssignments(prev => prev.filter(name => name !== gradeName));
  };

  const handleSaveChanges = () => {
    onSave(teacher.id, currentAssignments);
  };
  
  const assignedGradesInSchool = useMemo(() => {
    return Object.entries(allAssignments).reduce<string[]>((acc, [teacherId, grades]) => {
      // Exclude grades assigned to the current teacher being edited
      if (teacherId !== teacher.id) {
        acc.push(...grades);
      }
      return acc;
    }, []);
  }, [allAssignments, teacher.id]);

  const availableGrades = allGrades.filter(grade => !assignedGradesInSchool.includes(grade) || currentAssignments.includes(grade));


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar grados</DialogTitle>
          <DialogDescription>
            Gestionar los grados para el profesor <span className="font-semibold">{teacher.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Añadir nuevo grado</Label>
            <div className="flex gap-2">
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar un grado" />
                </SelectTrigger>
                <SelectContent>
                  {availableGrades.filter(g => !currentAssignments.includes(g)).map(grade => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddGrade} disabled={!selectedGrade}>
                <PlusCircle className="h-4 w-4" />
                <span className="sr-only">Añadir</span>
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Grados asignados</Label>
            <div className="space-y-2 rounded-md border p-2 min-h-[6rem]">
                {currentAssignments.length > 0 ? (
                    currentAssignments.map(grade => (
                        <div key={grade} className="flex items-center justify-between">
                            <span>{grade}</span>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveGrade(grade)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <span className="sr-only">Eliminar</span>
                            </Button>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">No hay grados asignados.</p>
                )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={handleSaveChanges}>
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
