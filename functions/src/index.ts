
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {format} from "date-fns";
import {es} from "date-fns/locale";

admin.initializeApp();

const db = admin.firestore();
const fcm = admin.messaging();

/**
 * Retrieves FCM tokens for a given recipient configuration.
 * @param {any} recipient The recipient object from the notification document.
 * @return {Promise<string[]>} A promise that resolves to an array of unique FCM tokens.
 */
async function getTokensForRecipient(recipient: any): Promise<string[]> {
  const tokens: string[] = [];

  if (!recipient || !recipient.type) {
    console.log("Recipient or recipient.type not defined.");
    return [];
  }

  try {
    if (recipient.type === "all") {
      const usersSnapshot = await db.collection("users").get();
      usersSnapshot.forEach((doc) => {
        const userTokens = doc.data().fcmTokens;
        if (userTokens && Array.isArray(userTokens)) {
          tokens.push(...userTokens);
        }
      });
      const studentsSnapshot = await db.collection("students").get();
      studentsSnapshot.forEach((doc) => {
        const userTokens = doc.data().fcmTokens;
        if (userTokens && Array.isArray(userTokens)) {
          tokens.push(...userTokens);
        }
      });
    } else if (recipient.type === "user" || recipient.type === "teacher") {
      const userDoc = await db.collection("users").doc(recipient.id).get();
      if (userDoc.exists) {
        const userTokens = userDoc.data()?.fcmTokens;
        if (userTokens && Array.isArray(userTokens)) {
          tokens.push(...userTokens);
        }
      }
    } else if (recipient.type === "course") {
       // Find all students in that course
      const studentsSnapshot = await db.collection('students').get();
      const studentTokens: string[] = [];
      
      for (const studentDoc of studentsSnapshot.docs) {
          const student = studentDoc.data();
          
          // We need to check the 'grades' subcollection for each student
          const gradesRef = db.collection('grades');
          const gradesQuery = await gradesRef
                                .where('studentId', '==', studentDoc.id)
                                .where('courseId', '==', recipient.id)
                                .get();

          if (!gradesQuery.empty && student.fcmTokens) {
              studentTokens.push(...student.fcmTokens);
          }
      }
      tokens.push(...studentTokens);
    }
  } catch (error) {
    console.error("Error getting tokens:", error);
  }

  return [...new Set(tokens)];
}

/**
 * Sends a push notification to a list of tokens.
 * @param {string[]} tokens The FCM tokens to send the notification to.
 * @param {string} title The title of the notification.
 * @param {string} body The body of the notification.
 */
async function sendNotifications(tokens: string[], title: string, body: string) {
  if (tokens.length === 0) {
    console.log("No tokens to send to. Aborting.");
    return;
  }

  // Construct a payload that works for both foreground (data) and background (notification)
  const message: admin.messaging.Message = {
    notification: { // For background display
      title: title,
      body: body,
    },
    data: { // For foreground display (onMessage)
      title: title,
      body: body,
    },
    webpush: {
      fcmOptions: {
        link: "/login", // Default link, directs user to login which will redirect to their dashboard
      },
    },
    tokens: tokens,
  };

  try {
    const response = await fcm.sendEachForMulticast(message as admin.messaging.MulticastMessage);
    console.log("Successfully sent message:", response);
    if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
                failedTokens.push(tokens[idx]);
            }
        });
        console.log('List of tokens that caused failures: ' + failedTokens);
    }
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
}

// Triggers when a new document is created in the 'notifications' collection
export const sendPushNotificationOnNewNotification = functions.firestore
  .document("notifications/{notificationId}")
  .onCreate(async (snapshot) => {
    const notification = snapshot.data();
    if (!notification) {
      console.log("No data in notification snapshot. Aborting.");
      return;
    }

    const {title, description, recipient} = notification;
    console.log(`Processing notification: Title="${title}", Recipient=${JSON.stringify(recipient)}`);

    const tokens = await getTokensForRecipient(recipient);
    await sendNotifications(tokens, title, description);
    console.log("Finished processing notification.");
  });

// Triggers when a new document is created in the 'events' collection
export const sendPushNotificationOnNewEvent = functions.firestore
  .document("events/{eventId}")
  .onCreate(async (snapshot) => {
    console.log("--- Función 'sendPushNotificationOnNewEvent' activada ---");
    const event = snapshot.data();
    if (!event) {
      console.log("No hay datos en el snapshot del evento. Terminando.");
      return;
    }

    const {title, date} = event;

    if (!title || !date || !date.toDate) {
      console.log("Faltan datos en el evento (título o fecha). Terminando.");
      return;
    }

    const formattedDate = format(date.toDate(), "PPP", {locale: es});
    const notificationTitle = `Nuevo Evento: ${title}`;
    const notificationBody = `Se ha agregado un nuevo evento para el ${formattedDate}.`;

    console.log(`Datos leídos: Título="${notificationTitle}", Cuerpo="${notificationBody}"`);

    // For calendar events, we notify everyone.
    const tokens = await getTokensForRecipient({type: "all"});
    await sendNotifications(tokens, notificationTitle, notificationBody);
    console.log("--- Fin de la función 'sendPushNotificationOnNewEvent' ---");
  });
