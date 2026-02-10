import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useApi } from "../../lib/api"
import { useAuth } from "../../auth/AuthProvider"

const SHARED_WORKSPACE_ID = "__shared__"

type Workspace = { workspaceId: string; name: string }
type Board = { boardId: string; name: string; updatedAt: number }

export function DashboardPage() {
  const api = useApi()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspaceId, setWorkspaceId] = useState<string>("")
  const [boards, setBoards] = useState<Board[]>([])
  const [sharedBoards, setSharedBoards] = useState<Board[]>([])
  const [sharedError, setSharedError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newBoardName, setNewBoardName] = useState("")
  const [myTemplates, setMyTemplates] = useState<Array<{ templateId: string; name: string; description?: string | null }>>([])

  const isSharedSelected = workspaceId === SHARED_WORKSPACE_ID
  const currentWorkspace = useMemo(
    () =>
      isSharedSelected
        ? { workspaceId: SHARED_WORKSPACE_ID, name: "Shared Workspaces" }
        : workspaces.find((w) => w.workspaceId === workspaceId) || null,
    [workspaces, workspaceId, isSharedSelected]
  )
  const displayBoards = isSharedSelected ? sharedBoards : boards

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setError(null)
      setSharedError(null)
      try {
        const ws = await api.listWorkspaces()
        if (!alive) return
        setWorkspaces(ws.workspaces || [])
        setWorkspaceId(SHARED_WORKSPACE_ID)
      } catch (e: any) {
        if (!alive) return
        if (e?.status === 401) {
          setError("Your session expired. Please log in again.")
          await logout()
          navigate("/login", { replace: true })
          return
        }
        setError(e?.message || "Failed to load workspaces")
        return
      } finally {
        if (alive) setLoading(false)
      }

      try {
        const shared = await api.listSharedBoards()
        if (!alive) return
        setSharedBoards(shared.boards || [])
      } catch (e: any) {
        if (!alive) return
        if (e?.status === 401) return
        setSharedError(e?.message || "Failed to load shared boards")
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!workspaceId || workspaceId === SHARED_WORKSPACE_ID) {
      if (workspaceId === SHARED_WORKSPACE_ID) setError(null)
      return
    }
    let alive = true
    ;(async () => {
      setError(null)
      try {
        const res = await api.listBoards(workspaceId)
        if (!alive) return
        setBoards(res.boards || [])
      } catch (e: any) {
        if (!alive) return
        if (e?.status === 401) {
          setError("Your session expired. Please log in again.")
          await logout()
          navigate("/login", { replace: true })
          return
        }
        setError(e?.message || "Failed to load boards")
      }
    })()
    return () => {
      alive = false
    }
  }, [workspaceId])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await api.listMyTemplates()
        if (!alive) return
        setMyTemplates(res.templates || [])
      } catch {
        if (!alive) return
        setMyTemplates([])
      }
    })()
    return () => { alive = false }
  }, [api])

  if (loading) return <div className="text-sm text-text-secondary">Loading…</div>

  return (
    <div className="max-w-6xl lg:grid lg:grid-cols-[1fr_280px] lg:gap-8">
      <div className="min-w-0">
      <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>

      {error && (
        <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <label className="block">
          <div className="text-sm font-semibold text-text-primary">Workspace</div>
          <select
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            className="mt-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value={SHARED_WORKSPACE_ID}>Shared Workspaces</option>
            {workspaces.map((w) => (
              <option key={w.workspaceId} value={w.workspaceId}>
                {w.name}
              </option>
            ))}
          </select>
        </label>

        {!isSharedSelected && (
          <div className="min-w-[260px] flex-1">
            <div className="text-sm font-semibold text-text-primary">Create a new board</div>
            <div className="mt-2 flex gap-2">
              <input
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="Board name"
                className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="button"
                onClick={async () => {
                  if (!workspaceId || workspaceId === SHARED_WORKSPACE_ID || !newBoardName.trim()) return
                  const res = await api.createBoard({ workspaceId, name: newBoardName.trim() })
                  setNewBoardName("")
                  navigate(`/app/boards/${res.boardId}`)
                }}
                className="rounded-lg btn-gradient px-4 py-2 text-sm font-semibold"
              >
                Create
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 text-sm text-text-secondary">
        Showing boards in{" "}
        <strong className="font-semibold text-text-primary">
          {currentWorkspace?.name || "workspace"}
        </strong>
      </div>

      {sharedError && isSharedSelected && (
        <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          {sharedError}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {displayBoards.map((b) => (
          <Link
            key={b.boardId}
            to={`/app/boards/${b.boardId}`}
            className="rounded-xl border border-border bg-surface p-4 shadow-xs transition-shadow duration-fast hover:shadow-sm"
          >
            <div className="text-base font-semibold text-text-primary">{b.name}</div>
            <div className="mt-2 text-xs text-text-muted">
              Updated {new Date(b.updatedAt).toLocaleString()}
            </div>
          </Link>
        ))}
        {displayBoards.length === 0 && !(isSharedSelected && sharedError) && (
          <div className="text-sm text-text-muted">
            {isSharedSelected
              ? "No boards have been shared with you yet."
              : "No boards yet — create one above."}
          </div>
        )}
      </div>

      {!isSharedSelected && (
        <div className="mt-10">
          <div className="text-sm font-semibold text-text-primary">Shared with you</div>
          {sharedError && <div className="mt-2 text-sm text-danger">{sharedError}</div>}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sharedBoards.map((b) => (
              <Link
                key={b.boardId}
                to={`/app/boards/${b.boardId}`}
                className="rounded-xl border border-border bg-surface p-4 shadow-xs transition-shadow duration-fast hover:shadow-sm"
              >
                <div className="text-base font-semibold text-text-primary">{b.name}</div>
                <div className="mt-2 text-xs text-text-muted">
                  Updated {new Date(b.updatedAt).toLocaleString()}
                </div>
              </Link>
            ))}
            {sharedBoards.length === 0 && !sharedError && (
              <div className="text-sm text-text-muted">No boards have been shared with you yet.</div>
            )}
          </div>
        </div>
      )}
      </div>

      <aside className="mt-10 lg:mt-0">
          <h2 className="text-sm font-semibold text-text-primary">My Published Templates</h2>
          <p className="mt-1 text-xs text-text-muted">Templates you published from the whiteboard editor.</p>
          <div className="mt-3 space-y-2">
            {myTemplates.length === 0 ? (
              <p className="text-sm text-text-muted">No published templates yet. Use &quot;Publish as Template&quot; in the board editor.</p>
            ) : (
              myTemplates.map((t) => (
                <div
                  key={t.templateId}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2"
                >
                  <span className="text-sm font-medium text-text-primary">{t.name}</span>
                  <Link
                    to={`/app/create-board`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Use
                  </Link>
                </div>
              ))
            )}
          </div>
      </aside>
    </div>
  )
}

