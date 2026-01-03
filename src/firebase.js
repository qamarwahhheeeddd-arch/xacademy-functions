// src/firebase.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";

import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 👉 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBpj988u_UZmsUWkNlenIzGJ8vlsAYKOVc",
  authDomain: "xacademy8-e52db.firebaseapp.com",
  projectId: "xacademy8-e52db",
  storageBucket: "xacademy8-e52db.firebasestorage.app",
  messagingSenderId: "132279987130",
  appId: "1:132279987130:web:1ea331a153564dbfcd0b83"
};

// 👉 Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

export const db = getFirestore(app);
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();

// 👉 Helper: Save token
async function saveUserToken(user) {
  const token = await user.getIdToken();
  localStorage.setItem("userToken", token);
}

// 👉 Email Login
export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await saveUserToken(cred.user);
  return cred.user;
}

// 👉 Signup
export async function signupWithEmail(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await saveUserToken(cred.user);
  return cred.user;
}

// 👉 Google Login (Redirect — works in Trust Wallet)
export async function loginWithGoogle() {
  await signInWithRedirect(auth, googleProvider);
}