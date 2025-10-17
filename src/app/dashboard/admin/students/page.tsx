
'use client';

import { useContext, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StudentsContext } from '@/context/StudentsContext';
import { Student } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { PenSquare } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { WithId } from '@/firebase';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AdminStudentsPage() {
  const { students, updateStudent, updateStudentStatus } = useContext(StudentsContext);
  const [editingStudent, setEditingStudent] = useState<WithId<Student> | null>(null);
  const { toast } = useToast();

  const handleStatusChange = async (studentId: string, newStatus: 'active' | 'inactive') => {
    try {
      await updateStudentStatus(studentId, newStatus);
      toast({
        title: 'Éxito',
        description: 'El estado del estudiante ha sido actualizado.',
      });
    } catch (error: any) {
      console.error(error);
      let description = 'No se pudo actualizar el estado del estudiante.';
      if (error.code === 'auth/email-already-in-use') {
        description = 'Este correo electrónico ya está en uso por otra cuenta de autenticación.';
      }
      toast({
        variant: 'destructive',
        title: 'Error',
        description: description,
      });
    }
  };
  
  const handleUpdateStudent = (student: WithId<Student>) => {
    try {
      updateStudent(student);
      setEditingStudent(null);
      toast({
        title: 'Éxito',
        description: 'La información del estudiante ha sido actualizada.',
      });
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar la información del estudiante.',
      });
    }
  };

  const closeForm = () => {
    setEditingStudent(null);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Activar y gestionar estudiantes</CardTitle>
          <CardDescription>
            Active, desactive y edite la información de la cuenta de los estudiantes inscritos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre del estudiante</TableHead>
                  <TableHead>Grado</TableHead>
                  <TableHead>Correo generado</TableHead>
                  <TableHead>Contraseña</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right min-w-[280px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student: WithId<Student>) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.grade}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.password}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={student.status === 'active' ? 'default' : 'secondary'}
                      className={student.status === 'active' ? 'bg-green-500' : ''}>
                        {student.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className='flex items-center justify-end gap-2'>
                          <Button variant="ghost" size="icon" onClick={() => setEditingStudent(student)}>
                              <PenSquare className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                          </Button>
                          <Select
                              value={student.status}
                              onValueChange={(newStatus: 'active' | 'inactive') => handleStatusChange(student.id, newStatus)}
                          >
                              <SelectTrigger className="w-full sm:w-[120px]">
                                  <SelectValue placeholder="Cambiar estado" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="active">Activo</SelectItem>
                                  <SelectItem value="inactive">Inactivo</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <StudentFormDialog
        student={editingStudent}
        isOpen={!!editingStudent}
        onClose={closeForm}
        onSubmit={handleUpdateStudent}
      />
    </>
  );
}

function StudentFormDialog({ isOpen, onClose, onSubmit, student }: { isOpen: boolean, onClose: () => void, onSubmit: (student: WithId<Student>) => void, student: WithId<Student> | null }) {
    
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if(!student) return;

        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        
        const updatedStudent: WithId<Student> = {
            ...student,
            name: name || student.name,
            email: email || student.email,
        };

        if (password) {
            updatedStudent.password = password;
        }
        
        onSubmit(updatedStudent);
    }

    if(!isOpen || !student) return null;

    return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar estudiante</DialogTitle>
          <DialogDescription>
            Realice cambios en la información de la cuenta del estudiante <span className="font-semibold">{student.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input id="name" name="name" defaultValue={student.name} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input id="email" name="email" type="email" defaultValue={student.email} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="current-password">Contraseña actual</Label>
                    <Input id="current-password" name="current-password" type="text" defaultValue={student.password} readOnly disabled />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">Nueva contraseña (opcional)</Label>
                    <Input id="password" name="password" type="password" placeholder="Dejar en blanco para no cambiar" />
                </div>
                <div className="space-y-2">
                    <Label>Grado</Label>
                    <Input defaultValue={student.grade} disabled />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button type="submit">Guardar cambios</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
