
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";

import { getAuth } from
  "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import { getDatabase } from
  "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAOY7_hUMOxKhkEucgVdT68liO2-ikyLUg",
  authDomain: "pmist-bus-tracker-ec6a1.firebaseapp.com",
  databaseURL: "https://pmist-bus-tracker-ec6a1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pmist-bus-tracker-ec6a1",
  storageBucket: "pmist-bus-tracker-ec6a1.firebasestorage.app",
  messagingSenderId: "612131844988",
  appId: "1:612131844988:web:69e8bcd5245b23d61e2af9",
  measurementId: "G-YQLSJ8M5PW"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
