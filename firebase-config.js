
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAqvvl6O3-2TLK4-j6ei1WU5SuaMY3HnO4",
  authDomain: "investment-calculator-931f2.firebaseapp.com",
  projectId: "investment-calculator-931f2",
  storageBucket: "investment-calculator-931f2.firebasestorage.app",
  messagingSenderId: "943895110805",
  appId: "1:943895110805:web:ba6e1e6177ae31d7af279c",
  measurementId: "G-F0CRPKLS7G"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
