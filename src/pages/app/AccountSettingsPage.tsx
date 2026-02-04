import { useAuth } from "../../auth/AuthProvider"

export function AccountSettingsPage() {
  const { user } = useAuth()
  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ marginTop: 0 }}>Account settings</h1>
      <div style={{ opacity: 0.85 }}>
        <div>
          <strong>Display name:</strong> {user?.displayName}
        </div>
        <div>
          <strong>Email:</strong> {user?.email}
        </div>
      </div>
      <p style={{ opacity: 0.85, marginTop: 12 }}>
        Profile management (avatar, preferences) is next.
      </p>
    </div>
  )
}

