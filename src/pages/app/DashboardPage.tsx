import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useApi } from "../../lib/api"

type Workspace = { workspaceId: string; name: string }
type Board = { boardId: string; name: string; updatedAt: number }

export function DashboardPage() {
  const api = useApi()
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspaceId, setWorkspaceId] = useState<string>("")
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newBoardName, setNewBoardName] = useState("")

  const currentWorkspace = useMemo(
    () => workspaces.find((w) => w.workspaceId === workspaceId) || null,
    [workspaces, workspaceId]
  )

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const ws = await api.listWorkspaces()
        if (!alive) return
        setWorkspaces(ws.workspaces)
        const first = ws.workspaces[0]?.workspaceId || ""
        setWorkspaceId(first)
      } catch (e: any) {
        if (!alive) return
        setError(e?.message || "Failed to load workspaces")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!workspaceId) return
    let alive = true
    ;(async () => {
      setError(null)
      try {
        const res = await api.listBoards(workspaceId)
        if (!alive) return
        setBoards(res.boards)
      } catch (e: any) {
        if (!alive) return
        setError(e?.message || "Failed to load boards")
      }
    })()
    return () => {
      alive = false
    }
  }, [workspaceId])

  if (loading) return <div>Loading…</div>

  return (
    <div style={{ maxWidth: 1100 }}>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>

      {error && (
        <div
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid rgba(239,68,68,0.7)",
            background: "rgba(239,68,68,0.12)",
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Workspace</div>
          <select
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            style={{ padding: 10, borderRadius: 10 }}
          >
            {workspaces.map((w) => (
              <option key={w.workspaceId} value={w.workspaceId}>
                {w.name}
              </option>
            ))}
          </select>
        </label>

        <div style={{ flex: "1 1 260px" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Create a new board</div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="Board name"
              style={{ flex: 1, padding: 10, borderRadius: 10 }}
            />
            <button
              type="button"
              onClick={async () => {
                if (!workspaceId || !newBoardName.trim()) return
                const res = await api.createBoard({ workspaceId, name: newBoardName.trim() })
                setNewBoardName("")
                navigate(`/app/boards/${res.boardId}`)
              }}
            >
              Create
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, opacity: 0.85 }}>
        Showing boards in <strong>{currentWorkspace?.name || "workspace"}</strong>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {boards.map((b) => (
          <Link
            key={b.boardId}
            to={`/app/boards/${b.boardId}`}
            style={{
              textDecoration: "none",
              color: "inherit",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 12,
              padding: 14,
              background: "rgba(255,255,255,0.05)",
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 8 }}>{b.name}</div>
            <div style={{ opacity: 0.8, fontSize: 12 }}>
              Updated {new Date(b.updatedAt).toLocaleString()}
            </div>
          </Link>
        ))}
        {boards.length === 0 && (
          <div style={{ opacity: 0.8 }}>No boards yet — create one above.</div>
        )}
      </div>
    </div>
  )
}

