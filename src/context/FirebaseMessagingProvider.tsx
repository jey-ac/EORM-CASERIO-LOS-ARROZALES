
'use client';

import { ReactNode, useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useFirebaseApp, useUser } from '@/firebase';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { getApp } from 'firebase/app';
import { urlBase64ToUint8Array } from '@/lib/utils';

export function FirebaseMessagingProvider({ children }: { children: ReactNode }) {
  const app = useFirebaseApp();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && user && firestore) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
          
            const requestPermissionAndToken = async () => {
              if (!user || !firestore) return;

              try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                  const vapidKey = "BEotAlZI3phPcmcLjfVbMbAhvmc8ADBsIgCLE3_Z09spSF2CiPGN3hA0fTRaM18QaTYVLSoYkgLcXt-vwEGx56E";
                  
                  if (typeof vapidKey !== 'string' || !vapidKey) {
                    console.error('VAPID key is not a valid string. Aborting token generation.');
                    return;
                  }

                  try {
                    const messaging = getMessaging(app);
                    const convertedVapidKey = urlBase64ToUint8Array(vapidKey);
                    const currentToken = await getToken(messaging, { 
                      vapidKey: vapidKey, 
                      serviceWorkerRegistration: registration 
                    });

                    if (currentToken) {
                      console.log('FCM Token:', currentToken);
                      
                      const userDocRef = doc(firestore, 'users', user.uid);
                      const studentDocRef = doc(firestore, 'students', user.uid);

                      let targetRef;
                      let targetDoc;

                      const userDoc = await getDoc(userDocRef);
                      if (userDoc.exists()) {
                          targetRef = userDocRef;
                          targetDoc = userDoc;
                      } else {
                          const studentDoc = await getDoc(studentDocRef);
                          if (studentDoc.exists()) {
                              targetRef = studentDocRef;
                              targetDoc = studentDoc;
                          }
                      }

                      if (targetRef && targetDoc) {
                        const tokens = targetDoc.data()?.fcmTokens || [];
                        if (!tokens.includes(currentToken)) {
                            await updateDoc(targetRef, {
                                fcmTokens: arrayUnion(currentToken)
                            });
                            console.log("FCM token saved for user.");
                        } else {
                            console.log("FCM token already exists for user.");
                        }
                      } else {
                         console.log("User document not found in 'users' or 'students'. Cannot save FCM token.");
                      }

                    } else {
                      console.error('No registration token available. Request permission to generate one.');
                    }
                  } catch (err) {
                     console.error(
                      'FCM Token-subscribe-failed: Could not retrieve FCM token. This can be due to a project configuration issue (missing Billing Account, disabled APIs) or a problem with the service worker. Please verify your Google Cloud project setup.',
                      err
                    );
                  }
                } else {
                  console.log('Unable to get permission to notify.');
                }
              } catch (err) {
                console.error('An error occurred while requesting notification permission. ', err);
              }
            };

            requestPermissionAndToken();

            const messaging = getMessaging(getApp());
            onMessage(messaging, (payload) => {
              console.log('Message received. ', payload);
              toast({
                title: payload.notification?.title || 'Nueva notificación',
                description: payload.notification?.body || '',
              });
            });

        }).catch((err) => {
            console.error('Service Worker registration failed: ', err);
        });
    }
  }, [app, user, firestore, toast]);

  return <>{children}</>;
}
