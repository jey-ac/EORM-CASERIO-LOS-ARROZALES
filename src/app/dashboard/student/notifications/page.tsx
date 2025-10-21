
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
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { collection, query, where, getDocs, or, Timestamp } from 'firebase/firestore';
import { Notification } from '@/lib/mock-data';
import { StudentsContext } from '@/context/StudentsContext';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function StudentNotificationsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { students } = useContext(StudentsContext);
  const { grades } = useContext(GradesContext);
  const [relevantNotifications, setRelevantNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const student = useMemo(() => {
    if (!user || !students) return null;
    return students.find(s => s.authUid === user.uid || s.id === user.uid);
  }, [students, user]);
  
  const studentCourseIds = useMemo(() => {
    if (!student) return [];
    return grades.filter(g => g.studentId === student.id).map(g => g.courseId);
  }, [student, grades]);


  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoading(true);
      if (!user || !firestore || !student) {
        setIsLoading(false);
        return;
      }
      
      try {
        const notificationsRef = collection(firestore, 'notifications');
        const conditions = [];

        // Condition 1: Notifications for 'all'
        conditions.push(where('recipient.type', '==', 'all'));
        
        // Condition 2: Notifications for the specific user
        conditions.push(where('recipient.id', '==', user.uid));

        // Condition 3: Notifications for the courses the student is in
        // Firestore 'in' query supports up to 30 elements.
        if (studentCourseIds.length > 0) {
          conditions.push(where('recipient.id', 'in', studentCourseIds));
        }
        
        const q = query(notificationsRef, or(...conditions));
        
        const querySnapshot = await getDocs(q);
        const fetched: any[] = [];
        querySnapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() });
        });
        
        const sorted = fetched.sort((a, b) => {
            const timeA = (a.createdAt as Timestamp)?.toDate?.().getTime() || 0;
            const timeB = (b.createdAt as Timestamp)?.toDate?.().getTime() || 0;
            return timeB - timeA;
        });

        setRelevantNotifications(sorted);

      } catch (error) {
        console.error("STUDENT NOTIFICATIONS: Error fetching from Firestore:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (student) { // Only fetch if we have identified the student
        fetchNotifications();
    }
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
          <ScrollArea className="h-[calc(100vh-12rem)] pr-4">
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
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
