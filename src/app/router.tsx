import { createBrowserRouter, Navigate } from "react-router-dom"
import { MarketingLayout } from "../layouts/MarketingLayout"
import { AppLayout } from "../layouts/AppLayout"
import { RequireAuth } from "../auth/RequireAuth"

import { HomePage } from "../pages/marketing/HomePage"
import { ProductPage } from "../pages/marketing/ProductPage"
import { UseCasesPage } from "../pages/marketing/UseCasesPage"
import { TemplatesPage } from "../pages/marketing/TemplatesPage"
import { PricingPage } from "../pages/marketing/PricingPage"
import { EnterprisePage } from "../pages/marketing/EnterprisePage"
import { ResourcesPage } from "../pages/marketing/ResourcesPage"
import { BlogPage } from "../pages/marketing/BlogPage"
import { HelpCenterPage } from "../pages/marketing/HelpCenterPage"

import { LoginPage } from "../pages/auth/LoginPage"
import { SignupPage } from "../pages/auth/SignupPage"

import { DashboardPage } from "../pages/app/DashboardPage"
import { BoardPage } from "../pages/app/BoardPage"
import { AccountSettingsPage } from "../pages/app/AccountSettingsPage"
import { WorkspaceSettingsPage } from "../pages/app/WorkspaceSettingsPage"
import { NotificationsPage } from "../pages/app/NotificationsPage"

export const router = createBrowserRouter([
  {
    element: <MarketingLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/product", element: <ProductPage /> },
      { path: "/use-cases", element: <UseCasesPage /> },
      { path: "/templates", element: <TemplatesPage /> },
      { path: "/pricing", element: <PricingPage /> },
      { path: "/enterprise", element: <EnterprisePage /> },
      { path: "/resources", element: <ResourcesPage /> },
      { path: "/blog", element: <BlogPage /> },
      { path: "/help", element: <HelpCenterPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/signup", element: <SignupPage /> },
    ],
  },
  {
    path: "/app",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "boards/:boardId", element: <BoardPage /> },
      { path: "workspace-settings", element: <WorkspaceSettingsPage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "account", element: <AccountSettingsPage /> },
    ],
  },
])

