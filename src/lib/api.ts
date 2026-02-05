import { useAuth } from "../auth/AuthProvider"

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://localhost:3001")

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

export function useApi() {
  const { token } = useAuth()
  const headers: HeadersInit | undefined = token ? { authorization: `Bearer ${token}` } : undefined

  return {
    me: () => request<{ user: any }>("/api/me", { method: "GET", headers }),
    listWorkspaces: () => request<{ workspaces: any[] }>("/api/workspaces", { method: "GET", headers }),
    createBoard: (body: { workspaceId: string; name: string }) =>
      request<{ boardId: string }>("/api/boards", { method: "POST", headers, body: JSON.stringify(body) }),
    listBoards: (workspaceId: string) =>
      request<{ boards: any[] }>(`/api/workspaces/${workspaceId}/boards`, { method: "GET", headers }),
    generateTemplate: (body: { prompt: string }) =>
      request<{ spec: any }>("/api/ai/template", { method: "POST", headers, body: JSON.stringify(body) }),
    getBoard: (boardId: string) => request<{ board: any }>(`/api/boards/${boardId}`, { method: "GET", headers }),
    saveBoardScene: (boardId: string, body: { scene: any }) =>
      request<{ ok: true; updatedAt: number }>(`/api/boards/${boardId}/scene`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      }),
    shareBoard: (boardId: string, body: { email: string }) =>
      request<{ ok: true }>(`/api/boards/${boardId}/share`, { method: "POST", headers, body: JSON.stringify(body) }),
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

