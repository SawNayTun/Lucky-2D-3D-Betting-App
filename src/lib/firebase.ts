import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
const auth = getAuth(app);
const database = getDatabase(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export { app, analytics, auth, database, db };
