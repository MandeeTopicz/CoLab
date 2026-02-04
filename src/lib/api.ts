import { useAuth } from "../auth/AuthProvider"

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "" : "http://localhost:3001")

export type ApiError = {
  status: number
  message: string
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  })

  if (!res.ok) {
    const message = await res.text().catch(() => "")
    throw { status: res.status, message: message || res.statusText } satisfies ApiError
  }

  return (await res.json()) as T
}

export function useApi() {
  const { token } = useAuth()

  return {
    signup: (body: { email: string; password: string; displayName: string }) =>
      request<{ token: string; user: any; workspaceId: string }>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    login: (body: { email: string; password: string }) =>
      request<{ token: string; user: any }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    me: () =>
      request<{ user: any }>("/api/me", {
        method: "GET",
        headers: { authorization: `Bearer ${token || ""}` },
      }),
    listWorkspaces: () =>
      request<{ workspaces: any[] }>("/api/workspaces", {
        method: "GET",
        headers: { authorization: `Bearer ${token || ""}` },
      }),
    createBoard: (body: { workspaceId: string; name: string }) =>
      request<{ boardId: string }>("/api/boards", {
        method: "POST",
        headers: { authorization: `Bearer ${token || ""}` },
        body: JSON.stringify(body),
      }),
    listBoards: (workspaceId: string) =>
      request<{ boards: any[] }>(`/api/workspaces/${workspaceId}/boards`, {
        method: "GET",
        headers: { authorization: `Bearer ${token || ""}` },
      }),
  }
}

export function getWsUrl() {
  const explicit = import.meta.env.VITE_WS_URL as string | undefined
  if (explicit) return explicit
  if (import.meta.env.PROD) {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws"
    return `${protocol}://${window.location.host}`
  }
  return "ws://localhost:3001"
}

