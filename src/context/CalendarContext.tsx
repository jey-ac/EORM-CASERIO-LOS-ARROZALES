
'use client';

import React, { createContext, ReactNode } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { useFirestore, useCollection, WithId, useMemoFirebase, useUser } from '@/firebase';
import { CalendarEvent, Notification } from '@/lib/mock-data';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// We need to adjust the CalendarEvent type for Firestore, which uses Timestamp
type FirestoreCalendarEvent = Omit<CalendarEvent, 'id' | 'date'> & {
  date: Timestamp;
  createdAt: any;
};

// The type we'll use in the UI, converting Timestamp back to Date
type UICalendarEvent = CalendarEvent;


interface CalendarContextType {
    events: WithId<UICalendarEvent>[];
    addEvent: (newEvent: Omit<CalendarEvent, 'id'>, senderId: string) => void;
    updateEvent: (updatedEvent: WithId<CalendarEvent>) => void;
    deleteEvent: (eventId: string) => void;
    loading: boolean;
    error: Error | null;
}

export const CalendarContext = createContext<CalendarContextType>({
    events: [],
    addEvent: () => {},
    updateEvent: () => {},
    deleteEvent: () => {},
    loading: true,
    error: null,
});

export const CalendarProvider = ({ children }: { children: ReactNode }) => {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    
    const eventsCollection = useMemoFirebase(() => user && firestore ? collection(firestore, 'events') : null, [firestore, user]);
    
    // Fetch data from Firestore. It will be of type FirestoreCalendarEvent
    const { data: firestoreEvents, isLoading: loading, error } = useCollection<FirestoreCalendarEvent>(
      eventsCollection,
      { enabled: !!user && !isUserLoading }
    );

    // Convert Firestore Timestamps to JS Date objects for the UI
    const events: WithId<UICalendarEvent>[] = (firestoreEvents || []).map(event => ({
      ...event,
      date: event.date.toDate(),
    })).sort((a,b) => a.date.getTime() - b.date.getTime());


    const addEvent = async (newEventData: Omit<CalendarEvent, 'id'>, senderId: string) => {
        if (!firestore || !user) return;
        const { date, ...restOfData } = newEventData;
        const newEventForFirestore: Omit<FirestoreCalendarEvent, 'id'> = {
            ...restOfData,
            date: Timestamp.fromDate(date),
            createdAt: serverTimestamp(),
        };
        
        try {
            // Add the event to the 'events' collection
            await addDoc(collection(firestore, 'events'), newEventForFirestore);
            
            // Also create a notification in the 'notifications' collection to trigger a push
            const notificationForAll: Omit<Notification, 'id'> = {
                title: `Nuevo Evento: ${newEventData.title}`,
                description: `Se ha agregado un nuevo evento para el ${format(newEventData.date, "PPP", { locale: es })}.`,
                senderId: senderId,
                recipient: {
                    type: 'all',
                    id: 'all',
                },
                date: new Date().toISOString(),
                createdAt: serverTimestamp(),
            };
            await addDoc(collection(firestore, 'notifications'), notificationForAll);

        } catch (e) {
            console.error("Error adding event and/or notification: ", e);
            throw e;
        }
    };

    const updateEvent = async (updatedEvent: WithId<CalendarEvent>) => {
        if (!firestore) return;
        const { id, date, ...restOfData } = updatedEvent;
        const eventRef = doc(firestore, 'events', id);
        try {
            await updateDoc(eventRef, {
                ...restOfData,
                date: Timestamp.fromDate(date),
            });
        } catch(e) {
            console.error("Error updating event: ", e);
            throw e;
        }
    };

    const deleteEvent = async (eventId: string) => {
        if (!firestore) return;
        const eventRef = doc(firestore, 'events', eventId);
        try {
            await deleteDoc(eventRef);
        } catch (e) {
            console.error("Error deleting event: ", e);
            throw e;
        }
    };

    const isLoading = loading || isUserLoading;

    return (
        <CalendarContext.Provider value={{ events, addEvent, updateEvent, deleteEvent, loading: isLoading, error }}>
            {children}
        </CalendarContext.Provider>
    );
};
