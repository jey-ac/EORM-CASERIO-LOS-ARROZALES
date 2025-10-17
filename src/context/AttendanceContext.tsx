
'use client'

import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  doc,
} from 'firebase/firestore';
import { useFirestore, useCollection, WithId, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { DailyAttendance } from '@/lib/mock-data';

interface AttendanceContextType {
    dailyAttendances: WithId<DailyAttendance>[];
    saveAttendance: (newAttendance: DailyAttendance) => void;
    loading: boolean;
    error: Error | null;
}

type GradeAssignment = {
  courseIds: string[];
}

type TeacherAssignment = {
  gradeIds: string[];
}

export const AttendanceContext = createContext<AttendanceContextType>({
    dailyAttendances: [],
    saveAttendance: () => {},
    loading: true,
    error: null,
});

export const AttendanceProvider = ({ children }: { children: ReactNode }) => {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    
    const teacherAssignmentRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'teacherAssignments', user.uid);
    }, [firestore, user]);
    const { data: teacherAssignmentData } = useDoc<TeacherAssignment>(teacherAssignmentRef);

    const gradeAssignmentsCollection = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'gradeAssignments') : null, [firestore, user]);
    const { data: gradeAssignmentsData } = useCollection<GradeAssignment>(gradeAssignmentsCollection);

    const attendanceQuery = useMemoFirebase(() => {
        if (!user || !firestore || isUserLoading || !gradeAssignmentsData) return null;

        const baseCollection = collection(firestore, 'attendance');
        
        // Assuming there is a user role property available, e.g. in a user profile context
        const isTeacher = !!teacherAssignmentData; // Simplified check
        const isStudent = !isTeacher; // Simplified assumption

        if (isTeacher) {
            const assignedGrades = teacherAssignmentData?.gradeIds || [];
            if (assignedGrades.length === 0) return null; // No grades assigned, no query needed
            const courseIds = new Set<string>();
            gradeAssignmentsData.forEach(assignment => {
                if (assignedGrades.includes(assignment.id)) {
                    assignment.courseIds.forEach(courseId => courseIds.add(courseId));
                }
            });
            const teacherCourseIdList = Array.from(courseIds);
            if(teacherCourseIdList.length > 0) {
                return query(baseCollection, where('courseId', 'in', teacherCourseIdList));
            }
            return null; // No courses for this teacher's grades
        }
        
        if (isStudent) {
            // This would require knowing the student's courses to be effective.
            // For now, let's assume students don't query the entire attendance collection directly.
            // A better pattern would be a subcollection or a more specific query based on student profile.
            // Returning null to avoid an inefficient/insecure query.
            return null;
        }

        // For director/admin, fetch all. Relies on security rules.
        return baseCollection;

    }, [firestore, user, isUserLoading, teacherAssignmentData, gradeAssignmentsData]);
    
    const { data: attendanceData, isLoading: loading, error } = useCollection<DailyAttendance>(
      attendanceQuery,
      { enabled: !!user && !isUserLoading && !!attendanceQuery }
    );

    const dailyAttendances = attendanceData || [];

    const saveAttendance = async (newAttendance: DailyAttendance) => {
        if (!firestore) return;
        const collectionRef = collection(firestore, 'attendance');
        try {
            const q = query(
                collectionRef,
                where('courseId', '==', newAttendance.courseId),
                where('date', '==', newAttendance.date)
            );

            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // Update existing record
                const docRef = querySnapshot.docs[0].ref;
                await updateDoc(docRef, { records: newAttendance.records });
            } else {
                // Add new record
                await addDoc(collectionRef, newAttendance);
            }
        } catch (e) {
            console.error("Error saving attendance: ", e);
            throw e;
        }
    };

    const isLoading = loading || isUserLoading;

    return (
        <AttendanceContext.Provider value={{ dailyAttendances, saveAttendance, loading: isLoading, error }}>
            {children}
        </AttendanceContext.Provider>
    );
};
