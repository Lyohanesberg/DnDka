import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/auth";

// Safely access env vars using import.meta.env
const getEnvVar = (key: string) => {
  if (import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  return '';
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || getEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY') || "AIzaSy...", 
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || getEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN') || "your-project.firebaseapp.com",
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || getEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID') || "your-project",
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || getEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') || getEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID') || getEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID')
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

export const db = firebase.firestore();
export const auth = firebase.auth();
