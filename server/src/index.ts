import dotenv from "dotenv"
dotenv.config()

import Fastify from "fastify"
import cors from "@fastify/cors"
import rateLimit from "@fastify/rate-limit"
import sensible from "@fastify/sensible"
import { z } from "zod"
import { WebSocketServer } from "ws"
import { FieldValue } from "firebase-admin/firestore"

import { getAdminAuth, getDb } from "./firestore.js"
import { GoogleGenerativeAI } from "@google/generative-ai"

type AuthedRequest = { user: { uid: string; email?: string; name?: string } }

const configuredOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

const isDev = process.env.NODE_ENV !== "production"

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (configuredOrigins.includes(origin)) return cb(null, true)
    if (isDev && (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"))) {
      return cb(null, true)
    }
    return cb(null, false)
  },
})
await app.register(rateLimit, { max: 300, timeWindow: "1 minute" })
await app.register(sensible)

app.setErrorHandler((err: any, _req, reply) => {
  const statusCode =
    typeof err?.statusCode === "number"
      ? err.statusCode
      : typeof err?.status === "number"
        ? err.status
        : 500

  if (statusCode >= 500) app.log.error(err)
  else app.log.info({ statusCode, message: err?.message }, "request error")

  const errorCode =
    statusCode === 401
      ? "unauthorized"
      : statusCode === 403
        ? "forbidden"
        : statusCode === 404
          ? "not_found"
          : statusCode >= 500
            ? "internal_error"
            : "bad_request"

  reply.status(statusCode).send({
    ok: false,
    error: errorCode,
    ...(isDev ? { message: err?.message || String(err) } : {}),
  })
})

async function requireAuth(req: any, reply: any) {
  const header = req.headers?.authorization
  const token = typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : null
  if (!token) return reply.unauthorized(isDev ? "Missing Authorization: Bearer <token>" : undefined)

  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    ;(req as AuthedRequest).user = {
      uid: decoded.uid,
      email: decoded.email,
      name: (decoded as any).name,
    }
  } catch (e: any) {
    return reply.unauthorized(isDev ? e?.message || "Invalid Firebase ID token" : undefined)
  }
}

async function getBoardAndAssertAccess(args: { boardId: string; uid: string }) {
  const db = getDb()
  const snap = await db.collection("boards").doc(args.boardId).get()
  if (!snap.exists) return { snap: null, board: null }
  const board = snap.data() as any
  const ownerId = String(board?.ownerId || "")
  const collaboratorIds = Array.isArray(board?.collaboratorIds) ? (board.collaboratorIds as any[]) : []
  let allowed = ownerId === args.uid || collaboratorIds.includes(args.uid)

  // Back-compat: older boards may not have ownerId; allow workspace owner.
  if (!allowed && !ownerId && typeof board?.workspaceId === "string") {
    try {
      const wsSnap = await db.collection("workspaces").doc(String(board.workspaceId)).get()
      if (wsSnap.exists && String((wsSnap.data() as any)?.ownerId || "") === args.uid) allowed = true
    } catch {
      // ignore
    }
  }

  return { snap, board, allowed }
}

app.get("/api/health", async () => {
  const dbId = process.env.FIRESTORE_DATABASE_ID || "colab"
  return { ok: true, firestoreDatabaseId: dbId }
})

function extractJsonObject(text: string) {
  const first = text.indexOf("{")
  const last = text.lastIndexOf("}")
  if (first === -1 || last === -1 || last <= first) return null
  return text.slice(first, last + 1)
}

const TemplateSpecSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("kanban"),
    title: z.string().min(1).max(140),
    columns: z
      .array(
        z.object({
          title: z.string().min(1).max(40),
          cards: z.array(z.string().min(1).max(120)).max(8),
          color: z.string().optional(), // hex like #RRGGBB (optional)
        })
      )
      .min(3)
      .max(5),
  }),
  z.object({
    kind: z.literal("retro"),
    title: z.string().min(1).max(140),
    columns: z
      .array(
        z.object({
          title: z.string().min(1).max(40),
          cards: z.array(z.string().min(1).max(120)).max(10),
          color: z.string().optional(),
        })
      )
      .min(3)
      .max(4),
  }),
  z.object({
    kind: z.literal("brainstorm"),
    title: z.string().min(1).max(140),
    prompts: z.array(z.string().min(1).max(140)).min(6).max(16),
  }),
  z.object({
    kind: z.literal("kickoff"),
    title: z.string().min(1).max(140),
    sections: z
      .array(
        z.object({
          title: z.string().min(1).max(40),
          hint: z.string().min(1).max(180),
        })
      )
      .min(4)
      .max(10),
  }),
])

app.post("/api/ai/template", { preHandler: requireAuth }, async (req: any, reply) => {
  const user = (req as AuthedRequest).user

  const body = z
    .object({
      prompt: z.string().min(1).max(2000),
    })
    .parse(req.body)

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    return reply.status(501).send({
      ok: false,
      error: "llm_not_configured",
      ...(isDev ? { message: "Set GEMINI_API_KEY in the server environment." } : {}),
    })
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash"
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: modelName })

  const instruction = `
You are a collaborative whiteboard template designer.
Generate a highly organized, aesthetically pleasing board template based on the user's prompt.

Return ONLY a single JSON object that matches ONE of these shapes (no markdown, no code fences):

1) Kanban:
{ "kind":"kanban", "title": "...", "columns":[ { "title":"...", "cards":["..."], "color":"#RRGGBB" } ] }

2) Retro:
{ "kind":"retro", "title": "...", "columns":[ { "title":"...", "cards":["..."], "color":"#RRGGBB" } ] }

3) Brainstorm:
{ "kind":"brainstorm", "title":"...", "prompts":["..."] }

4) Kickoff:
{ "kind":"kickoff", "title":"...", "sections":[ { "title":"...", "hint":"..." } ] }

Constraints:
- Keep titles concise.
- Prefer 3 columns for kanban/retro unless prompt strongly suggests otherwise.
- Use short, actionable starter card text (no long paragraphs).
- If you include "color", it must be a hex string like "#22C55E".
- Do not include any additional keys.
`.trim()

  const content = `
User (${user.uid}) prompt:
${body.prompt}
`.trim()

  const res = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: `${instruction}\n\n${content}` }] }],
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 900,
    },
  })

  const text = res.response.text()
  const rawJson = extractJsonObject(text) ?? text
  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    return reply.status(502).send({
      ok: false,
      error: "llm_invalid_json",
      ...(isDev ? { message: `Gemini did not return valid JSON. Raw: ${text.slice(0, 500)}` } : {}),
    })
  }

  const spec = TemplateSpecSchema.parse(parsed)
  return { spec }
})

app.get("/api/me", { preHandler: requireAuth }, async (req: any) => {
  const user = (req as AuthedRequest).user
  return { user }
})

async function ensurePersonalWorkspace(uid: string, nameHint?: string) {
  const db = getDb()
  const workspaceId = `ws_${uid}`
  const ref = db.collection("workspaces").doc(workspaceId)
  const snap = await ref.get()
  if (snap.exists) return { workspaceId, ...(snap.data() as any) }

  const now = Date.now()
  const data = {
    workspaceId,
    name: nameHint ? `${nameHint}'s Workspace` : "My Workspace",
    ownerId: uid,
    personal: true,
    createdAt: now,
    updatedAt: now,
  }
  await ref.set(data)
  return data
}

app.get("/api/workspaces", { preHandler: requireAuth }, async (req: any) => {
  const user = (req as AuthedRequest).user
  const db = getDb()

  await ensurePersonalWorkspace(user.uid, user.name || undefined)

  const q = await db.collection("workspaces").where("ownerId", "==", user.uid).get()
  const workspaces = q.docs.map((d) => ({
    workspaceId: d.id,
    name: (d.data() as any).name || "Workspace",
  }))
  return { workspaces }
})

app.post("/api/boards", { preHandler: requireAuth }, async (req: any, reply) => {
  const user = (req as AuthedRequest).user
  const body = z
    .object({
      workspaceId: z.string().min(1),
      name: z.string().min(1).max(120),
    })
    .parse(req.body)

  const db = getDb()
  const wsSnap = await db.collection("workspaces").doc(body.workspaceId).get()
  if (!wsSnap.exists) return reply.notFound()
  if ((wsSnap.data() as any).ownerId !== user.uid) return reply.forbidden()

  const boardId = `b_${crypto.randomUUID()}`
  const now = Date.now()
  await db
    .collection("boards")
    .doc(boardId)
    .set({
      boardId,
      workspaceId: body.workspaceId,
      name: body.name,
      ownerId: user.uid,
      collaboratorIds: [],
      collaboratorEmails: [],
      scene: { elements: [], appState: { viewBackgroundColor: "#ffffff" }, files: {} },
      updatedAt: now,
      createdAt: now,
    })

  return { boardId }
})

app.get("/api/boards/:boardId", { preHandler: requireAuth }, async (req: any, reply) => {
  const user = (req as AuthedRequest).user
  const boardId = String(req.params.boardId || "")
  if (!boardId) return reply.notFound()

  const { board, allowed } = await getBoardAndAssertAccess({ boardId, uid: user.uid })
  if (!board) return reply.notFound()
  if (!allowed) return reply.forbidden()

  return {
    board: {
      boardId: board.boardId,
      workspaceId: board.workspaceId,
      name: board.name,
      ownerId: board.ownerId,
      collaboratorIds: board.collaboratorIds || [],
      collaboratorEmails: board.collaboratorEmails || [],
      scene: board.scene || null,
      updatedAt: board.updatedAt || 0,
      createdAt: board.createdAt || 0,
    },
  }
})

app.put("/api/boards/:boardId/scene", { preHandler: requireAuth }, async (req: any, reply) => {
  const user = (req as AuthedRequest).user
  const boardId = String(req.params.boardId || "")
  if (!boardId) return reply.notFound()

  const body = z
    .object({
      scene: z
        .object({
          elements: z.array(z.any()),
          appState: z.record(z.any()),
          files: z.record(z.any()),
        })
        .passthrough(),
    })
    .parse(req.body)

  const jsonSize = Buffer.byteLength(JSON.stringify(body.scene), "utf8")
  if (jsonSize > 900_000) {
    return reply.status(413).send({
      ok: false,
      error: "payload_too_large",
      ...(isDev ? { message: "Scene too large to store in Firestore doc." } : {}),
    })
  }

  const { board, allowed } = await getBoardAndAssertAccess({ boardId, uid: user.uid })
  if (!board) return reply.notFound()
  if (!allowed) return reply.forbidden()

  const now = Date.now()
  const db = getDb()
  await db.collection("boards").doc(boardId).set({ scene: body.scene, updatedAt: now }, { merge: true })
  return { ok: true, updatedAt: now }
})

app.post("/api/boards/:boardId/share", { preHandler: requireAuth }, async (req: any, reply) => {
  const user = (req as AuthedRequest).user
  const boardId = String(req.params.boardId || "")
  if (!boardId) return reply.notFound()

  const body = z
    .object({
      email: z.string().email().max(320),
    })
    .parse(req.body)

  const { board } = await getBoardAndAssertAccess({ boardId, uid: user.uid })
  if (!board) return reply.notFound()
  if (String(board.ownerId || "") !== user.uid) return reply.forbidden()

  const adminAuth = getAdminAuth()
  let target: any
  try {
    target = await adminAuth.getUserByEmail(body.email)
  } catch (e: any) {
    const code = String(e?.code || "")
    if (code.includes("user-not-found")) return reply.notFound()
    throw e
  }

  if (!target?.uid) return reply.notFound()
  if (target.uid === user.uid) return { ok: true }

  const db = getDb()
  const now = Date.now()
  await db
    .collection("boards")
    .doc(boardId)
    .set(
      {
        collaboratorIds: FieldValue.arrayUnion(target.uid),
        collaboratorEmails: FieldValue.arrayUnion(target.email || body.email),
        updatedAt: now,
      },
      { merge: true }
    )

  return { ok: true }
})

app.get("/api/workspaces/:workspaceId/boards", { preHandler: requireAuth }, async (req: any, reply) => {
  const user = (req as AuthedRequest).user
  const workspaceId = String(req.params.workspaceId || "")
  const db = getDb()

  const wsSnap = await db.collection("workspaces").doc(workspaceId).get()
  if (!wsSnap.exists) return reply.notFound()
  if ((wsSnap.data() as any).ownerId !== user.uid) return reply.forbidden()

  const q = await db.collection("boards").where("workspaceId", "==", workspaceId).get()
  const boards = q.docs
    .map((d) => d.data() as any)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .map((b) => ({ boardId: b.boardId, name: b.name, updatedAt: b.updatedAt || 0 }))

  return { boards }
})

const wss = new WebSocketServer({ noServer: true })
app.server.on("upgrade", (request, socket, head) => {
  try {
    const url = new URL(request.url || "/", "http://localhost")
    if (url.pathname !== "/ws") return
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request)
    })
  } catch {
    socket.destroy()
  }
})

type WsCtx = {
  authed: boolean
  uid: string | null
  boardId: string | null
  lastWriteAt: number
}

const rooms = new Map<string, Set<any>>()

function joinRoom(boardId: string, ws: any) {
  const set = rooms.get(boardId) || new Set<any>()
  set.add(ws)
  rooms.set(boardId, set)
}

function leaveRoom(boardId: string, ws: any) {
  const set = rooms.get(boardId)
  if (!set) return
  set.delete(ws)
  if (set.size === 0) rooms.delete(boardId)
}

function broadcast(boardId: string, message: unknown, exclude?: any) {
  const set = rooms.get(boardId)
  if (!set) return
  const payload = JSON.stringify(message)
  for (const client of set) {
    if (exclude && client === exclude) continue
    try {
      client.send(payload)
    } catch {
      // ignore
    }
  }
}

wss.on("connection", (ws) => {
  const ctx: WsCtx = { authed: false, uid: null, boardId: null, lastWriteAt: 0 }
  ws.send(JSON.stringify({ type: "hello" }))

  ws.on("close", () => {
    if (ctx.boardId) leaveRoom(ctx.boardId, ws)
  })

  ws.on("message", async (data) => {
    let msg: any
    try {
      msg = JSON.parse(data.toString())
    } catch {
      return
    }

    if (msg?.type === "auth") {
      const token = typeof msg?.token === "string" ? msg.token : ""
      const boardId = typeof msg?.boardId === "string" ? msg.boardId : ""
      if (!token || !boardId) {
        ws.send(JSON.stringify({ type: "auth:error", error: "missing_token_or_board" }))
        try {
          ws.close()
        } catch {
          // ignore
        }
        return
      }

      try {
        const decoded = await getAdminAuth().verifyIdToken(token)
        const uid = decoded.uid
        const { board, allowed } = await getBoardAndAssertAccess({ boardId, uid })
        if (!board || !allowed) {
          ws.send(JSON.stringify({ type: "auth:error", error: "forbidden" }))
          try {
            ws.close()
          } catch {
            // ignore
          }
          return
        }

        ctx.authed = true
        ctx.uid = uid
        ctx.boardId = boardId
        joinRoom(boardId, ws)
        ws.send(JSON.stringify({ type: "auth:ok" }))
        ws.send(JSON.stringify({ type: "scene:sync", scene: board.scene || null }))
      } catch (e: any) {
        ws.send(JSON.stringify({ type: "auth:error", error: "unauthorized", message: isDev ? e?.message : undefined }))
        try {
          ws.close()
        } catch {
          // ignore
        }
      }
      return
    }

    if (!ctx.authed || !ctx.uid || !ctx.boardId) return

    if (msg?.type === "scene:update") {
      const now = Date.now()
      if (now - ctx.lastWriteAt < 250) return
      ctx.lastWriteAt = now

      const scene = msg?.scene
      if (!scene || typeof scene !== "object") return
      try {
        const jsonSize = Buffer.byteLength(JSON.stringify(scene), "utf8")
        if (jsonSize > 900_000) return
      } catch {
        return
      }

      try {
        const db = getDb()
        await db.collection("boards").doc(ctx.boardId).set({ scene, updatedAt: now }, { merge: true })
      } catch {
        // ignore write errors; still broadcast best-effort
      }

      broadcast(ctx.boardId, { type: "scene:update", scene, from: ctx.uid, ts: now }, ws)
    }
  })
})

const port = Number(process.env.PORT || 3001)
await app.listen({ port, host: "0.0.0.0" })

