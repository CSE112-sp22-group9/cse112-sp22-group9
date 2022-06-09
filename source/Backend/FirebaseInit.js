import { GoogleAuthProvider } from './firebase-src/firebase-auth.min.js';
import { getAuth } from './firebase-src/firebase-auth.min.js';
import { getDatabase } from './firebase-src/firebase-database.min.js';
import { initializeApp } from './firebase-src/firebase-app.min.js';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyArqOXre1W52S00EIs-54ozkaGsMQdxD80',
    authDomain: 'stegosource-9lives.firebaseapp.com',
    databaseURL: 'https://stegosource-9lives-default-rtdb.firebaseio.com',
    projectId: 'stegosource-9lives',
    storageBucket: 'stegosource-9lives.appspot.com',
    messagingSenderId: '364705687263',
    appId: '1:364705687263:web:8fbe6fb72389425043eb6a',
    measurementId: 'G-ZFDM7MHPBX',
};

// // Initialize Firebase
const APP = initializeApp(FIREBASE_CONFIG);
export const db = getDatabase(APP);
export const auth = getAuth(APP);
export const googleProvider = new GoogleAuthProvider(APP);
