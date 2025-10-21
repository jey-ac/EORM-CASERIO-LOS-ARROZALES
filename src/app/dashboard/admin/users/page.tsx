
'use client';

import { useState, useContext, useMemo } from 'react';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User } from '@/lib/mock-data';
import { PlusCircle, PenSquare, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { UsersContext } from '@/context/UsersContext';
import { useToast } from '@/hooks/use-toast';
import { WithId } from '@/firebase';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AdminUsersPage() {
  const { users, addUser, updateUser, updateUserStatus } = useContext(UsersContext);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<WithId<User> | null>(null);
  const { toast } = useToast();

  const displayedUsers = useMemo(() => {
    return users.filter(u => u.role === 'profesor' || u.role === 'director');
  }, [users]);

  const handleAddUser = async (user: Omit<User, 'id' | 'status'>) => {
    if(!user.password) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'La contraseña es obligatoria para crear un usuario.',
        });
        return;
    }
    try {
      await addUser({ name: user.name, email: user.email, password: user.password, role: user.role });
      toast({
        title: 'Éxito',
        description: 'Usuario creado exitosamente.',
      });
      closeForm();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al crear usuario',
        description: error.message || 'No se pudo crear el usuario.',
      });
    }
  };

  const handleUpdateUser = async (updatedUser: Partial<User> & { id: string }) => {
    try {
      await updateUser(updatedUser);
      toast({
        title: 'Éxito',
        description: 'Usuario actualizado exitosamente.',
      });
      closeForm();
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error al actualizar',
        description: error.message || 'No se pudo actualizar el usuario.',
      });
    }
  }

  const handleStatusChange = (userId: string, newStatus: 'active' | 'inactive') => {
     try {
      updateUserStatus(userId, newStatus);
      toast({
        title: 'Éxito',
        description: 'El estado del usuario ha sido actualizado.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo actualizar el estado del usuario.',
      });
    }
  };

  const openEditForm = (user: WithId<User>) => {
    setEditingUser(user);
    setIsFormOpen(true);
  }

  const openCreateForm = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  }

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingUser(null);
  }


  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Gestionar usuarios</CardTitle>
              <CardDescription>Crear, editar y cambiar el estado de cuentas para directores y profesores.</CardDescription>
            </div>
            <Button onClick={openCreateForm} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear usuario
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full whitespace-nowrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo electrónico</TableHead>
                  <TableHead>Contraseña</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right min-w-[200px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.password}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'active' ? 'default' : 'destructive'} 
                            className={user.status === 'active' ? 'bg-green-500' : ''}>
                        {user.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditForm(user)}>
                          <PenSquare className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Select
                            value={user.status}
                            onValueChange={(newStatus: 'active' | 'inactive') => handleStatusChange(user.id, newStatus)}
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
          </ScrollArea>
        </CardContent>
      </Card>
      <UserFormDialog
        isOpen={isFormOpen}
        onClose={closeForm}
        onSubmit={editingUser ? handleUpdateUser : handleAddUser}
        user={editingUser}
      />
    </>
  );
}

function UserFormDialog({ isOpen, onClose, onSubmit, user }: { isOpen: boolean, onClose: () => void, onSubmit: (user: any) => Promise<void>, user: WithId<User> | null }) {
  const [showPassword, setShowPassword] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as 'director' | 'profesor';
    
    if (user) { // Editing existing user
        const updatedUser: Partial<User> & { id: string } = {
            id: user.id,
            name: name || user.name,
            role: role || user.role,
        };
        // Password editing is not handled in this flow for simplicity
        await onSubmit(updatedUser);

    } else { // Creating new user
        if (name && email && password && role) {
          await onSubmit({ name, email, password, role });
        }
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? 'Editar usuario' : 'Crear nuevo usuario'}</DialogTitle>
          <DialogDescription>
            {user ? 'Realice cambios en la cuenta aquí.' : 'Complete los detalles para crear una nueva cuenta.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo</Label>
              <Input id="name" name="name" defaultValue={user?.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" name="email" type="email" defaultValue={user?.email} required disabled={!!user} />
               {user && <p className="text-xs text-muted-foreground">El correo electrónico no se puede cambiar.</p>}
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="password">{user ? 'Nueva contraseña (no se puede cambiar aquí)' : 'Contraseña'}</Label>
                <div className="relative">
                    <Input id="password" name="password" type={showPassword ? 'text' : 'password'} required={!user} disabled={!!user} />
                    {!user && (
                      <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(prev => !prev)}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          <span className="sr-only">Toggle password visibility</span>
                      </Button>
                    )}
                </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select name="role" defaultValue={user?.role} required>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Seleccione un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="director">Director</SelectItem>
                  <SelectItem value="profesor">Profesor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Guardar cambios</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
