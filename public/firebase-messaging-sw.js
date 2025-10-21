
// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
// "Default" Firebase configuration (prevents errors)
const firebaseConfig = {
    apiKey: "AIzaSyConaLMGbmuUyXc0uPK6E3La_PPeKjeVno",
    authDomain: "studio-4703824518-7192d.firebaseapp.com",
    projectId: "studio-4703824518-7192d",
    storageBucket: "studio-4703824518-7192d.appspot.com",
    messagingSenderId: "624173814853",
    appId: "1:624173814853:web:5ef00936897789bd6fff2c",
    measurementId: "G-5G3Q5Z3B1P"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Customize notification here
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: '/logo.png' // Puedes cambiar esto a un ícono de tu elección
  };

  self.registration.showNotification(notificationTitle,
    notificationOptions);
});
