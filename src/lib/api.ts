import { useMemo } from "react"
import { useAuth } from "../auth/AuthProvider"

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:3001")

type ApiError = { status: number; message: string }

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw { status: res.status, message: text || res.statusText } satisfies ApiError
  }
  return (await res.json()) as T
}

/** AI template: never throws; 501 / llm_not_configured returns { spec: null, error } so client can fall back to built-in templates. */
async function requestAiTemplate(
  path: string,
  init: RequestInit,
  baseUrl: string
): Promise<{ spec: any; error?: string; message?: string }> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  })
  const text = await res.text().catch(() => "")
  let data: any = {}
  if (text.trim()) {
    try {
      data = JSON.parse(text)
    } catch {
      data = {}
    }
  }
  if (res.ok) return data
  if (res.status === 501 && (data?.error === "llm_not_configured" || !data?.error)) {
    return { spec: null, error: "llm_not_configured", ...data }
  }
  throw { status: res.status, message: text || res.statusText } satisfies ApiError
}

export function useApi() {
  const { token } = useAuth()
  return useMemo(() => {
    const headers: HeadersInit | undefined = token ? { authorization: `Bearer ${token}` } : undefined

    return {
      me: () => request<{ user: any }>("/api/me", { method: "GET", headers }),
      listNotifications: (params?: { limit?: number }) => {
        const limit = typeof params?.limit === "number" ? params.limit : undefined
        const qs = limit ? `?limit=${encodeURIComponent(String(limit))}` : ""
        return request<{ notifications: any[] }>(`/api/notifications${qs}`, { method: "GET", headers })
      },
      markNotificationRead: (notificationId: string) =>
        request<{ ok: true }>(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
          method: "POST",
          headers,
        }),
      listWorkspaces: () => request<{ workspaces: any[] }>("/api/workspaces", { method: "GET", headers }),
      createBoard: (body: { workspaceId: string; name: string }) =>
        request<{ boardId: string }>("/api/boards", { method: "POST", headers, body: JSON.stringify(body) }),
      listBoards: (workspaceId: string) =>
        request<{ boards: any[] }>(`/api/workspaces/${workspaceId}/boards`, { method: "GET", headers }),
      listSharedBoards: () => request<{ boards: any[] }>(`/api/boards/shared-with-me`, { method: "GET", headers }),
      generateTemplate: (body: { prompt: string }) =>
        requestAiTemplate("/api/ai/template", { method: "POST", headers, body: JSON.stringify(body) }, API_BASE_URL),
      getBoard: (boardId: string) => request<{ board: any }>(`/api/boards/${boardId}`, { method: "GET", headers }),
      dismissBoardOnboarding: async (boardId: string) => {
        const res = await fetch(`${API_BASE_URL}/api/boards/${boardId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json", ...headers },
          body: JSON.stringify({ onboardingDismissedAt: Date.now() }),
        })
        if (res.status === 404) return { ok: true as const }
        if (!res.ok) {
          const text = await res.text().catch(() => "")
          throw { status: res.status, message: text || res.statusText } satisfies ApiError
        }
        return (await res.json()) as { ok: true }
      },
      updateBoard: (boardId: string, body: { name?: string }) =>
        request<{ ok: true }>(`/api/boards/${boardId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(body),
        }),
      duplicateBoard: (boardId: string, body: { name: string; workspaceId?: string; scene?: any }) =>
        request<{ boardId: string }>(`/api/boards/${boardId}/duplicate`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        }),
      saveBoardScene: (boardId: string, body: { scene: any }) =>
        request<{ ok: true; updatedAt: number }>(`/api/boards/${boardId}/scene`, {
          method: "PUT",
          headers,
          body: JSON.stringify(body),
        }),
      shareBoard: (boardId: string, body: { email: string }) =>
        request<{ ok: true }>(`/api/boards/${boardId}/share`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        }),
    }
  }, [token])
}

export function getWsUrl() {
  const explicit = import.meta.env.VITE_WS_URL as string | undefined
  if (explicit) return explicit
  if (import.meta.env.PROD) {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws"
    return `${protocol}://${window.location.host}`
  }
  return "ws://127.0.0.1:3001"
}

