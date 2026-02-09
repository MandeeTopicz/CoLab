import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useApi } from "../../lib/api"
import { useAuth } from "../../auth/AuthProvider"

type Notification = {
  notificationId: string
  kind: string
  boardId?: string
  boardName?: string
  fromName?: string | null
  fromEmail?: string | null
  createdAt?: number
  readAt?: number | null
}

export function NotificationsPage() {
  const api = useApi()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await api.listNotifications({ limit: 50 })
        if (!alive) return
        setNotifications((res.notifications || []) as Notification[])
      } catch (e: any) {
        if (!alive) return
        if (e?.status === 401) {
          setError("Your session expired. Please log in again.")
          await logout()
          navigate("/login", { replace: true })
          return
        }
        setError(e?.message || "Failed to load notifications")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (loading) return <div className="text-sm text-text-secondary">Loading…</div>

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-text-primary">Notifications</h1>

      {error && (
        <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {notifications.map((n) => {
          const unread = !n.readAt
          const when = typeof n.createdAt === "number" ? new Date(n.createdAt).toLocaleString() : ""
          const from = (n.fromName || n.fromEmail || "Someone") as string

          if (n.kind === "board_shared" && n.boardId) {
            return (
              <Link
                key={n.notificationId}
                to={`/app/boards/${n.boardId}`}
                onClick={async (e) => {
                  e.preventDefault()
                  try {
                    await api.markNotificationRead(n.notificationId)
                  } catch {
                    // ignore
                  }
                  navigate(`/app/boards/${n.boardId}`)
                }}
                className={[
                  "block rounded-xl border border-border bg-surface p-4 shadow-xs transition-shadow duration-fast hover:shadow-sm",
                  unread ? "ring-2 ring-primary/15" : "",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-text-primary">
                      {from} shared a board with you
                    </div>
                    <div className="mt-1 text-sm text-text-secondary">{n.boardName || "Board"}</div>
                  </div>
                  <div className="text-xs text-text-muted">{when}</div>
                </div>
              </Link>
            )
          }

          return (
            <div
              key={n.notificationId}
              className={[
                "rounded-xl border border-border bg-surface p-4 shadow-xs",
                unread ? "ring-2 ring-primary/15" : "",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-text-primary">Notification</div>
                  <div className="mt-1 text-sm text-text-secondary">{n.kind}</div>
                </div>
                <div className="text-xs text-text-muted">{when}</div>
              </div>
            </div>
          )
        })}

        {notifications.length === 0 && !error && (
          <div className="text-sm text-text-muted">You’re all caught up.</div>
        )}
      </div>
    </div>
  )
}

