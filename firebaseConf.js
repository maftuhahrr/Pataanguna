import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAuth} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getFirestore} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-messaging.js";

const firebaseConfig = {
    apiKey: "AIzaSyCBpwb6L3R-wWG18w8H4cXJb7awyXt5AbA",
    authDomain: "pataanguna.firebaseapp.com",
    projectId: "pataanguna",
    storageBucket: "pataanguna.firebasestorage.app",
    messagingSenderId: "953275928559",
    appId: "1:953275928559:web:414e56933da4f0ef58b01a",
    measurementId: "G-P79P8KV1Q8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const messaging = getMessaging(app);

export { auth, db, messaging };