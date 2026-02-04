import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAnalytics, isSupported } from "firebase/analytics"
import { getAuth, type Auth } from "firebase/auth"

type FirebaseWebConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
  measurementId?: string
}

function readConfig(): FirebaseWebConfig {
  // Prefer env vars, but fall back to the project config you provided.
  return {
    apiKey:
      import.meta.env.VITE_FIREBASE_API_KEY ||
      "AIzaSyBGbv38NNCmtJL_4JigP-OvRoIOAUQWadE",
    authDomain:
      import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "colab-910cb.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "colab-910cb",
    storageBucket:
      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
      "colab-910cb.firebasestorage.app",
    messagingSenderId:
      import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "723541563368",
    appId:
      import.meta.env.VITE_FIREBASE_APP_ID ||
      "1:723541563368:web:5004b885640a4b4e6e365d",
    measurementId:
      import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-FKMM96NBTE",
  }
}

export function initFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApps()[0]!
  return initializeApp(readConfig())
}

export function getFirebaseAuth(): Auth {
  return getAuth(initFirebaseApp())
}

let analyticsInitAttempted = false
export async function initFirebaseAnalytics() {
  if (analyticsInitAttempted) return
  analyticsInitAttempted = true

  try {
    const supported = await isSupported()
    if (!supported) return
    getAnalytics(initFirebaseApp())
  } catch {
    // ignore
  }
}

