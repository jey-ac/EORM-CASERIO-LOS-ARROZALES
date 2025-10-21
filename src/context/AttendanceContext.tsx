
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
import { DailyAttendance, User } from '@/lib/mock-data';

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
    
    const userProfileRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userProfile } = useDoc<User>(userProfileRef);

    const teacherAssignmentRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'teacherAssignments', user.uid);
    }, [firestore, user]);
    const { data: teacherAssignmentData } = useDoc<TeacherAssignment>(teacherAssignmentRef);

    const gradeAssignmentsCollection = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'gradeAssignments') : null, [firestore, user]);
    const { data: gradeAssignmentsData } = useCollection<GradeAssignment>(gradeAssignmentsCollection);

    const attendanceQuery = useMemoFirebase(() => {
        if (!user || !firestore || isUserLoading || !userProfile) return null;

        const baseCollection = collection(firestore, 'attendance');
        
        const isDirectorOrAdmin = userProfile.role === 'director' || userProfile.role === 'administrador';
        const isTeacher = userProfile.role === 'profesor';

        if (isDirectorOrAdmin) {
            // Director/Admin gets to see all attendance records.
            return baseCollection;
        }
        
        if (isTeacher && teacherAssignmentData && gradeAssignmentsData) {
            const assignedGrades = teacherAssignmentData?.gradeIds || [];
            if (assignedGrades.length === 0) return null;
            const courseIds = new Set<string>();
            gradeAssignmentsData.forEach(assignment => {
                if (assignedGrades.includes(assignment.id)) {
                    assignment.courseIds.forEach(courseId => courseIds.add(courseId));
                }
            });
            const teacherCourseIdList = Array.from(courseIds);
            if(teacherCourseIdList.length > 0) {
                // Firestore 'in' query is limited to 30 items. Be mindful if a teacher has many courses.
                return query(baseCollection, where('courseId', 'in', teacherCourseIdList));
            }
            return null; // Teacher has no courses assigned to their grades.
        }
        
        // Students don't query this collection directly.
        return null;

    }, [firestore, user, isUserLoading, userProfile, teacherAssignmentData, gradeAssignmentsData]);
    
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
