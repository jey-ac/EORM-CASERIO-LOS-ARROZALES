
'use client';

import * as React from 'react';
import type { ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

// Initialize services immediately at the module level.
// This ensures they are singletons and ready to be used.
const services = initializeFirebase();

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // The services are initialized synchronously above, so we can pass them directly.
  return (
    <FirebaseProvider
      firebaseApp={services.firebaseApp}
      auth={services.auth}
      firestore={services.firestore}
      functions={services.functions}
    >
      {children}
    </FirebaseProvider>
  );
}
