
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC2EeZ7lr9Obe451HoUqCm2fcgYmjxDcLY",
  authDomain: "studio-4955994490-36732.firebaseapp.com",
  projectId: "studio-4955994490-36732",
  storageBucket: "studio-4955994490-36732.appspot.com",
  messagingSenderId: "892551858927",
  appId: "1:892551858927:web:1d276fa45f50311e8be91a"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const storage = getStorage(app);

// Initialize Firestore with persistent cache
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    // No parameters needed for default behavior
  })
});
