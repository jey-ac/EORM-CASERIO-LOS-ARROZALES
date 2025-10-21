
'use client';

import React, { createContext, ReactNode } from 'react';
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  query,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from'firebase/auth';
import { useFirestore, useCollection, WithId, useMemoFirebase, useUser, useAuth, initializeFirebase } from '@/firebase';
import { User } from '@/lib/mock-data';
import { getApp, initializeApp, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

interface UsersContextType {
    users: WithId<User>[];
    addUser: (newUser: Omit<User, 'id' | 'status'>) => Promise<void>;
    updateUser: (updatedUser: Partial<User> & { id: string }) => Promise<void>;
    updateUserStatus: (userId: string, status: 'active' | 'inactive') => void;
    loading: boolean;
    error: Error | null;
}

export const UsersContext = createContext<UsersContextType>({
    users: [],
    addUser: async () => {},
    updateUser: async () => {},
    updateUserStatus: () => {},
    loading: true,
    error: null,
});

export const UsersProvider = ({ children }: { children: ReactNode }) => {
    const firestore = useFirestore();
    const mainAuth = useAuth(); // The admin's auth instance
    const { user: currentUser, isUserLoading } = useUser();
    
    const usersCollectionQuery = useMemoFirebase(() => {
      if (!currentUser || !firestore) return null;
      return query(collection(firestore, 'users'));
    }, [firestore, currentUser]);
    
    const { data: usersData, isLoading, error } = useCollection<User>(
      usersCollectionQuery,
      { enabled: !!currentUser && !isUserLoading }
    );

    const users = usersData || [];

    const addUser = async (userData: Omit<User, 'id' | 'status'>) => {
      if (!firestore || !mainAuth || !userData.password || !userData.email) {
        throw new Error("Missing required data (email, password) or Firebase services not ready.");
      }

      // Use a unique name for the temporary app to avoid conflicts
      const tempAppName = `auth-worker-${Date.now()}`;
      const tempApp = initializeApp(firebaseConfig, tempAppName);
      const tempAuth = getAuth(tempApp);

      try {
        // Create the user in the temporary auth instance
        const userCredential = await createUserWithEmailAndPassword(tempAuth, userData.email, userData.password);
        const authUser = userCredential.user;
        
        const userPayload: Omit<User, 'id'> = {
          name: userData.name,
          email: userData.email,
          role: userData.role,
          status: 'active',
          password: userData.password, 
          createdAt: serverTimestamp(),
        };

        // Use the Authentication UID as the document ID in Firestore.
        await setDoc(doc(firestore, 'users', authUser.uid), userPayload);
        
        // The new user is signed in only in the temporary instance.
        // The main session (admin) is unaffected.

      } catch (e: any) {
        console.error("Error adding user in temporary auth instance: ", e);
        if (e.code === 'auth/email-already-in-use') {
            throw new Error('Este correo electrónico ya está en uso por otra cuenta.');
        }
        if (e.code === 'auth/weak-password') {
            throw new Error('La contraseña debe tener al menos 6 caracteres.');
        }
        throw new Error('No se pudo crear el usuario. ' + e.message);
      } finally {
        // Clean up the temporary app instance to prevent memory leaks and clear the temporary session
        await deleteApp(tempApp);
      }
    };

    const updateUser = async (updatedUserData: Partial<User> & { id: string }) => {
       if (!firestore) throw new Error("Firebase services not initialized.");
       
        const { id, password, email, ...dataToUpdate } = updatedUserData;
        
        if (Object.keys(dataToUpdate).length > 0) {
            const userDocRef = doc(firestore, 'users', id);
            try {
                await updateDoc(userDocRef, dataToUpdate);
            } catch (error) {
                 console.error("Error updating user document in Firestore:", error);
                 throw new Error("Failed to update user data in Firestore.");
            }
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
