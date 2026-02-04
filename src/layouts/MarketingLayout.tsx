import { NavLink, Outlet } from "react-router-dom"

export function MarketingLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border/80 bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <NavLink
            to="/"
            className="rounded-lg px-2 py-1 text-lg font-bold tracking-tight text-text-primary hover:bg-toolbar transition-colors duration-fast"
          >
            CoLab
          </NavLink>

          <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
            {[
              ["/product", "Product"],
              ["/use-cases", "Use cases"],
              ["/templates", "Templates"],
              ["/pricing", "Pricing"],
              ["/enterprise", "Enterprise"],
              ["/resources", "Resources"],
              ["/blog", "Blog"],
              ["/help", "Help"],
            ].map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  [
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-fast",
                    isActive ? "bg-toolbar text-text-primary" : "text-text-secondary hover:bg-toolbar",
                  ].join(" ")
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
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
        <div className="mx-auto w-full max-w-6xl px-4 py-10">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-border/80 bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-8">
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

