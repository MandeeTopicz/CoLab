import { NavLink, Outlet } from "react-router-dom"
import "./marketing.css"

export function MarketingLayout() {
  return (
    <div className="mk-shell">
      <header className="mk-header">
        <div className="mk-brand">Board</div>
        <nav className="mk-nav">
          <NavLink to="/product">Product</NavLink>
          <NavLink to="/use-cases">Use cases</NavLink>
          <NavLink to="/templates">Templates</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
          <NavLink to="/enterprise">Enterprise</NavLink>
          <NavLink to="/resources">Resources</NavLink>
          <NavLink to="/blog">Blog</NavLink>
          <NavLink to="/help">Help</NavLink>
        </nav>
        <div className="mk-auth">
          <NavLink to="/login" className="mk-link">
            Log in
          </NavLink>
          <NavLink to="/signup" className="mk-cta">
            Sign up
          </NavLink>
        </div>
      </header>

      <main className="mk-main">
        <Outlet />
      </main>

      <footer className="mk-footer">
        <div className="mk-footer-grid">
          <div>
            <div className="mk-footer-title">Product</div>
            <a href="/product">Overview</a>
            <a href="/templates">Templates</a>
          </div>
          <div>
            <div className="mk-footer-title">Company</div>
            <a href="/blog">Blog</a>
            <a href="/help">Help Center</a>
          </div>
          <div>
            <div className="mk-footer-title">Legal</div>
            <span className="mk-muted">Terms • Privacy • Cookies</span>
          </div>
        </div>
        <div className="mk-muted">© {new Date().getFullYear()} Board</div>
      </footer>
    </div>
  )
}

