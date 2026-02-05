import { applicationDefault, cert, initializeApp, getApps, type App } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore, type Firestore } from "firebase-admin/firestore"
import fs from "node:fs"
import path from "node:path"

let cachedApp: App | null = null
let cachedDb: Firestore | null = null

function buildCredential() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  const rawB64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64

  if (rawJson) return cert(JSON.parse(rawJson))
  if (rawB64) return cert(JSON.parse(Buffer.from(rawB64, "base64").toString("utf8")))

  // Local dev: support GOOGLE_APPLICATION_CREDENTIALS pointing at a JSON file.
  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (gac) {
    try {
      const filePath = path.isAbsolute(gac) ? gac : path.resolve(process.cwd(), gac)
      const txt = fs.readFileSync(filePath, "utf8")
      return cert(JSON.parse(txt))
    } catch {
      // ignore; fall back below
    }
  }

  // Local dev convenience: if `server/serviceAccount.json` exists, use it.
  if (process.env.NODE_ENV !== "production") {
    try {
      const filePath = path.resolve(process.cwd(), "serviceAccount.json")
      if (fs.existsSync(filePath)) {
        const txt = fs.readFileSync(filePath, "utf8")
        return cert(JSON.parse(txt))
      }
    } catch {
      // ignore; fall back below
    }
  }

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
  cachedDb = getFirestore(getAdminApp(), dbId)
  return cachedDb
}

