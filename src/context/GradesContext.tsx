
'use client'

import React, { createContext, ReactNode } from 'react';
import { collection, doc, updateDoc, where, query, getDocs, setDoc, addDoc } from 'firebase/firestore';
import { useFirestore, useCollection, WithId, useMemoFirebase, useUser } from '@/firebase';
import { Grade } from '@/lib/mock-data';


interface GradesContextType {
    grades: WithId<Grade>[];
    updateGrade: (updatedGrade: Grade) => void;
    loading: boolean;
    error: Error | null;
}

export const GradesContext = createContext<GradesContextType>({
    grades: [],
    updateGrade: () => {},
    loading: true,
    error: null,
});

export const GradesProvider = ({ children }: { children: ReactNode }) => {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    
    const gradesCollection = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'grades') : null, [firestore, user]);
    
    const { data: gradesData, isLoading: loading, error } = useCollection<Grade>(
      gradesCollection,
      { enabled: !!user && !isUserLoading }
    );

    const grades = gradesData || [];

    const updateGrade = async (updatedGrade: Grade) => {
        if (!firestore) return;
        const collectionRef = collection(firestore, 'grades');
        try {
            const q = query(
                collectionRef,
                where('studentId', '==', updatedGrade.studentId),
                where('courseId', '==', updatedGrade.courseId),
                where('year', '==', updatedGrade.year)
            );
            
            const querySnapshot = await getDocs(q);
            
            const { id, ...dataToSave } = updatedGrade; 

            if (querySnapshot.empty) {
                // Document doesn't exist, so create it.
                await addDoc(collectionRef, {...dataToSave});
            } else {
                // Document exists, update it.
                const gradeDocRef = querySnapshot.docs[0].ref;
                await updateDoc(gradeDocRef, dataToSave);
            }

        } catch (e) {
            console.error("Error saving grade: ", e);
            throw e;
        }
    };

    const isLoading = loading || isUserLoading;

    return (
        <GradesContext.Provider value={{ grades, updateGrade, loading: isLoading, error }}>
            {children}
        </GradesContext.Provider>
    );
};

    