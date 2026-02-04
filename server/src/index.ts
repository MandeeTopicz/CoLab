import "dotenv/config"
import Fastify from "fastify"
import cors from "@fastify/cors"
import sensible from "@fastify/sensible"
import rateLimit from "@fastify/rate-limit"
import jwt from "@fastify/jwt"
import { WebSocketServer, WebSocket } from "ws"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { getDb } from "./firestore.js"

// NOTE: This is an MVP scaffold matching the PRD's structure.
// It provides deploy-ready building blocks: auth (email/password + JWT),
// workspace + boards CRUD, and a WebSocket channel for real-time board events.

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me"
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173"

const server = Fastify({ logger: true })
const db = getDb()

server.setErrorHandler((err, req, reply) => {
  // Log full error server-side; return minimal message to client.
  req.log.error({ err }, "request failed")
  const statusCode = (err as any)?.statusCode || 500
  reply.status(statusCode).send({
    error: statusCode >= 500 ? "Internal Server Error" : (err as any)?.message || "Request failed",
  })
})

await server.register(cors, {
  origin: [FRONTEND_ORIGIN],
  credentials: true,
})
await server.register(sensible)
await server.register(rateLimit, { max: 300, timeWindow: "1 minute" })
await server.register(jwt, { secret: JWT_SECRET })

type JwtPayload = { userId: string; email: string }

function signToken(payload: JwtPayload) {
  return server.jwt.sign(payload, { expiresIn: "7d" })
}

async function verifyAuth(req: any) {
  try {
    await req.jwtVerify()
  } catch {
    throw server.httpErrors.unauthorized("Unauthorized")
  }
}

// -----------------------------
// Persistence (Firestore)
// -----------------------------
// IMPORTANT: Cloud Run runs multiple instances; in-memory auth will cause random 401s.
// We persist users/workspaces/boards in Firestore so login works reliably.

// WebSocket object state is still in-memory (per instance) for now.
// We will move this into persistent storage / CRDT sync next.
const boardObjects = new Map<string, Map<string, any>>() // boardId -> objectId -> object

function cuidLike() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

server.get("/api/health", async () => {
  try {
    // Lightweight Firestore touch to validate permissions/API.
    await db.collection("_health").doc("ping").set({ at: Date.now() }, { merge: true })
    return { ok: true, firestore: "ok" }
  } catch (e: any) {
    server.log.error({ err: e }, "firestore health check failed")
    return { ok: false, firestore: "error", message: String(e?.message || e) }
  }
})

// -----------------------------
// Auth
// -----------------------------
server.post("/api/auth/signup", async (req, reply) => {
  const body = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    displayName: z.string().min(1),
  }).parse(req.body)

  const emailKey = body.email.toLowerCase()
  const userDocRef = db.collection("users").doc(emailKey)
  const existing = await userDocRef.get()
  if (existing.exists) throw server.httpErrors.conflict("Email already exists")

  const userId = cuidLike()
  const passwordHash = await bcrypt.hash(body.password, 10)
  await userDocRef.set({
    userId,
    email: body.email,
    passwordHash,
    displayName: body.displayName,
    createdAt: Date.now(),
    lastLogin: Date.now(),
  })

  // Create a default personal workspace
  const workspaceId = cuidLike()
  await db.collection("workspaces").doc(workspaceId).set({
    workspaceId,
    name: `${body.displayName}'s workspace`,
    ownerId: userId,
    members: [userId],
    createdAt: Date.now(),
  })

  const token = signToken({ userId, email: body.email })
  return reply.send({ token, user: { userId, email: body.email, displayName: body.displayName }, workspaceId })
})

server.post("/api/auth/login", async (req, reply) => {
  const body = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }).parse(req.body)

  const emailKey = body.email.toLowerCase()
  const snap = await db.collection("users").doc(emailKey).get()
  if (!snap.exists) throw server.httpErrors.unauthorized("Invalid credentials")
  const user = snap.data() as any

  const ok = await bcrypt.compare(body.password, user.passwordHash)
  if (!ok) throw server.httpErrors.unauthorized("Invalid credentials")

  await db.collection("users").doc(emailKey).update({ lastLogin: Date.now() })

  const token = signToken({ userId: user.userId, email: user.email })
  return reply.send({ token, user: { userId: user.userId, email: user.email, displayName: user.displayName } })
})

server.get("/api/me", { preHandler: verifyAuth }, async (req: any) => {
  const { userId } = req.user as JwtPayload
  const q = await db.collection("users").where("userId", "==", userId).limit(1).get()
  if (q.empty) throw server.httpErrors.unauthorized("Invalid session")
  const user = q.docs[0]!.data() as any
  return { user: { userId: user.userId, email: user.email, displayName: user.displayName } }
})

// -----------------------------
// Workspaces + Boards (MVP)
// -----------------------------
server.get("/api/workspaces", { preHandler: verifyAuth }, async (req: any) => {
  const { userId } = req.user as JwtPayload
  const q = await db.collection("workspaces").where("members", "array-contains", userId).get()
  const list = q.docs.map((d) => {
    const w = d.data() as any
    return { workspaceId: w.workspaceId, name: w.name, ownerId: w.ownerId }
  })
  return { workspaces: list }
})

server.post("/api/boards", { preHandler: verifyAuth }, async (req: any) => {
  const { userId } = req.user as JwtPayload
  const body = z.object({
    workspaceId: z.string().min(1),
    name: z.string().min(1),
  }).parse(req.body)

  const wsSnap = await db.collection("workspaces").doc(body.workspaceId).get()
  if (!wsSnap.exists) throw server.httpErrors.forbidden("No access")
  const ws = wsSnap.data() as any
  if (!Array.isArray(ws.members) || !ws.members.includes(userId)) throw server.httpErrors.forbidden("No access")

  const boardId = cuidLike()
  await db.collection("boards").doc(boardId).set({
    boardId,
    workspaceId: body.workspaceId,
    name: body.name,
    ownerId: userId,
    updatedAt: Date.now(),
    createdAt: Date.now(),
  })
  return { boardId }
})

server.get("/api/workspaces/:workspaceId/boards", { preHandler: verifyAuth }, async (req: any) => {
  const { userId } = req.user as JwtPayload
  const { workspaceId } = req.params as { workspaceId: string }
  const wsSnap = await db.collection("workspaces").doc(workspaceId).get()
  if (!wsSnap.exists) throw server.httpErrors.forbidden("No access")
  const ws = wsSnap.data() as any
  if (!Array.isArray(ws.members) || !ws.members.includes(userId)) throw server.httpErrors.forbidden("No access")

  const q = await db.collection("boards").where("workspaceId", "==", workspaceId).get()
  const list = q.docs.map((d) => d.data())
  return { boards: list }
})

server.get("/api/boards/:boardId/state", { preHandler: verifyAuth }, async (req: any) => {
  const { userId } = req.user as JwtPayload
  const { boardId } = req.params as { boardId: string }
  const boardSnap = await db.collection("boards").doc(boardId).get()
  if (!boardSnap.exists) throw server.httpErrors.notFound("Board not found")
  const board = boardSnap.data() as any

  const wsSnap = await db.collection("workspaces").doc(board.workspaceId).get()
  if (!wsSnap.exists) throw server.httpErrors.forbidden("No access")
  const ws = wsSnap.data() as any
  if (!Array.isArray(ws.members) || !ws.members.includes(userId)) throw server.httpErrors.forbidden("No access")

  const objs: any[] = []
  return { board, objects: objs }
})

// -----------------------------
// AI function schemas (deterministic stubs)
// -----------------------------
server.post("/api/ai/generate_guided_board_layout", { preHandler: verifyAuth }, async (req: any) => {
  const body = z.object({
    projectDescription: z.string(),
    primaryGoal: z.string(),
    teamType: z.string(),
    timeHorizon: z.enum(["short", "medium", "long"]),
    experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
  }).parse(req.body)

  // Deterministic, rule-based layout as a deploy-safe baseline.
  const frames = [
    { title: "Context", order: 0, description: body.projectDescription.slice(0, 140), locked: true },
    { title: "Goals", order: 1, description: body.primaryGoal.slice(0, 140), locked: true },
    { title: "Plan", order: 2, description: `Horizon: ${body.timeHorizon}`, locked: true },
  ]
  const sections = [
    { frameTitle: "Context", title: "What we know", helperText: "Add stickies with key facts.", allowedObjectTypes: ["sticky", "text", "shape"] },
    { frameTitle: "Goals", title: "Success criteria", helperText: "Define what 'done' means.", allowedObjectTypes: ["sticky", "text", "shape"] },
    { frameTitle: "Plan", title: "Next steps", helperText: "Break work into actionable items.", allowedObjectTypes: ["sticky", "text", "shape"] },
  ]

  return { frames, sections }
})

// -----------------------------
// WebSocket (real-time board events)
// -----------------------------
type BoardEvent =
  | { type: "STATE_SYNC"; payload: { objects: any[] } }
  | { type: "OBJECT_CREATED"; payload: { object: any } }
  | { type: "OBJECT_UPDATED"; payload: { object: any } }
  | { type: "OBJECT_DELETED"; payload: { objectId: string } }
  | { type: "PRESENCE"; payload: { connected: number } }

type ClientEvent =
  | { type: "OBJECT_CREATE"; payload: { boardId: string; object: any } }
  | { type: "OBJECT_UPDATE"; payload: { boardId: string; object: any } }
  | { type: "OBJECT_DELETE"; payload: { boardId: string; objectId: string } }

const httpServer = await server.listen({ port: PORT, host: "0.0.0.0" })
const wss = new WebSocketServer({ server: (server.server as any) })

const boardRooms = new Map<string, Set<WebSocket>>()

function roomFor(boardId: string) {
  const room = boardRooms.get(boardId) || new Set<WebSocket>()
  boardRooms.set(boardId, room)
  return room
}

function broadcast(boardId: string, event: BoardEvent) {
  const msg = JSON.stringify(event)
  for (const client of roomFor(boardId)) {
    if (client.readyState === WebSocket.OPEN) client.send(msg)
  }
}

wss.on("connection", async (ws, req) => {
  try {
    // Expect: ws://.../?token=JWT&boardId=...
    const url = new URL(req.url || "/", `http://${req.headers.host}`)
    const token = url.searchParams.get("token")
    const boardId = url.searchParams.get("boardId")
    if (!token || !boardId) {
      ws.close()
      return
    }

    // Verify token
    const payload = server.jwt.verify<JwtPayload>(token)
    const boardSnap = await db.collection("boards").doc(boardId).get()
    if (!boardSnap.exists) {
      ws.close()
      return
    }
    const board = boardSnap.data() as any

    const workspaceSnap = await db.collection("workspaces").doc(board.workspaceId).get()
    if (!workspaceSnap.exists) {
      ws.close()
      return
    }
    const workspace = workspaceSnap.data() as any
    if (!Array.isArray(workspace.members) || !workspace.members.includes(payload.userId)) {
      ws.close()
      return
    }

    const room = roomFor(boardId)
    room.add(ws)
    broadcast(boardId, { type: "PRESENCE", payload: { connected: room.size } })

    // Initial sync
    const objs = Array.from((boardObjects.get(boardId) || new Map()).values())
    ws.send(JSON.stringify({ type: "STATE_SYNC", payload: { objects: objs } } satisfies BoardEvent))

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as ClientEvent
        if (msg.type === "OBJECT_CREATE") {
          const { object } = msg.payload
          const objectId = object.objectId || cuidLike()
          const full = { ...object, objectId, updatedAt: Date.now() }
          const map = boardObjects.get(boardId) || new Map()
          map.set(objectId, full)
          boardObjects.set(boardId, map)
          broadcast(boardId, { type: "OBJECT_CREATED", payload: { object: full } })
          return
        }
        if (msg.type === "OBJECT_UPDATE") {
          const { object } = msg.payload
          if (!object?.objectId) return
          const map = boardObjects.get(boardId) || new Map()
          const prev = map.get(object.objectId) || {}
          const full = { ...prev, ...object, updatedAt: Date.now() }
          map.set(object.objectId, full)
          boardObjects.set(boardId, map)
          broadcast(boardId, { type: "OBJECT_UPDATED", payload: { object: full } })
          return
        }
        if (msg.type === "OBJECT_DELETE") {
          const { objectId } = msg.payload
          const map = boardObjects.get(boardId) || new Map()
          map.delete(objectId)
          boardObjects.set(boardId, map)
          broadcast(boardId, { type: "OBJECT_DELETED", payload: { objectId } })
        }
      } catch {
        // ignore malformed
      }
    })

    ws.on("close", () => {
      room.delete(ws)
      broadcast(boardId, { type: "PRESENCE", payload: { connected: room.size } })
    })
  } catch {
    ws.close()
  }
})

server.log.info({ port: PORT, httpServer }, "server started")

