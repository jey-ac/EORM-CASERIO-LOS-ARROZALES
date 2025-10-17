
'use client';

import { useContext, useMemo, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { GradesContext } from '@/context/GradesContext';
import { useUser, useFirestore } from '@/firebase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { collection, query, where, getDocs, or, Timestamp } from 'firebase/firestore';
import { Notification } from '@/lib/mock-data';
import { StudentsContext } from '@/context/StudentsContext';

export default function StudentNotificationsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { students } = useContext(StudentsContext);
  const { grades } = useContext(GradesContext);
  const [relevantNotifications, setRelevantNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const student = useMemo(() => students.find(s => s.id === user?.uid), [students, user]);
  const studentCourseIds = useMemo(() => {
    if (!student) return [];
    return grades.filter(g => g.studentId === student.id).map(g => g.courseId);
  }, [student, grades]);


  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoading(true);
      console.log('STUDENT NOTIFICATIONS: Fetching...');
      if (!user || !firestore || !student) {
        console.log('STUDENT NOTIFICATIONS: User, firestore, or student profile not ready. Aborting.');
        setIsLoading(false);
        return;
      }

      console.log('STUDENT NOTIFICATIONS: User ID:', user.uid);
      console.log('STUDENT NOTIFICATIONS: Student Course IDs:', studentCourseIds);

      try {
        const notificationsRef = collection(firestore, 'notifications');
        // A simplified, robust query to get all potentially relevant notifications.
        const q = query(notificationsRef, where('recipient.type', 'in', ['all', 'course', 'user']));
        
        const querySnapshot = await getDocs(q);
        const fetched: any[] = [];
        querySnapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() });
        });
        
        console.log('STUDENT NOTIFICATIONS: Fetched', fetched.length, 'potentially relevant notifications.');

        // Filter on the client side for maximum safety
        const filtered = fetched.filter(notification => {
          const recipient = notification.recipient;
          if (!recipient) return false;
          
          if (recipient.type === 'all') return true;
          if (recipient.type === 'user' && recipient.id === user.uid) return true;
          if (recipient.type === 'course' && studentCourseIds.includes(recipient.id)) return true;
          
          return false;
        });
        
        console.log('STUDENT NOTIFICATIONS: Filtered down to', filtered.length, 'notifications for this student.');

        const sorted = filtered.sort((a, b) => {
            const timeA = (a.createdAt as Timestamp)?.toDate?.().getTime() || 0;
            const timeB = (b.createdAt as Timestamp)?.toDate?.().getTime() || 0;
            return timeB - timeA;
        });

        setRelevantNotifications(sorted);

      } catch (error) {
        console.error("STUDENT NOTIFICATIONS: Error fetching from Firestore:", error);
      } finally {
        setIsLoading(false);
        console.log('STUDENT NOTIFICATIONS: Fetch complete.');
      }
    };

    // We depend on `student` being available, which means student context has loaded.
    fetchNotifications();
  }, [user, firestore, student, studentCourseIds]);


  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Notificaciones</CardTitle>
          <CardDescription>
            Revisa todas las actualizaciones y mensajes de la escuela.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {isLoading ? (
              <li className="text-center text-muted-foreground p-4">Cargando notificaciones...</li>
            ) : relevantNotifications.length > 0 ? (
              relevantNotifications.map((notification) => (
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
              ))
            ) : (
              <li className="text-center text-muted-foreground p-4">No tienes notificaciones.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
