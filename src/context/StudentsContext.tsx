
'use client'

import React, { createContext, ReactNode } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useFirestore, useCollection, WithId, useMemoFirebase, useUser, useAuth } from '@/firebase';
import { Student } from '@/lib/mock-data';
import { getApp, initializeApp, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';


type NewStudentData = Omit<Student, 'id' | 'status' | 'password' | 'role' | 'authUid'> & {
    email: string;
};

interface StudentsContextType {
    students: WithId<Student>[];
    addStudent: (newStudent: NewStudentData) => Promise<string | undefined>;
    updateStudent: (updatedStudent: Partial<Student> & { id: string }) => void;
    updateStudentStatus: (studentId: string, status: 'active' | 'inactive') => Promise<void>;
    loading: boolean;
    error: Error | null;
}

export const StudentsContext = createContext<StudentsContextType>({
    students: [],
    addStudent: async () => undefined,
    updateStudent: () => {},
    updateStudentStatus: async () => {},
    loading: true,
    error: null,
});

export const StudentsProvider = ({ children }: { children: ReactNode }) => {
    const firestore = useFirestore();
    const mainAuth = useAuth(); // The admin's auth instance
    const { user: currentUser, isUserLoading } = useUser();
    
    const studentsCollection = useMemoFirebase(() => (currentUser && firestore) ? collection(firestore, 'students') : null, [firestore, currentUser]);
    
    const { data: studentsData, isLoading: loading, error } = useCollection<Student>(
      studentsCollection,
      { enabled: !!currentUser && !isUserLoading }
    );

    const students: WithId<Student>[] = React.useMemo(() => {
        if (!studentsData) return [];
        return studentsData.map(student => {
            const studentWithId = { ...student };
            if (studentWithId.dateOfBirth && typeof (studentWithId.dateOfBirth as any)?.toDate === 'function') {
                studentWithId.dateOfBirth = (studentWithId.dateOfBirth as Timestamp).toDate();
            } else if (typeof studentWithId.dateOfBirth === 'string') {
                studentWithId.dateOfBirth = new Date(studentWithId.dateOfBirth);
            }
            return studentWithId;
        });
    }, [studentsData]);


    const addStudent = async (newStudentData: NewStudentData): Promise<string | undefined> => {
        if (!firestore) {
            throw new Error("Firestore is not initialized.");
        }
        
        const password = Math.random().toString(36).slice(-8);

        try {
            const newStudent: Omit<Student, 'id' | 'authUid'> = {
                ...newStudentData,
                role: 'estudiante',
                status: 'inactive', 
                password: password,
                createdAt: serverTimestamp(),
                dateOfBirth: newStudentData.dateOfBirth ? Timestamp.fromDate(newStudentData.dateOfBirth) as any : undefined,
            };

            const docRef = await addDoc(collection(firestore, 'students'), newStudent);
            return docRef.id;

        } catch (e: any) {
            console.error("Error adding student: ", e);
            throw e;
        }
    };
    
    const updateStudent = async (updatedStudentData: Partial<Student> & { id: string }) => {
        if (!firestore) return;
        try {
            const studentRef = doc(firestore, 'students', updatedStudentData.id);
            
            const { id, ...dataToUpdate } = updatedStudentData;

            const updatePayload: any = { ...dataToUpdate };
            if (dataToUpdate.dateOfBirth && !(dataToUpdate.dateOfBirth instanceof Timestamp)) {
                updatePayload.dateOfBirth = Timestamp.fromDate(dataToUpdate.dateOfBirth);
            }
            
            await updateDoc(studentRef, updatePayload);

        } catch (e) {
            console.error("Error updating student: ", e);
            throw(e)
        }
    };

    const updateStudentStatus = async (studentId: string, status: 'active' | 'inactive') => {
        if (!firestore || !mainAuth) {
            throw new Error("Firebase services not initialized.");
        }

        const studentRef = doc(firestore, 'students', studentId);

        if (status === 'inactive') {
            await updateDoc(studentRef, { status: 'inactive' });
            // Here you might want to disable the user in Firebase Auth as well,
            // but that requires an admin SDK, so we'll just update the status in Firestore.
            return;
        }
        
        // --- Activation logic ---
        const studentDoc = await getDoc(studentRef);
        if (!studentDoc.exists()) {
            throw new Error("Student document not found.");
        }
        const studentData = studentDoc.data() as Student;

        if (studentData.authUid && studentData.status === 'inactive') {
            await updateDoc(studentRef, { status: 'active' });
            console.log("Student auth account already exists. Just reactivating.");
            return;
        }

        if (!studentData.email || !studentData.password) {
            throw new Error("El estudiante no tiene un correo electrónico o contraseña para activar la cuenta.");
        }

        // Initialize a temporary secondary Firebase app.
        const tempAppName = `auth-worker-student-${Date.now()}`;
        const tempApp = initializeApp(firebaseConfig, tempAppName);
        const tempAuth = getAuth(tempApp);

        try {
            // Create user in the temporary auth instance. This will not affect the admin's session.
            const userCredential = await createUserWithEmailAndPassword(tempAuth, studentData.email, studentData.password);
            const authUid = userCredential.user.uid;

            // Now, update the student document with the new authUid and set status to active.
            await updateDoc(studentRef, {
                status: 'active',
                authUid: authUid,
            });

        } catch (error: any) {
            console.error("Error during student activation in temporary auth instance:", error);
            if (error.code === 'auth/email-already-in-use') {
                // If email is in use, try to find the user and link them if they don't have an `authUid`
                // This is complex and for now, we'll just report the error.
                throw new Error('Este correo electrónico ya está en uso por otra cuenta.');
            }
            throw new Error('No se pudo activar al estudiante. ' + error.message);
        } finally {
            // IMPORTANT: Clean up the temporary app to avoid memory leaks and clear its session.
            await deleteApp(tempApp);
        }
    }


    const isLoading = loading || isUserLoading;

    return (
        <StudentsContext.Provider value={{ students, addStudent, updateStudent, updateStudentStatus, loading: isLoading, error }}>
            {children}
        </StudentsContext.Provider>
    );
};
