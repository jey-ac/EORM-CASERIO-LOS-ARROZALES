
'use client';

import { ReactNode } from 'react';
import { StudentsProvider } from './StudentsContext';
import { GradesProvider } from './GradesContext';
import { AttendanceProvider } from './AttendanceContext';
import { NotificationsProvider } from './NotificationsContext';
import { CalendarProvider } from './CalendarContext';
import { UsersProvider } from './UsersContext';
import { ConversationsProvider } from './ConversationsContext';
import { FirebaseClientProvider } from '@/firebase';
import { CoursesProvider } from './CoursesContext';
import { FirebaseMessagingProvider } from './FirebaseMessagingProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <FirebaseClientProvider>
      <FirebaseMessagingProvider>
        <UsersProvider>
          <StudentsProvider>
            <CoursesProvider>
              <GradesProvider>
                <AttendanceProvider>
                  <NotificationsProvider>
                    <CalendarProvider>
                      <ConversationsProvider>
                        {children}
                      </ConversationsProvider>
                    </CalendarProvider>
                  </NotificationsProvider>
                </AttendanceProvider>
              </GradesProvider>
            </CoursesProvider>
          </StudentsProvider>
        </UsersProvider>
      </FirebaseMessagingProvider>
    </FirebaseClientProvider>
  );
}
