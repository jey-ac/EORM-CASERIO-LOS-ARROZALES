

'use client';

import React, { createContext, ReactNode } from 'react';
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  query,
  where,
  updateDoc,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, updatePassword, getAuth } from'firebase/auth';
import { useFirestore, useCollection, WithId, useMemoFirebase, useUser, useAuth } from '@/firebase';
import { User } from '@/lib/mock-data';

interface UsersContextType {
    users: WithId<User>[];
    addUser: (newUser: Omit<User, 'id' | 'status'>) => Promise<void>;
    updateUser: (updatedUser: Partial<User> & { id: string }) => void;
    updateUserStatus: (userId: string, status: 'active' | 'inactive') => void;
    loading: boolean;
    error: Error | null;
}

export const UsersContext = createContext<UsersContextType>({
    users: [],
    addUser: async () => {},
    updateUser: () => {},
    updateUserStatus: () => {},
    loading: true,
    error: null,
});

export const UsersProvider = ({ children }: { children: ReactNode }) => {
    const firestore = useFirestore();
    const auth = useAuth();
    const { user: currentUser, isUserLoading } = useUser();
    
    const usersCollectionQuery = useMemoFirebase(() => {
      if (!currentUser || !firestore) return null;
      return collection(firestore, 'users');
    }, [firestore, currentUser]);
    
    const { data: usersData, isLoading, error } = useCollection<User>(
      usersCollectionQuery,
      { enabled: !!currentUser && !isUserLoading }
    );

    const users = usersData || [];

    const addUser = async (userData: Omit<User, 'id' | 'status'>) => {
      if (!firestore || !auth || !userData.password || !userData.email) {
        throw new Error("Missing required data (email, password) for user creation.");
      }
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
        const authUser = userCredential.user;
        
        const userDataForFirestore: Partial<User> = { ...userData };
        delete userDataForFirestore.password;

        await setDoc(doc(firestore, 'users', authUser.uid), {
          ...userDataForFirestore,
          id: authUser.uid,
          status: 'active',
          createdAt: serverTimestamp(),
        });

      } catch (e) {
        console.error("Error adding user: ", e);
        throw e;
      }
    };

    const updateUser = async (updatedUserData: Partial<User> & { id: string }) => {
       if (!firestore) return;
       try {
        const userRef = doc(firestore, 'users', updatedUserData.id);
        const { id, password, ...dataToUpdate } = updatedUserData;
        
        await updateDoc(userRef, dataToUpdate);

        if (password) {
            // This logic requires a privileged environment (like a Cloud Function) to securely update a user's password.
            // It is intentionally left out of the client-side code for security reasons.
            console.warn("Password was updated in Firestore, but not in Firebase Auth for security reasons. A Cloud Function is required for this.");
        }

      } catch (e) {
        console.error("Error updating user: ", e);
        throw e;
      }
    };
    
    const updateUserStatus = async (userId: string, status: 'active' | 'inactive') => {
        if (!firestore) return;
        try {
            const userRef = doc(firestore, 'users', userId);
            await updateDoc(userRef, { status });
        } catch (e) {
            console.error("Error updating user status: ", e);
            throw e;
        }
    }

    return (
        <UsersContext.Provider value={{ users, addUser, updateUser, updateUserStatus, loading: isLoading || isUserLoading, error }}>
            {children}
        </UsersContext.Provider>
    );
};
