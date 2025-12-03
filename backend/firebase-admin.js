import dotenv from "dotenv";
dotenv.config();

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // convert literal \n to newlines
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

export const adminAuth = getAuth(app);
export const db = getFirestore(app);

console.log(
  "[Firebase Admin] Initialized with project:",
  process.env.FIREBASE_PROJECT_ID,
);
