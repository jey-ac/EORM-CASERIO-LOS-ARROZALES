
'use client';

import { ReactNode, useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useFirebaseApp, useUser } from '@/firebase';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, DocumentReference, DocumentData } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export function FirebaseMessagingProvider({ children }: { children: ReactNode }) {
  const app = useFirebaseApp();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    const setupMessaging = async () => {
      console.log('[FCM Provider] Iniciando configuración de mensajería...');
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator && user && firestore && app) {
        try {
          console.log('[FCM Provider] Service Worker, usuario, Firestore y App de Firebase disponibles.');
          
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('[FCM Provider] Service Worker registrado o ya activo:', registration);

          const messaging = getMessaging(app);

          console.log('[FCM Provider] Solicitando permiso para notificaciones...');
          const permission = await Notification.requestPermission();
          console.log(`[FCM Provider] Permiso de notificación: ${permission}`);
          
          if (permission === 'granted') {
            const vapidKey = "BEotAlZI3phPcmcLjfVbMbAhvmc8ADBsIgCLE3_Z09spSF2CiPGN3hA0fTRaM18QaTYVLSoYkgLcXt-vwEGx56E";
            
            if (typeof vapidKey !== 'string' || !vapidKey) {
              console.error('[FCM Provider] VAPID key no es válida. Abortando generación de token.');
              return;
            }
            
            console.log('[FCM Provider] Obteniendo token FCM con VAPID key...');
            const currentToken = await getToken(messaging, { 
              vapidKey: vapidKey,
              serviceWorkerRegistration: registration 
            });

            if (currentToken) {
              console.log('[FCM Provider] Token FCM obtenido:', currentToken);
              
              let targetRef: DocumentReference<DocumentData> | null = null;
              let targetData: DocumentData | null = null;

              // Attempt 1: Find in 'users' collection by UID (standard users)
              const userDocRef = doc(firestore, 'users', user.uid);
              const userDocSnap = await getDoc(userDocRef);

              if (userDocSnap.exists()) {
                  targetRef = userDocSnap.ref;
                  targetData = userDocSnap.data();
                  console.log(`[FCM Provider] Encontrado en 'users' por UID. ID: ${targetRef.id}`);
              } else {
                  // Attempt 2: Find in 'students' collection by authUid
                  console.log(`[FCM Provider] No encontrado en 'users'. Buscando en 'students' por authUid: ${user.uid}`);
                  const studentQuery = query(collection(firestore, 'students'), where("authUid", "==", user.uid));
                  const studentsSnapshot = await getDocs(studentQuery);
                  if (!studentsSnapshot.empty) {
                      targetRef = studentsSnapshot.docs[0].ref;
                      targetData = studentsSnapshot.docs[0].data();
                      console.log(`[FCM Provider] Encontrado en 'students' por authUid. ID: ${targetRef.id}`);
                  }
              }


              if (targetRef && targetData) {
                const tokens = targetData.fcmTokens || [];
                if (!tokens.includes(currentToken)) {
                    console.log("[FCM Provider] El token no existe en el documento. Guardándolo...");
                    await updateDoc(targetRef, {
                        fcmTokens: arrayUnion(currentToken)
                    });
                    console.log("[FCM Provider] Token FCM guardado para el usuario.");
                } else {
                    console.log("[FCM Provider] El token FCM ya existe para el usuario.");
                }
              } else {
                 console.log("[FCM Provider] No se encontró el documento del usuario en 'users' o 'students'. No se puede guardar el token FCM.");
              }
            } else {
              console.error('[FCM Provider] No hay token de registro disponible. Se necesita solicitar permiso para generarlo.');
            }

            console.log('[FCM Provider] Configurando el manejador de mensajes en primer plano (onMessage)...');
            onMessage(messaging, (payload) => {
              console.log('[FCM Provider] Mensaje en primer plano recibido: ', payload);
              // For foreground messages, data is in payload.data
              const title = payload.data?.title || 'Nueva notificación';
              const description = payload.data?.body || 'Has recibido una nueva actualización.';
              
              toast({
                title: title,
                description: description,
              });
            });

          } else {
            console.log('[FCM Provider] No se pudo obtener permiso para notificar.');
          }
        } catch (err) {
          console.error('[FCM Provider] Ocurrió un error durante la configuración de Firebase Messaging:', err);
        }
      } else {
          console.log('[FCM Provider] No se cumplen las condiciones para la configuración de mensajería (no hay service worker, usuario, firestore o app).');
      }
    };

    if (user && firestore) {
      setupMessaging();
    }

  }, [app, user, firestore, toast]);

  return <>{children}</>;
}
