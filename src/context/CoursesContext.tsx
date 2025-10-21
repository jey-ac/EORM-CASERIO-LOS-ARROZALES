
'use client'

import React, { createContext, ReactNode } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { useFirestore, useCollection, WithId, useMemoFirebase, useUser } from '@/firebase';
import { Course } from '@/lib/mock-data';

interface CoursesContextType {
    courses: WithId<Course>[];
    addCourse: (newCourse: Omit<Course, 'id'>) => void;
    updateCourse: (updatedCourse: WithId<Course>) => void;
    deleteCourse: (courseId: string) => void;
    loading: boolean;
    error: Error | null;
}

export const CoursesContext = createContext<CoursesContextType>({
    courses: [],
    addCourse: () => {},
    updateCourse: () => {},
    deleteCourse: () => {},
    loading: true,
    error: null,
});

export const CoursesProvider = ({ children }: { children: ReactNode }) => {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    
    const coursesCollection = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'courses') : null, [firestore, user]);
    
    const { data: coursesData, isLoading: loading, error } = useCollection<Course>(
      coursesCollection,
      { enabled: !!user && !isUserLoading }
    );

    const courses = coursesData || [];

    const addCourse = async (courseData: Omit<Course, 'id'>) => {
      if (!firestore) return;
      try {
        await addDoc(collection(firestore, 'courses'), courseData);
      } catch (e) {
        console.error("Error adding course: ", e);
      }
    };

    const updateCourse = async (courseData: WithId<Course>) => {
      if (!firestore) return;
      try {
        const courseRef = doc(firestore, 'courses', courseData.id);
        await updateDoc(courseRef, { name: courseData.name });
      } catch (e) {
        console.error("Error updating course: ", e);
      }
    }

    const deleteCourse = async (courseId: string) => {
        if (!firestore) return;
        try {
            const courseRef = doc(firestore, 'courses', courseId);
            await deleteDoc(courseRef);
        } catch (e) {
            console.error("Error deleting course: ", e);
        }
    }

    const isLoading = loading || isUserLoading;

    return (
        <CoursesContext.Provider value={{ courses, addCourse, updateCourse, deleteCourse, loading: isLoading, error }}>
            {children}
        </CoursesContext.Provider>
    );
};
