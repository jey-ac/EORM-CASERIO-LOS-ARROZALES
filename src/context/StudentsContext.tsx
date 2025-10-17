
'use client'

import React, { createContext, ReactNode } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
  setDoc,
  deleteDoc,
  Timestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useFirestore, useCollection, WithId, useMemoFirebase, useUser, useAuth } from '@/firebase';
import { Student } from '@/lib/mock-data';

type NewStudentData = Omit<Student, 'id' | 'status' | 'email' | 'password' | 'role'>;
interface StudentsContextType {
    students: WithId<Student>[];
    addStudent: (newStudent: NewStudentData) => Promise<string | undefined>;
    updateStudent: (updatedStudent: Partial<Student> & { id: string }) => void;
    activateStudentAuth: (studentId: string) => Promise<void>;
    updateStudentStatus: (studentId: string, status: 'active' | 'inactive') => void;
    loading: boolean;
    error: Error | null;
}

export const StudentsContext = createContext<StudentsContextType>({
    students: [],
    addStudent: async () => undefined,
    updateStudent: () => {},
    activateStudentAuth: async () => {},
    updateStudentStatus: () => {},
    loading: true,
    error: null,
});

export const StudentsProvider = ({ children }: { children: ReactNode }) => {
    const firestore = useFirestore();
    const auth = useAuth();
    const { user, isUserLoading } = useUser();
    
    const studentsCollection = useMemoFirebase(() => (user && firestore) ? collection(firestore, 'students') : null, [firestore, user]);
    
    const { data: studentsData, isLoading: loading, error } = useCollection<Student>(
      studentsCollection,
      { enabled: !!user && !isUserLoading }
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
        
        const timestamp = Date.now();
        const nameParts = newStudentData.name.toLowerCase().split(' ').filter(Boolean);
        const email = `${nameParts[0] || 'student'}.${nameParts[1] ? nameParts[1].charAt(0) : ''}${timestamp.toString().slice(-4)}@email.com`;
        const password = Math.random().toString(36).slice(-8);

        try {
            const newStudent: Omit<Student, 'id'> = {
                ...newStudentData,
                role: 'estudiante',
                status: 'inactive', // Always start as inactive
                email: email,
                password: password,
                createdAt: serverTimestamp(),
                dateOfBirth: newStudentData.dateOfBirth ? Timestamp.fromDate(newStudentData.dateOfBirth) as any : undefined,
            };

            // Just add the document to the collection. Auth creation is handled separately.
            const docRef = await addDoc(collection(firestore, 'students'), newStudent);
            return docRef.id;

        } catch (e: any) {
            console.error("Error adding student document: ", e);
            throw e;
        }
    };
    
    const activateStudentAuth = async (studentId: string) => {
        if (!firestore || !auth) throw new Error("Firestore or Auth not initialized.");

        const studentRef = doc(firestore, 'students', studentId);
        const studentDoc = await getDoc(studentRef);

        if (!studentDoc.exists()) throw new Error("Student not found");
        
        const studentData = studentDoc.data() as Student;

        if (!studentData.email || !studentData.password) {
            throw new Error("Student data is missing email or password.");
        }

        try {
             // Check if an auth user already exists for this email
            const q = query(collection(firestore, 'users'), where('email', '==', studentData.email));
            const existingUserSnapshot = await getDocs(q);
             if (!existingUserSnapshot.empty) {
                console.log("User already has an auth account. Just activating.");
                await updateDoc(studentRef, { status: 'active' });
                return;
            }

            // Create the auth user
            const userCredential = await createUserWithEmailAndPassword(auth, studentData.email, studentData.password);
            const authUser = userCredential.user;

            // The document already exists, so just update its status to active
            await updateDoc(studentRef, { 
                status: 'active',
                id: authUser.uid // Overwrite the temporary ID with the real auth UID
            });
            
            // This part is tricky. If we change the document ID, we need to move the data.
            // A better approach is to use the UID as ID from the start. Let's adjust addStudent.
            // For now, let's just update the status. The ID mismatch is a deeper issue.
            
            const oldId = studentId;
            const newId = authUser.uid;

            if (oldId !== newId) {
                // Move data to new document with auth UID as ID
                const newStudentRef = doc(firestore, 'students', newId);
                await setDoc(newStudentRef, { ...studentData, status: 'active', id: newId });
                
                // Delete the old document
                await deleteDoc(studentRef);
            } else {
                 await updateDoc(studentRef, { status: 'active' });
            }

        } catch(error: any) {
            console.error("Error activating student auth account:", error);
            if (error.code === 'auth/email-already-in-use') {
                // This can happen if an auth user was created but the Firestore transaction failed before.
                // We should try to link it. For now, we just update status.
                 await updateDoc(studentRef, { status: 'active' });
                 console.warn("Auth user already existed. The student has been set to active. Please verify data consistency.")
            } else {
                throw error;
            }
        }
    }

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
        if (!firestore) throw new Error("Firestore not initialized");

        if (status === 'active') {
            await activateStudentAuth(studentId);
        } else {
            // Deactivating is simple: just update the status field.
            const studentRef = doc(firestore, 'students', studentId);
            try {
                await updateDoc(studentRef, { status: 'inactive' });
            } catch (error) {
                console.error("Error deactivating student:", error);
                throw error;
            }
        }
    }


    const isLoading = loading || isUserLoading;

    return (
        <StudentsContext.Provider value={{ students, addStudent, updateStudent, activateStudentAuth, updateStudentStatus, loading: isLoading, error }}>
            {children}
        </StudentsContext.Provider>
    );
};
