import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAas8VrbH-tb6FWQRa4JrqEJEZcsOKcwEo",
  authDomain: "d-management-6bd74.firebaseapp.com",
  databaseURL: "https://d-management-6bd74-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "d-management-6bd74",
  storageBucket: "d-management-6bd74.firebasestorage.app",
  messagingSenderId: "881446635711",
  appId: "1:881446635711:web:cf755a10a36adfbd339e0a",
  measurementId: "G-GVF6DEGVJX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
const auth = getAuth(app);
const database = getDatabase(app);
const db = getFirestore(app);

export { app, analytics, auth, database, db };
