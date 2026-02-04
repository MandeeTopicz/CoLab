import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../auth/AuthProvider"
import "./appShell.css"

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isBoardRoute = location.pathname.startsWith("/app/boards/")

  return (
    <div className="app-shell">
      <header className="app-topbar" data-board={isBoardRoute ? "true" : "false"}>
        <div className="app-topbar-left">
          <div className="app-logo" onClick={() => navigate("/app/dashboard")}>
            Board
          </div>
          <button className="app-pill" type="button">
            Workspaces
          </button>
          <input
            className="app-search"
            placeholder="Search boards..."
            aria-label="Search boards"
          />
          <button className="app-primary" type="button">
            Create board
          </button>
        </div>
        <div className="app-topbar-right">
          <NavLink to="/app/notifications" className="app-pill-link">
            Notifications
          </NavLink>
          <NavLink to="/app/account" className="app-pill-link">
            Account
          </NavLink>
          <span className="app-user">{user?.displayName || "User"}</span>
          <button
            type="button"
            className="app-pill"
            onClick={() => {
              logout()
              navigate("/")
            }}
          >
            Log out
          </button>
        </div>
      </header>

      {isBoardRoute ? (
        <main className="app-board">
          <Outlet />
        </main>
      ) : (
        <div className="app-body">
          <aside className="app-sidebar" aria-label="App navigation">
            <NavLink to="/app/dashboard">Dashboard</NavLink>
            <NavLink to="/app/workspace-settings">Workspace settings</NavLink>
          </aside>

          <main className="app-content">
            <Outlet />
          </main>
        </div>
      )}
    </div>
  )
}

