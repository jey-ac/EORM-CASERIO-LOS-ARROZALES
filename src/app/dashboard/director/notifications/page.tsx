
'use client';

import React, { useContext, useState, useMemo } from 'react';
import { Bell } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NotificationsContext } from '@/context/NotificationsContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { UsersContext } from '@/context/UsersContext';
import { CoursesContext } from '@/context/CoursesContext';
import { useUser } from '@/firebase';
import { collection, getDocs, where, query } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function DirectorNotificationsPage() {
  const { addNotification } = useContext(NotificationsContext);
  const { users } = useContext(UsersContext);
  const { courses } = useContext(CoursesContext);
  const { user } = useUser();
  const firestore = useFirestore();
  const [sentNotifications, setSentNotifications] = useState<any[]>([]);
  const [recipientType, setRecipientType] = useState<'all' | 'course' | 'teacher'>('all');
  const [recipientId, setRecipientId] = useState('all');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();

  const mockTeachers = useMemo(() => users.filter(u => u.role === 'profesor'), [users]);

    // Effect to fetch sent notifications
  React.useEffect(() => {
    const fetchSentNotifications = async () => {
      if (!firestore) return;
      // This is a simplified fetch. In a real app, you might want to pagination.
      const q = query(collection(firestore, 'notifications'));
      const querySnapshot = await getDocs(q);
      const fetched: any[] = [];
      querySnapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() });
      });
      setSentNotifications(fetched.sort((a,b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0)));
    };

    fetchSentNotifications();
  }, [firestore, addNotification]); // Refetch when a new notification is added.


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !user) {
      toast({
        variant: 'destructive',
        title: 'Campos incompletos',
        description: 'Por favor, complete el título y el mensaje.',
      });
      return;
    }
    
    if (recipientType !== 'all' && !recipientId) {
       toast({
        variant: 'destructive',
        title: 'Campos incompletos',
        description: 'Por favor, seleccione un destinatario específico.',
      });
      return;
    }

    try {
      addNotification({
        title,
        description,
        senderId: user.uid,
        recipient: {
          type: recipientType,
          id: recipientType === 'all' ? 'all' : recipientId,
        },
        date: new Date().toISOString(),
      });

      setTitle('');
      setDescription('');
      setRecipientType('all');
      setRecipientId('all');
      toast({
        title: 'Éxito',
        description: '¡Notificación enviada exitosamente!',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo enviar la notificación.',
      });
    }
  };

  const handleRecipientTypeChange = (type: 'all' | 'course' | 'teacher') => {
      setRecipientType(type);
      setRecipientId(type === 'all' ? 'all' : '');
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Historial de notificaciones</CardTitle>
          <CardDescription>
            Revisa todos los mensajes que se han enviado a los estudiantes y padres.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[70vh] pr-4">
            <ul className="space-y-4">
              {sentNotifications.map((notification) => (
                <li key={notification.id} className="flex items-start gap-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
                  <div className="mt-1 rounded-full bg-primary p-2 text-primary-foreground">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {notification.description}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {`enviado ${format(new Date(notification.date), "PPP 'a las' p", { locale: es })}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 h-fit">
        <CardHeader>
          <CardTitle>Enviar notificación</CardTitle>
          <CardDescription>
            Transmitir un mensaje a estudiantes, padres o profesores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
             <div className="space-y-2">
              <Label>Destinatario</Label>
              <RadioGroup value={recipientType} onValueChange={handleRecipientTypeChange} className="flex flex-wrap gap-x-4 gap-y-2">
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="font-normal">Todos</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="course" id="course" />
                    <Label htmlFor="course" className="font-normal">Curso</Label>
                </div>
                 <div className="flex items-center space-x-2">
                    <RadioGroupItem value="teacher" id="teacher" />
                    <Label htmlFor="teacher" className="font-normal">Profesor</Label>
                </div>
              </RadioGroup>
            </div>
            
            {recipientType === 'course' && (
                <div className="space-y-2">
                <Label htmlFor="course-select">Curso</Label>
                <Select value={recipientId} onValueChange={setRecipientId} required>
                    <SelectTrigger id="course-select">
                        <SelectValue placeholder="Seleccione un curso" />
                    </SelectTrigger>
                    <SelectContent>
                        {courses.map(course => (
                            <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                </div>
            )}

            {recipientType === 'teacher' && (
                <div className="space-y-2">
                <Label htmlFor="teacher-select">Profesor</Label>
                <Select value={recipientId} onValueChange={setRecipientId} required>
                    <SelectTrigger id="teacher-select">
                        <SelectValue placeholder="Seleccione un profesor" />
                    </SelectTrigger>
                    <SelectContent>
                        {mockTeachers.map(teacher => (
                            <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" placeholder="Ej: Calificaciones publicadas" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Mensaje</Label>
              <Textarea
                id="message"
                placeholder="Escribe tu mensaje aquí."
                className="min-h-[120px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              <Bell className="mr-2 h-4 w-4" />
              Enviar notificación
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
