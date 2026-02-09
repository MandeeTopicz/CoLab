import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, "..", ".env") })

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

// Pencil/freehand drawings can produce very large scenes. Increase body limit so
// `/api/boards/:boardId/scene` and `/api/boards/:boardId/duplicate` can accept them.
const app = Fastify({ logger: true, bodyLimit: 50 * 1024 * 1024 })

await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (configuredOrigins.includes(origin)) return cb(null, true)
    if (isDev && (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"))) {
      return cb(null, true)
    }
    return cb(null, false)
  },
  // `@fastify/cors` expects a comma-separated string (array support is not reliable across versions).
  methods: "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
  allowedHeaders: ["content-type", "authorization"],
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

const SCENE_INLINE_LIMIT_BYTES = 900_000
const SCENE_WS_ACCEPT_LIMIT_BYTES = 2_500_000
// Firestore document limit is 1 MiB. Chunk by bytes so each doc stays under it.
const SCENE_CHUNK_MAX_BYTES = 900_000

/** Split a string into chunks that each stay under maxBytesPerChunk when encoded as UTF-8. */
function chunkStringByBytes(input: string, maxBytesPerChunk: number): string[] {
  const out: string[] = []
  let start = 0
  while (start < input.length) {
    let end = start
    let byteCount = 0
    while (end < input.length) {
      const charBytes = Buffer.byteLength(input[end]!, "utf8")
      if (byteCount + charBytes > maxBytesPerChunk && byteCount > 0) break
      byteCount += charBytes
      end++
    }
    out.push(input.slice(start, end))
    start = end
  }
  return out
}

async function deleteSceneChunks(db: any, boardId: string) {
  // Best-effort delete all existing chunk docs.
  try {
    const snap = await db.collection("boards").doc(boardId).collection("sceneChunks").get()
    if (snap.empty) return
    let batch = db.batch()
    let n = 0
    for (const doc of snap.docs) {
      batch.delete(doc.ref)
      n++
      if (n >= 400) {
        await batch.commit()
        batch = db.batch()
        n = 0
      }
    }
    if (n) await batch.commit()
  } catch {
    // ignore cleanup errors
  }
}

async function readBoardScene(db: any, boardId: string, board: any) {
  if (!board) return null
  // Prefer boardScenes first so we never need to touch the board doc when saving.
  const sceneDoc = await db.collection("boardScenes").doc(boardId).get()
  const sceneData = sceneDoc.exists ? (sceneDoc.data() as any) : null
  if (typeof sceneData?.sceneJson === "string") {
    try {
      return JSON.parse(sceneData.sceneJson) as any
    } catch {
      return null
    }
  }
  // Chunked: detect by presence of sceneChunks (do not rely on board.sceneChunked).
  const q = await db.collection("boards").doc(boardId).collection("sceneChunks").orderBy("index", "asc").get()
  if (!q.empty) {
    const parts = q.docs.map((d: any) => String((d.data() as any)?.data || ""))
    const json = parts.join("")
    try {
      return JSON.parse(json) as any
    } catch {
      return null
    }
  }
  if (typeof board.sceneJson === "string") {
    try {
      return JSON.parse(board.sceneJson) as any
    } catch {
      return null
    }
  }
  return board.scene || null
}

async function writeBoardScene(db: any, boardId: string, scene: any, now: number) {
  let json: string
  try {
    json = JSON.stringify(scene)
  } catch {
    throw Object.assign(new Error("Scene is not serializable"), { statusCode: 400 })
  }
  const bytes = Buffer.byteLength(json, "utf8")

  if (bytes <= SCENE_INLINE_LIMIT_BYTES) {
    // Only write to boardScenes. Do not update the board doc - it may contain an invalid
    // "scene" field; any merge triggers Firestore to validate the whole doc and throw.
    await db.collection("boardScenes").doc(boardId).set({ sceneJson: json, updatedAt: now }, { merge: true })
    return { stored: "inline" as const, bytes }
  }

  const chunks = chunkStringByBytes(json, SCENE_CHUNK_MAX_BYTES)
  // Replace existing chunks entirely to avoid stale tail docs.
  await deleteSceneChunks(db, boardId)

  // Write new chunks in batches.
  let batch = db.batch()
  let n = 0
  for (let i = 0; i < chunks.length; i++) {
    const ref = db.collection("boards").doc(boardId).collection("sceneChunks").doc(String(i))
    batch.set(
      ref,
      {
        index: i,
        data: chunks[i],
        updatedAt: now,
      },
      { merge: true }
    )
    n++
    if (n >= 400) {
      await batch.commit()
      batch = db.batch()
      n = 0
    }
  }
  if (n) await batch.commit()

  // Do not update the board doc - it may contain an invalid "scene" field; any merge can throw.

  return { stored: "chunked" as const, bytes, chunks: chunks.length }
}

async function upsertUserNotification(args: {
  toUid: string
  notificationId: string
  data: Record<string, unknown>
}) {
  const db = getDb()
  const ref = db.collection("users").doc(args.toUid).collection("notifications").doc(args.notificationId)
  await ref.set(
    {
      notificationId: ref.id,
      ...args.data,
    },
    { merge: true }
  )
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
          color: z.string().optional(),
        })
      )
      .min(2)
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
      .min(2)
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
    return reply.send({
      ok: true,
      spec: null,
      error: "llm_not_configured",
      ...(isDev ? { message: "Set GEMINI_API_KEY in the server environment." } : {}),
    })
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash"
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: modelName })

  const instruction = `
You are a collaborative whiteboard template designer. Generate a board template that matches the user's intent and feels purpose-built for their prompt.

RULES:
1) Board title (mandatory): Generate a short, summarized title in 3–7 words. The title must describe the outcome or purpose of the board, not the user's instructions. Never use the raw user prompt as the title. Do not reuse instructional phrasing or system messages in the title. Examples: "Mobile App Sprint Plan", "Product Launch Brainstorm", "Q3 Goals Retro", "API Redesign Workshop". Titles should feel human-written, concise, and scannable.
2) Content variation: Every card, note, or prompt must have distinct, context-aware text. Do not repeat the same placeholder (e.g. "Idea…" or "Add a note…") across multiple items. Each item should suggest a different angle or action relevant to the prompt.
3) Structure: Vary columns/sections based on prompt. Use 2 columns for simple flows (e.g. pros/cons, before/after), 3 for classic kanban/retro, 4–5 when the user asks for more phases or categories. Match the layout to the intent (planning → sections with hints; brainstorm → varied prompts; diagram → structure the user described).
4) Colors: Use hex colors only when they add clarity (e.g. status columns). Optional; omit if not needed.

Return ONLY a single JSON object (no markdown, no code fences):

1) Kanban (2–5 columns):
{ "kind":"kanban", "title": "...", "columns":[ { "title":"...", "cards":["...", "...", "..."], "color":"#RRGGBB" } ] }

2) Retro (2–4 columns):
{ "kind":"retro", "title": "...", "columns":[ { "title":"...", "cards":["...", "..."], "color":"#RRGGBB" } ] }

3) Brainstorm (6–16 distinct prompts):
{ "kind":"brainstorm", "title":"...", "prompts":["...", "...", "..."] }

4) Kickoff (4–10 sections):
{ "kind":"kickoff", "title":"...", "sections":[ { "title":"...", "hint":"..." } ] }

- Each card/prompt/hint must be unique and relevant to the user's topic.
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

app.get("/api/notifications", { preHandler: requireAuth }, async (req: any) => {
  const user = (req as AuthedRequest).user
  const limitRaw = (req.query as any)?.limit
  const limit = Math.max(1, Math.min(100, Number(limitRaw || 50) || 50))

  const db = getDb()
  const q = await db
    .collection("users")
    .doc(user.uid)
    .collection("notifications")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get()

  const notifications = q.docs.map((d) => d.data() as any)
  return { notifications }
})

app.post("/api/notifications/:notificationId/read", { preHandler: requireAuth }, async (req: any) => {
  const user = (req as AuthedRequest).user
  const notificationId = String(req.params.notificationId || "")
  if (!notificationId) return { ok: true }

  const db = getDb()
  const now = Date.now()
  await db
    .collection("users")
    .doc(user.uid)
    .collection("notifications")
    .doc(notificationId)
    .set({ readAt: now, updatedAt: now }, { merge: true })

  return { ok: true }
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
  const initialSceneJson = JSON.stringify({
    elements: [],
    appState: { viewBackgroundColor: "#ffffff" },
    files: {},
  })
  await db.collection("boardScenes").doc(boardId).set({ sceneJson: initialSceneJson, updatedAt: now })
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
      sceneChunked: false,
      sceneChunksCount: 0,
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

  const db = getDb()
  const scene = await readBoardScene(db, boardId, board)

  return {
    board: {
      boardId: board.boardId,
      workspaceId: board.workspaceId,
      name: board.name,
      ownerId: board.ownerId,
      collaboratorIds: board.collaboratorIds || [],
      collaboratorEmails: board.collaboratorEmails || [],
      scene,
      updatedAt: board.updatedAt || 0,
      createdAt: board.createdAt || 0,
      onboardingDismissedAt: board.onboardingDismissedAt ?? null,
    },
  }
})

app.patch("/api/boards/:boardId", { preHandler: requireAuth }, async (req: any, reply) => {
  const user = (req as AuthedRequest).user
  const boardId = String(req.params.boardId || "")
  if (!boardId) return reply.status(400).send({ ok: false, error: "bad_request", message: "boardId required" })

  let body: { onboardingDismissedAt?: number; name?: string }
  try {
    body = z
      .object({
        onboardingDismissedAt: z.number().int().positive().optional(),
        name: z.string().min(1).max(200).optional(),
      })
      .parse(req.body ?? {})
  } catch {
    return reply.status(400).send({ ok: false, error: "bad_request", message: "Invalid body" })
  }

  const { board, allowed } = await getBoardAndAssertAccess({ boardId, uid: user.uid })
  if (!board) return reply.send({ ok: true })
  if (!allowed) return reply.forbidden()

  const now = Date.now()
  const update: Record<string, unknown> = { updatedAt: now }
  if (typeof body.onboardingDismissedAt === "number") update.onboardingDismissedAt = body.onboardingDismissedAt
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim()
  await getDb().collection("boards").doc(boardId).set(update, { merge: true })

  return { ok: true }
})

const putSceneBodySchema = z.object({
  scene: z
    .object({
      elements: z.array(z.any()).default([]),
      appState: z.record(z.any()).optional().default({}),
      files: z.record(z.any()).optional().default({}),
    })
    .passthrough()
    .optional()
    .default({}),
})

app.put("/api/boards/:boardId/scene", { preHandler: requireAuth }, async (req: any, reply) => {
  const user = (req as AuthedRequest).user
  const boardId = String(req.params.boardId || "")
  if (!boardId) return reply.notFound()

  let body: z.infer<typeof putSceneBodySchema>
  try {
    body = putSceneBodySchema.parse(req.body ?? {})
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return reply.status(400).send({
        ok: false,
        error: "bad_request",
        ...(isDev ? { message: err?.message || "Invalid scene payload" } : {}),
      })
    }
    throw err
  }

  try {
    const { board, allowed } = await getBoardAndAssertAccess({ boardId, uid: user.uid })
    if (!board) return reply.notFound()
    if (!allowed) return reply.forbidden()

    // Normalize to a plain JSON-serializable object (strip undefined, NaN, etc.) so Firestore never sees invalid types.
    let scene: any
    try {
      scene = JSON.parse(JSON.stringify(body.scene))
    } catch (_) {
      return reply.status(400).send({ ok: false, error: "bad_request", message: "Scene is not serializable" })
    }

    const now = Date.now()
    const db = getDb()
    await writeBoardScene(db, boardId, scene, now)
    return { ok: true, updatedAt: now }
  } catch (err: any) {
    const sceneBytes = Buffer.byteLength(JSON.stringify(body?.scene ?? {}), "utf8")
    req.log.error(
      { err, boardId, sceneBytes, message: err?.message },
      "PUT /api/boards/:boardId/scene failed"
    )
    throw err
  }
})

app.post("/api/boards/:boardId/duplicate", { preHandler: requireAuth }, async (req: any, reply) => {
  const user = (req as AuthedRequest).user
  const boardId = String(req.params.boardId || "")
  if (!boardId) return reply.notFound()

  const body = z
    .object({
      name: z.string().min(1).max(120),
      workspaceId: z.string().min(1).optional(),
      scene: z
        .object({
          elements: z.array(z.any()),
          appState: z.record(z.any()),
          files: z.record(z.any()),
        })
        .passthrough()
        .optional(),
    })
    .parse(req.body)

  const db = getDb()

  // Must be able to read the source board to duplicate it.
  const { board, allowed } = await getBoardAndAssertAccess({ boardId, uid: user.uid })
  if (!board) return reply.notFound()
  if (!allowed) return reply.forbidden()

  // Destination workspace: default to user's personal workspace unless an owned workspace is specified.
  const personal = await ensurePersonalWorkspace(user.uid, user.name || undefined)
  const destWorkspaceId = body.workspaceId || String(personal.workspaceId)

  const wsSnap = await db.collection("workspaces").doc(destWorkspaceId).get()
  if (!wsSnap.exists) return reply.notFound()
  if (String((wsSnap.data() as any).ownerId || "") !== user.uid) return reply.forbidden()

  const sourceScene = body.scene || (await readBoardScene(db, boardId, board)) || {
    elements: [],
    appState: { viewBackgroundColor: "#ffffff" },
    files: {},
  }

  const newBoardId = `b_${crypto.randomUUID()}`
  const now = Date.now()
  await db
    .collection("boards")
    .doc(newBoardId)
    .set({
      boardId: newBoardId,
      workspaceId: destWorkspaceId,
      name: body.name,
      ownerId: user.uid,
      collaboratorIds: [],
      collaboratorEmails: [],
      duplicatedFromBoardId: boardId,
      updatedAt: now,
      createdAt: now,
    })

  await writeBoardScene(db, newBoardId, sourceScene, now)

  return { boardId: newBoardId }
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

  // In-app notification (no email is sent).
  await upsertUserNotification({
    toUid: target.uid,
    notificationId: `board_shared_${boardId}`,
    data: {
      kind: "board_shared",
      boardId,
      boardName: String(board?.name || "Board"),
      fromUid: user.uid,
      fromEmail: user.email || null,
      fromName: user.name || null,
      createdAt: now,
      readAt: null,
      updatedAt: now,
    },
  })

  return { ok: true }
})

app.get("/api/boards/shared-with-me", { preHandler: requireAuth }, async (req: any) => {
  const user = (req as AuthedRequest).user
  const db = getDb()

  const q = await db.collection("boards").where("collaboratorIds", "array-contains", user.uid).get()
  const boards = q.docs
    .map((d) => d.data() as any)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .map((b) => ({
      boardId: b.boardId,
      name: b.name,
      updatedAt: b.updatedAt || 0,
      ownerId: b.ownerId || null,
      workspaceId: b.workspaceId || null,
    }))

  return { boards }
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
        const db = getDb()
        const scene = await readBoardScene(db, boardId, board)
        ws.send(JSON.stringify({ type: "scene:sync", scene }))
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
      let jsonSize = 0
      try {
        jsonSize = Buffer.byteLength(JSON.stringify(scene), "utf8")
        if (jsonSize > SCENE_WS_ACCEPT_LIMIT_BYTES) return
      } catch {
        return
      }

      // Large scenes (common with pencil/freehand) are expensive to persist on every WS tick
      // because chunking rewrites many docs. For these, rely on the client's HTTP autosave.
      if (jsonSize > SCENE_INLINE_LIMIT_BYTES) return

      try {
        const db = getDb()
        await writeBoardScene(db, ctx.boardId, scene, now)
      } catch {
        // ignore write errors; still broadcast best-effort
      }

      // Avoid broadcasting very large scenes; persistence still happens via chunking/HTTP.
      if (jsonSize <= SCENE_INLINE_LIMIT_BYTES) {
        broadcast(ctx.boardId, { type: "scene:update", scene, from: ctx.uid, ts: now }, ws)
      }
    }
  })
})

const port = Number(process.env.PORT || 3001)
const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1")
await app.listen({ port, host })

