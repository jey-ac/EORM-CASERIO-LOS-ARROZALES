

'use client';

import React, { createContext, ReactNode } from 'react';
import {
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useFirestore, useCollection, WithId, useMemoFirebase, useUser } from '@/firebase';
import { Notification } from '@/lib/mock-data';

interface NotificationsContextType {
    notifications: WithId<Notification>[];
    addNotification: (newNotification: Omit<Notification, 'id'>) => void;
    loading: boolean;
    error: Error | null;
}

export const NotificationsContext = createContext<NotificationsContextType>({
    notifications: [],
    addNotification: () => {},
    loading: true,
    error: null,
});

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    
    const notificationsCollection = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return collection(firestore, `notifications`);
    }, [firestore, user]);

    const { data: notificationsData, isLoading: loading, error } = useCollection<Notification>(
      notificationsCollection,
      { enabled: !!user && !isUserLoading }
    );

    // Sort notifications by date, newest first, with a fallback for null timestamps
    const notifications = (notificationsData || []).sort((a, b) => {
        const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
        const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
    });

    const addNotification = async (newNotificationData: Omit<Notification, 'id'>) => {
        if (!firestore) {
            console.error("Firestore not available");
            return;
        }
        try {
            await addDoc(collection(firestore, 'notifications'), {
                ...newNotificationData,
                createdAt: serverTimestamp(),
            });
        } catch (e) {
            console.error("Error adding notification to Firestore: ", e);
            throw e; // Re-throw to be caught by the calling component
        }
    };

    const isLoading = loading || isUserLoading;

    return (
        <NotificationsContext.Provider value={{ notifications, addNotification, loading: isLoading, error }}>
            {children}
        </NotificationsContext.Provider>
    );
};
