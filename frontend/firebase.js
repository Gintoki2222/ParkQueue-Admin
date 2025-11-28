// admin/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs,
    doc,
    getDoc,
    updateDoc,
    onSnapshot,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your Firebase configuration (same as user config)
const firebaseConfig = {
    apiKey: "AIzaSyDd4jxSZ1qDJmjiVeauuGuVFFImANRdeLo",
    authDomain: "parkqueue-216c7.firebaseapp.com",
    projectId: "parkqueue-216c7",
    storageBucket: "parkqueue-216c7.firebasestorage.app",
    messagingSenderId: "616114899392",
    appId: "1:616114899392:web:2c38883648cecd4f1c6025",
    measurementId: "G-WB0EN4W62V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export all the Firebase services you need
export {
    app,
    auth,
    db,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    onSnapshot,
    Timestamp
};