import dotenv from "dotenv"
dotenv.config()

import Fastify from "fastify"
import cors from "@fastify/cors"
import rateLimit from "@fastify/rate-limit"
import sensible from "@fastify/sensible"
import { z } from "zod"
import { WebSocketServer } from "ws"

import { getAdminAuth, getDb } from "./firestore.js"

type AuthedRequest = { user: { uid: string; email?: string; name?: string } }

const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173"

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (origin === frontendOrigin) return cb(null, true)
    return cb(null, false)
  },
})
await app.register(rateLimit, { max: 300, timeWindow: "1 minute" })
await app.register(sensible)

app.setErrorHandler((err, _req, reply) => {
  app.log.error(err)
  reply.status(500).send({ ok: false, error: "internal_error" })
})

async function requireAuth(req: any, reply: any) {
  const header = req.headers?.authorization
  const token = typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : null
  if (!token) return reply.unauthorized()

  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    ;(req as AuthedRequest).user = {
      uid: decoded.uid,
      email: decoded.email,
      name: (decoded as any).name,
    }
  } catch {
    return reply.unauthorized()
  }
}

app.get("/api/health", async () => {
  // Firestore is lazily initialized; this verifies config is at least loadable.
  const dbId = process.env.FIRESTORE_DATABASE_ID || "colab"
  return { ok: true, firestoreDatabaseId: dbId }
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
  // Minimal authorization: user must own the workspace.
  const wsSnap = await db.collection("workspaces").doc(body.workspaceId).get()
  if (!wsSnap.exists) return reply.notFound()
  if ((wsSnap.data() as any).ownerId !== user.uid) return reply.forbidden()

  const boardId = `b_${crypto.randomUUID()}`
  const now = Date.now()
  await db
    .collection("boards")
    .doc(boardId)
    .set({ boardId, workspaceId: body.workspaceId, name: body.name, updatedAt: now, createdAt: now })

  return { boardId }
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

// Minimal WebSocket wiring (optional; safe if unused by frontend).
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

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "hello" }))
  ws.on("message", (data) => {
    // Echo for now
    ws.send(data.toString())
  })
})

const port = Number(process.env.PORT || 3001)
await app.listen({ port, host: "0.0.0.0" })

