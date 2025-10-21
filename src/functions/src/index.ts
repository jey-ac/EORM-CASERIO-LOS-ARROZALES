
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
        console.log(`Buscando estudiantes para el curso: ${recipient.id}`);
        
        // 1. Encontrar qué grados tienen este curso asignado.
        const gradeAssignmentsRef = db.collection('gradeAssignments');
        const assignmentsSnapshot = await gradeAssignmentsRef.where('courseIds', 'array-contains', recipient.id).get();

        if (assignmentsSnapshot.empty) {
            console.log(`Ningún grado tiene asignado el curso ${recipient.id}.`);
            return [];
        }

        const gradesWithCourse = assignmentsSnapshot.docs.map(doc => doc.id);
        console.log(`El curso ${recipient.id} se imparte en los siguientes grados:`, gradesWithCourse);

        // 2. Buscar todos los estudiantes que están en esos grados.
        // La consulta 'in' está limitada a 30 elementos. Si hay más de 30 grados, esto necesitaría un rediseño.
        if (gradesWithCourse.length > 0) {
            const studentsRef = db.collection('students');
            const studentsQuery = query(studentsRef, where('grade', 'in', gradesWithCourse));
            const studentsSnapshot = await getDocs(studentsQuery);

            if (studentsSnapshot.empty) {
                console.log(`No se encontraron estudiantes en los grados: ${gradesWithCourse.join(', ')}`);
                return [];
            }
            
            studentsSnapshot.forEach(studentDoc => {
                const studentData = studentDoc.data();
                if (studentData.fcmTokens && Array.isArray(studentData.fcmTokens)) {
                    tokens.push(...studentData.fcmTokens);
                }
            });
             console.log(`Encontrados ${tokens.length} tokens de estudiantes para el curso.`);
        }
    }
  } catch (error) {
    console.error("Error al obtener los tokens:", error);
  }

  // Devolver solo tokens únicos.
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
    console.log("No hay tokens a los que enviar. Abortando.");
    return;
  }

  // Se elimina el campo 'notification' y se deja solo 'data'.
  // Esto fuerza a que tanto en primer como en segundo plano, el mensaje sea un "mensaje de datos",
  // dando control total al código del cliente (app y service worker) para mostrar la notificación.
  const message: admin.messaging.MulticastMessage = {
    data: { // Para la visualización en primer plano (onMessage -> Toast) y en segundo plano (service worker)
      title: title,
      body: body,
    },
    webpush: {
      fcmOptions: {
        link: "/login", // Enlace por defecto, dirige al usuario al login que lo redirigirá a su panel.
      },
    },
    tokens: tokens,
  };

  try {
    const response = await fcm.sendMulticast(message);
    console.log("Mensaje enviado exitosamente:", response);
    if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
                failedTokens.push(tokens[idx]);
                console.log(`Fallo al enviar al token ${tokens[idx]}: ${resp.error}`);
            }
        });
        console.log('Lista de tokens que causaron fallos: ' + failedTokens);
    }
  } catch (error) {
    console.error("Error al enviar la notificación push:", error);
  }
}

// Se activa cuando se crea un nuevo documento en la colección 'notifications'
export const sendPushNotificationOnNewNotification = functions.firestore
  .document("notifications/{notificationId}")
  .onCreate(async (snapshot) => {
    const notification = snapshot.data();
    if (!notification) {
      console.log("No hay datos en el snapshot de la notificación. Abortando.");
      return;
    }

    const {title, description, recipient} = notification;
    console.log(`Procesando notificación: Título="${title}", Destinatario=${JSON.stringify(recipient)}`);

    const tokens = await getTokensForRecipient(recipient);
    await sendNotifications(tokens, title, description);
    console.log("Procesamiento de la notificación finalizado.");
  });

// Se activa cuando se crea un nuevo documento en la colección 'events'
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

    // Para eventos del calendario, notificamos a todos.
    const tokens = await getTokensForRecipient({type: "all"});
    await sendNotifications(tokens, notificationTitle, notificationBody);
    console.log("--- Fin de la función 'sendPushNotificationOnNewEvent' ---");
  });

// Import query and where from the correct admin path
const { query, where } = require("firebase-admin/firestore");
const { getDocs } = require("firebase-admin/firestore");
