
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';

// This function initializes all Firebase services.
// It ensures that services are created only once.
export function initializeFirebase(): { firebaseApp: FirebaseApp; auth: Auth; firestore: Firestore; functions: Functions; } {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const functions = getFunctions(app);
  
  return { firebaseApp: app, auth, firestore, functions };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
// The non-blocking files are no longer needed with the Cloud Function approach for user creation
// export * from './non-blocking-updates';
// export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
