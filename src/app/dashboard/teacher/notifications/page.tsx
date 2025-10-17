
'use client';

import { useMemo, useContext, useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { UsersContext } from '@/context/UsersContext';
import { CoursesContext } from '@/context/CoursesContext';
import { collection, getDocs, query, or, where, Timestamp, doc } from 'firebase/firestore';

type GradeAssignment = {
  courseIds: string[];
}

type TeacherAssignment = {
  gradeIds: string[];
}

export default function NotificationsPage() {
    const { addNotification } = useContext(NotificationsContext);
    const { users } = useContext(UsersContext);
    const { courses } = useContext(CoursesContext);
    const { user } = useUser();
    const firestore = useFirestore();
    const [relevantNotifications, setRelevantNotifications] = useState<any[]>([]);
    
    const [courseId, setCourseId] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const { toast } = useToast();

    const gradeAssignmentsCollection = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'gradeAssignments') : null, [firestore, user]);
    const { data: assignmentsData, isLoading: assignmentsLoading } = useCollection<GradeAssignment>(gradeAssignmentsCollection);

    const teacherAssignmentRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'teacherAssignments', user.uid);
    }, [firestore, user]);
    const { data: teacherAssignmentData, isLoading: teacherAssignmentLoading } = useDoc<TeacherAssignment>(teacherAssignmentRef);

    const teacherCourses = useMemo(() => {
        if (!teacherAssignmentData || !assignmentsData || !courses) return [];
        
        const assignedGrades = teacherAssignmentData.gradeIds || [];
        const courseIds = new Set<string>();
        
        assignmentsData.forEach(assignment => {
            if (assignedGrades.includes(assignment.id)) {
                assignment.courseIds.forEach(id => courseIds.add(id));
            }
        });

        return courses.filter(course => courseIds.has(course.id));
    }, [teacherAssignmentData, assignmentsData, courses]);

    useEffect(() => {
      const fetchNotifications = async () => {
        // Wait until we have all required data
        if (!user || !firestore || assignmentsLoading || teacherAssignmentLoading) {
            return;
        }

        // Now `teacherCourses` is guaranteed to be stable and calculated
        const teacherCourseIds = teacherCourses.map(c => c.id);
        const notificationsRef = collection(firestore, 'notifications');
        
        const conditions = [
          where('recipient.type', '==', 'all'),
          where('recipient.id', '==', user.uid)
        ];

        // IMPORTANT: Only add the 'in' query if the array is not empty.
        if (teacherCourseIds.length > 0) {
          conditions.push(where('recipient.id', 'in', teacherCourseIds));
        }
        
        const q = query(notificationsRef, or(...conditions));

        try {
            const querySnapshot = await getDocs(q);
            const fetched: any[] = [];
            querySnapshot.forEach((doc) => {
                fetched.push({ id: doc.id, ...doc.data() });
            });
            setRelevantNotifications(fetched.sort((a,b) => {
                const timeA = (a.createdAt as Timestamp)?.toDate()?.getTime() || 0;
                const timeB = (b.createdAt as Timestamp)?.toDate()?.getTime() || 0;
                return timeB - timeA;
            }));
        } catch (error) {
            console.error("Error fetching notifications for teacher:", error);
        }
      }

      fetchNotifications();
    }, [user, firestore, teacherCourses, assignmentsLoading, teacherAssignmentLoading, addNotification]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description || !courseId || !user) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Por favor, complete todos los campos.',
            });
            return;
        }

        try {
            addNotification({
                title,
                description,
                senderId: user.uid,
                recipient: { type: 'course', id: courseId },
                date: new Date().toISOString(),
            });

            setTitle('');
            setDescription('');
            setCourseId('');
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
    
    const getSenderRole = (senderId: string) => {
        const user = users.find(u => u.id === senderId);
        return user?.role;
    }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Historial de notificaciones</CardTitle>
          <CardDescription>
            Revisa los mensajes que has enviado y los anuncios del director.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {relevantNotifications.map((notification) => {
              const senderRole = getSenderRole(notification.senderId);
              return (
              <li key={notification.id} className="flex items-start gap-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
                <div className={cn(
                    "mt-1 rounded-full p-2 text-primary-foreground",
                    senderRole === 'director' ? 'bg-secondary text-secondary-foreground' : 'bg-primary'
                )}>
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
            )})}
          </ul>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 h-fit">
        <CardHeader>
          <CardTitle>Enviar notificación</CardTitle>
          <CardDescription>
            Transmitir un mensaje a todos los estudiantes y padres de un curso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                  <Label htmlFor="course">Curso</Label>
                  <Select value={courseId} onValueChange={setCourseId} required>
                      <SelectTrigger id="course">
                          <SelectValue placeholder="Seleccione un curso" />
                      </SelectTrigger>
                      <SelectContent>
                          {teacherCourses.map(course => (
                              <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" placeholder="Ej: Recordatorio de examen" value={title} onChange={(e) => setTitle(e.target.value)} required />
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
