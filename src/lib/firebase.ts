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
  const cfg: FirebaseWebConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  }

  const missing = Object.entries({
    VITE_FIREBASE_API_KEY: cfg.apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: cfg.authDomain,
    VITE_FIREBASE_PROJECT_ID: cfg.projectId,
    VITE_FIREBASE_STORAGE_BUCKET: cfg.storageBucket,
    VITE_FIREBASE_MESSAGING_SENDER_ID: cfg.messagingSenderId,
    VITE_FIREBASE_APP_ID: cfg.appId,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k)

  if (missing.length) {
    throw new Error(
      `Missing Firebase env vars: ${missing.join(
        ", "
      )}. Add them to .env.local (dev) and your build environment (prod).`
    )
  }

  return cfg
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

