import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useEffect } from "react"

export function MarketingLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isLanding = location.pathname === "/"

  useEffect(() => {
    if (location.pathname !== "/") return
    if (location.hash !== "#about") return
    const t = window.setTimeout(() => {
      document.getElementById("about")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 0)
    return () => window.clearTimeout(t)
  }, [location.pathname, location.hash])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border/80 bg-surface/90 backdrop-blur">
        <div className="flex w-full items-center justify-between gap-4 px-6 py-3 sm:px-8">
          <NavLink
            to="/"
            className="inline-flex items-center gap-2.5 rounded-lg px-2 py-1 text-xl font-bold tracking-tight text-text-primary hover:bg-toolbar transition-colors duration-fast"
          >
            <img
              src="/logo.png"
              alt=""
              aria-hidden="true"
              className="h-7 w-7"
              width={28}
              height={28}
            />
            CoLab
          </NavLink>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-toolbar hover:text-text-primary transition-colors duration-fast"
              onClick={() => {
                if (location.pathname === "/" && location.hash === "#about") {
                  document.getElementById("about")?.scrollIntoView({ behavior: "smooth", block: "start" })
                  return
                }
                navigate("/#about")
              }}
            >
              About
            </button>
            <NavLink
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-toolbar transition-colors duration-fast"
            >
              Log in
            </NavLink>
            <NavLink
              to="/signup"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm hover:bg-primary-hover active:bg-primary-active transition-colors duration-fast"
            >
              Sign up
            </NavLink>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {isLanding ? (
          <Outlet />
        ) : (
          <div className="mx-auto w-full max-w-6xl px-4 py-10">
            <Outlet />
          </div>
        )}
      </main>

      <footer className="border-t border-border/80 bg-surface">
        <div className="w-full px-6 py-8 sm:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <div className="text-sm font-semibold text-text-primary">Product</div>
              <a className="mt-2 block text-sm text-text-secondary hover:text-text-primary" href="/product">
                Overview
              </a>
              <a className="mt-2 block text-sm text-text-secondary hover:text-text-primary" href="/templates">
                Templates
              </a>
            </div>
            <div>
              <div className="text-sm font-semibold text-text-primary">Company</div>
              <a className="mt-2 block text-sm text-text-secondary hover:text-text-primary" href="/blog">
                Blog
              </a>
              <a className="mt-2 block text-sm text-text-secondary hover:text-text-primary" href="/help">
                Help Center
              </a>
            </div>
            <div>
              <div className="text-sm font-semibold text-text-primary">Legal</div>
              <div className="mt-2 text-sm text-text-muted">Terms • Privacy • Cookies</div>
            </div>
          </div>
          <div className="mt-8 text-xs text-text-muted">© {new Date().getFullYear()} CoLab</div>
        </div>
      </footer>
    </div>
  )
}

