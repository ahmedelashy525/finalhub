import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAB3vzieQJgyquEoi8ZTjLUpM74PjlubLo",
  authDomain: "final-hub-lido.firebaseapp.com",
  projectId: "final-hub-lido",
  storageBucket: "final-hub-lido.firebasestorage.app",
  messagingSenderId: "19498415597",
  appId: "1:19498415597:web:396b98c47d8e815e48a3e4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
