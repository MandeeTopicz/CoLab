import { applicationDefault, getApps, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

export function getDb() {
  if (!getApps().length) {
    // Uses Cloud Run / GCP default credentials (service account)
    initializeApp({ credential: applicationDefault() })
  }
  // IMPORTANT:
  // This project’s Firestore database id is not necessarily "(default)".
  // Your project currently has database id "colab" (see `gcloud firestore databases list`).
  const databaseId = process.env.FIRESTORE_DATABASE_ID || "(default)"
  return getFirestore(databaseId)
}

