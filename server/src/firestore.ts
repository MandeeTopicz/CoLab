import { applicationDefault, cert, initializeApp, getApps, type App } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore, type Firestore } from "firebase-admin/firestore"

let cachedApp: App | null = null
let cachedDb: Firestore | null = null

function buildCredential() {
  // Prefer explicit service account in dev/CI when available.
  // - FIREBASE_SERVICE_ACCOUNT_JSON: raw JSON string
  // - FIREBASE_SERVICE_ACCOUNT_BASE64: base64-encoded JSON
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  const rawB64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64

  if (rawJson) return cert(JSON.parse(rawJson))
  if (rawB64) return cert(JSON.parse(Buffer.from(rawB64, "base64").toString("utf8")))

  return applicationDefault()
}

export function getAdminApp() {
  if (cachedApp) return cachedApp
  if (getApps().length) {
    cachedApp = getApps()[0]!
    return cachedApp
  }

  cachedApp = initializeApp({
    credential: buildCredential(),
    projectId:
      process.env.FIREBASE_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      process.env.PROJECT_ID ||
      "colab-910cb",
  })
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

