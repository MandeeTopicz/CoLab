import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAnalytics, isSupported } from "firebase/analytics"

type FirebaseWebConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
  measurementId?: string
}

function readConfig(): FirebaseWebConfig | null {
  const cfg: FirebaseWebConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  }

  // If config isn't provided, treat Firebase as disabled.
  if (
    !cfg.apiKey ||
    !cfg.authDomain ||
    !cfg.projectId ||
    !cfg.storageBucket ||
    !cfg.messagingSenderId ||
    !cfg.appId
  ) {
    return null
  }

  return cfg
}

export function initFirebaseApp(): FirebaseApp | null {
  const cfg = readConfig()
  if (!cfg) return null

  // Avoid re-initializing during HMR / React strict mode
  if (getApps().length) return getApps()[0]!
  return initializeApp(cfg)
}

let analyticsInitAttempted = false

export async function initFirebaseAnalytics() {
  if (analyticsInitAttempted) return
  analyticsInitAttempted = true

  // Analytics is optional; enable only when config exists and browser supports it.
  const app = initFirebaseApp()
  if (!app) return

  try {
    const supported = await isSupported()
    if (!supported) return
    getAnalytics(app)
  } catch {
    // Ignore analytics init failures (e.g. blocked by browser settings)
  }
}

