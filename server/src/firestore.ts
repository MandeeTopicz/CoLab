import { applicationDefault, initializeApp, getApps, type App } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore, type Firestore } from "firebase-admin/firestore"

let cachedApp: App | null = null
let cachedDb: Firestore | null = null

export function getAdminApp() {
  if (cachedApp) return cachedApp
  if (getApps().length) {
    cachedApp = getApps()[0]!
    return cachedApp
  }
  cachedApp = initializeApp({ credential: applicationDefault() })
  return cachedApp
}

export function getAdminAuth() {
  return getAuth(getAdminApp())
}

export function getDb() {
  if (cachedDb) return cachedDb
  const dbId = process.env.FIRESTORE_DATABASE_ID || "colab"
  // firebase-admin supports named databases (non-default) via the 2nd argument.
  cachedDb = getFirestore(getAdminApp(), dbId)
  return cachedDb
}

