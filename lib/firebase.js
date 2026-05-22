// Importa las funciones necesarias
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // <--- ESTO FALTABA
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAADAn2NDdfcUSbaa-GK21dR3aXn3qTc2o",
  authDomain: "fisiobiss-b2b.firebaseapp.com",
  projectId: "fisiobiss-b2b",
  storageBucket: "fisiobiss-b2b.firebasestorage.app",
  messagingSenderId: "901373322175",
  appId: "1:901373322175:web:49fc2e13f74b31fd56770a",
  measurementId: "G-4DCXYBSYBE"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Inicializar Firestore y exportarlo
export const db = getFirestore(app); 

export default app;