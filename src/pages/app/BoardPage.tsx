import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Excalidraw } from "@excalidraw/excalidraw"
import "@excalidraw/excalidraw/index.css"
import { getWsUrl, useApi } from "../../lib/api"
import { useAuth } from "../../auth/AuthProvider"

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null
}

/** Bounding box of elements in scene coordinates for viewport fit. */
function getElementsBoundingBox(elements: any[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (!elements?.length) return null
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (const el of elements) {
    if (!el) continue
    if (Array.isArray(el.points) && el.points.length > 0) {
      for (const p of el.points) {
        const x = el.x + (p?.[0] ?? 0),
          y = el.y + (p?.[1] ?? 0)
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
    } else {
      const x = Number(el.x) || 0,
        y = Number(el.y) || 0,
        w = Number(el.width) || 0,
        h = Number(el.height) || 0
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x + w)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y + h)
    }
  }
  if (minX === Infinity) return null
  return { minX, minY, maxX, maxY }
}

function toColorInputValue(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback
  // <input type="color"> only accepts #rrggbb.
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value
  return fallback
}

const ICON_CLASS = "h-6 w-6"
const ICON_CLASS_LG = "h-7 w-7"

function AiSparklesIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON_CLASS} aria-hidden>
      <path
        d="M12 3l1.2 3.6L17 8l-3.8 1.4L12 13l-1.2-3.6L7 8l3.8-1.4L12 3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M18 12l.8 2.4L21 15l-2.2.6L18 18l-.8-2.4L15 15l2.2-.6L18 12z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 13l.6 1.8 1.9.5-1.9.5-.6 1.8-.6-1.8-1.9-.5 1.9-.5.6-1.8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON_CLASS} aria-hidden>
      <path
        d="M15 8a3 3 0 10-2.8-4H12a3 3 0 003 3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 14.5l10.2-5.2M6.5 9.5l10.2 5.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18 21a3 3 0 10-2.8-4H15a3 3 0 003 3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 12a3 3 0 10-2.8-4H3a3 3 0 003 3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON_CLASS} aria-hidden>
      <path
        d="M5 4h11l3 3v13H5V4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8 4v6h8V4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8 20v-7h8v7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON_CLASS} aria-hidden>
      <path
        d="M8 8h11v13H8V8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M5 16H4a1 1 0 01-1-1V4a1 1 0 011-1h11a1 1 0 011 1v1"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function AlignIcon({
  align,
}: {
  align: "left" | "center" | "right"
}) {
  const lines = [
    { y: 7, len: 8 },
    { y: 12, len: 12 },
    { y: 17, len: 16 },
  ]
  const endX = 20
  const startX = 4
  const centered = (len: number) => {
    const cx = 12
    return { x1: cx - len / 2, x2: cx + len / 2 }
  }
  const left = (len: number) => ({ x1: startX, x2: startX + len })
  const right = (len: number) => ({ x1: endX - len, x2: endX })

  const calc = align === "left" ? left : align === "right" ? right : centered

  return (
    <svg viewBox="0 0 24 24" className={ICON_CLASS} aria-hidden>
      {lines.map((l) => {
        const { x1, x2 } = calc(l.len)
        return (
          <line
            key={l.y}
            x1={x1}
            y1={l.y}
            x2={x2}
            y2={l.y}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )
      })}
    </svg>
  )
}

function CursorIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON_CLASS} aria-hidden>
      <path
        d="M4 3l7.4 17.2 2-6 6-2L4 3z"
        fill="#ffffff"
        stroke="#0f172a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TextBoxIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON_CLASS} aria-hidden>
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 8.5h7M12 8.5v10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function HighlighterIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON_CLASS} aria-hidden>
      <path
        d="M8 3h8l2 2v7l-6 6H8l-2-2V5l2-2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M7 21h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 12h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function PencilEraserIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON_CLASS} aria-hidden>
      <path
        d="M6 16l7-7a2.5 2.5 0 013.5 0l1.5 1.5a2.5 2.5 0 010 3.5l-5 5H9l-3-3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 21h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 9l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 16l3 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ShapesIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON_CLASS} aria-hidden>
      <rect
        x="3.5"
        y="13.5"
        width="7"
        height="7"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="17.5" cy="17.5" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 4l5 8H7l5-8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON_CLASS} aria-hidden>
      <path
        d="M9 7v10a3 3 0 006 0V7a2 2 0 10-4 0v9a1 1 0 002 0V8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON_CLASS_LG} aria-hidden>
      <path
        d="M9 3h6v11l-3 7-3-7V3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 3v18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path
        d="M9 14h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  )
}

function randId() {
  try {
    const c: any = globalThis.crypto as any
    if (c?.randomUUID) return c.randomUUID()
  } catch {
    // ignore
  }
  return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

function randInt31() {
  return Math.floor(Math.random() * 2 ** 31)
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
}

function makeBaseElement(
  type: string,
  opts: {
    x: number
    y: number
    width: number
    height: number
    angle?: number
    strokeColor?: string
    backgroundColor?: string
    fillStyle?: "solid" | "hachure" | "cross-hatch"
    strokeWidth?: number
    strokeStyle?: "solid" | "dashed" | "dotted"
    roughness?: number
    opacity?: number
    roundness?: null | { type: number }
  }
) {
  const now = Date.now()
  return {
    id: randId(),
    type,
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    angle: opts.angle ?? 0,
    strokeColor: opts.strokeColor ?? "#1f2937",
    backgroundColor: opts.backgroundColor ?? "transparent",
    fillStyle: opts.fillStyle ?? "solid",
    strokeWidth: opts.strokeWidth ?? 2,
    strokeStyle: opts.strokeStyle ?? "solid",
    roughness: opts.roughness ?? 1,
    opacity: opts.opacity ?? 100,
    groupIds: [],
    frameId: null,
    roundness: opts.roundness ?? null,
    seed: randInt31(),
    version: 1,
    versionNonce: randInt31(),
    isDeleted: false,
    boundElements: null,
    updated: now,
    link: null,
    locked: false,
  }
}

function makeTextElement(opts: {
  x: number
  y: number
  text: string
  width: number
  height: number
  strokeColor?: string
  fontFamily?: number
  fontSize?: number
  textAlign?: "left" | "center" | "right"
  verticalAlign?: "top" | "middle" | "bottom"
  opacity?: number
  autoResize?: boolean
}) {
  const base: any = makeBaseElement("text", {
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    strokeColor: opts.strokeColor ?? "#0f172a",
    backgroundColor: "transparent",
    opacity: opts.opacity ?? 100,
  })
  const fontSize = opts.fontSize ?? 20
  return {
    ...base,
    text: opts.text,
    originalText: opts.text,
    fontSize,
    fontFamily: opts.fontFamily ?? 1,
    textAlign: opts.textAlign ?? "left",
    verticalAlign: opts.verticalAlign ?? "top",
    baseline: Math.max(1, Math.round(fontSize * 0.9)),
    lineHeight: 1.25,
    containerId: null,
    autoResize: opts.autoResize !== false,
  }
}

/** Stable hash of string to number for layout variant selection (no randomness). */
function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function inferTemplateKind(prompt: string): "retro" | "kanban" | "brainstorm" | "diagram" | "kickoff" {
  const p = prompt.toLowerCase().trim()
  if (/(retro|retrospective|post[- ]mortem|postmortem|went well|to improve)/.test(p)) return "retro"
  if (/(kanban|to do|todo|doing|done|backlog|board|columns?|pipeline)/.test(p)) return "kanban"
  if (/(brainstorm|ideation|ideas|mind map|mindmap|sticky|notes?)/.test(p)) return "brainstorm"
  if (/(diagram|architecture|sequence|flow|system design|technical spec|uml)/.test(p)) return "diagram"
  if (/(sprint|planning|standup|meeting|workshop|kickoff|project|agenda|goals?|scope)/.test(p)) return "kickoff"
  return "kickoff"
}

const GENERIC_TITLES = new Set([
  "brainstorm",
  "ideas",
  "kanban",
  "retro",
  "retrospective",
  "project kickoff",
  "kickoff",
  "workshop",
  "board",
])

const MAX_TITLE_WORDS = 7
const MAX_TITLE_CHARS = 48

/** Return true if s is a valid outcome-focused title (not generic, 3–7 words). */
function isValidSpecTitle(s: string): boolean {
  const t = s.trim()
  if (t.length < 3) return false
  const lower = t.toLowerCase()
  if (GENERIC_TITLES.has(lower)) return false
  const words = t.split(/\s+/).filter(Boolean)
  return words.length >= 3 && words.length <= MAX_TITLE_WORDS
}

/** Cap title to 3–7 words and max chars; never return raw prompt. */
function capTitleWordsAndChars(raw: string): string {
  const words = raw.trim().split(/\s+/).filter(Boolean).slice(0, MAX_TITLE_WORDS)
  let out = words.join(" ")
  if (out.length > MAX_TITLE_CHARS) out = out.slice(0, MAX_TITLE_CHARS - 1).trim().replace(/\s+\S*$/, "") || out.slice(0, MAX_TITLE_CHARS)
  return out || "New board"
}

/** First letter of each word uppercase for scannable titles. */
function titleCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ")
}

/**
 * Derive a short (3–7 word) outcome-focused board title from spec or prompt.
 * Never use the raw user prompt as the title. Describe purpose/outcome, not instructions.
 */
function deriveShortTitle(prompt: string, spec: any): string {
  const fromSpec = typeof spec?.title === "string" && spec.title.trim()
  if (fromSpec && isValidSpecTitle(spec.title)) return capTitleWordsAndChars(spec.title.trim())

  const p = prompt.trim()
  const lower = p.toLowerCase()
  if (!p) return "New board"

  // Pattern: "... for [a] [topic]" or "... for [topic]" → use topic + outcome type
  const forMatch = lower.match(/\bfor\s+(?:a\s+|the\s+)?([^.,]+?)(?:\s+with\s+|\s*$)/)
  const topic = forMatch ? forMatch[1].trim().replace(/\s+/g, " ").split(/\s+/).slice(0, 4) : []

  // Outcome-type phrases (order matters: longer first); apply titleCase for human-readable titles
  if (/\bsprint\s+planning\b/.test(lower)) return titleCase(capTitleWordsAndChars([...topic.slice(0, 2), "Sprint", "Plan"].filter(Boolean).join(" ") || "Sprint planning"))
  if (/\b(retro|retrospective|post[- ]?mortem)\b/.test(lower)) return titleCase(capTitleWordsAndChars([...topic.slice(0, 2), "Retro"].filter(Boolean).join(" ") || "Retrospective"))
  if (/\bbrainstorm\b/.test(lower)) return titleCase(capTitleWordsAndChars([...topic.slice(0, 2), "Brainstorm"].filter(Boolean).join(" ") || "Brainstorm"))
  if (/\b(product\s+)?launch\b/.test(lower)) return titleCase(capTitleWordsAndChars([...topic.slice(0, 2), "Launch"].filter(Boolean).join(" ") || "Launch planning"))
  if (/\bmarketing\s+ideas\b/.test(lower)) return titleCase(capTitleWordsAndChars([...topic.slice(0, 2), "Marketing", "Brainstorm"].filter(Boolean).join(" ") || "Marketing brainstorm"))
  if (/\bkanban\b/.test(lower)) return titleCase(capTitleWordsAndChars([...topic.slice(0, 2), "Board"].filter(Boolean).join(" ") || "Kanban board"))
  if (/\bkickoff\b/.test(lower)) return titleCase(capTitleWordsAndChars([...topic.slice(0, 2), "Kickoff"].filter(Boolean).join(" ") || "Project kickoff"))
  if (/\b(architecture|sequence|flow)\s+diagram\b/.test(lower)) return titleCase(capTitleWordsAndChars([...topic.slice(0, 2), "Diagram"].filter(Boolean).join(" ") || "Diagram"))

  // Fallback: use topic if we have "for X"; otherwise first 3–7 meaningful words (not instructional)
  const stop = new Set(["create", "make", "build", "add", "give", "need", "want", "a", "an", "the", "for", "with", "and", "or", "to", "in", "on", "of", "we", "i", "my", "our", "board"])
  const words = p.split(/\s+/).filter((w) => w.length > 1 && !stop.has(w.toLowerCase()))
  if (topic.length > 0) return titleCase(capTitleWordsAndChars(topic.slice(0, 3).join(" ")))
  if (words.length > 0) return titleCase(capTitleWordsAndChars(words.slice(0, MAX_TITLE_WORDS).join(" ")))
  return titleCase(capTitleWordsAndChars(p.split(/\s+/).slice(0, 5).join(" ")))
}

/** Max content width so template fits viewport with padding (fit uses 80px padding). */
const TEMPLATE_CONTENT_WIDTH = 1100
/** Title width constrained so title is always visible at default zoom; no horizontal overflow. */
const TEMPLATE_TITLE_WIDTH = 640
const TITLE_FONT_SIZE_DEFAULT = 28
const TITLE_FONT_SIZE_SMALL = 20
/** Max chars to display in title box at default font so it never overflows or clips. */
const MAX_TITLE_DISPLAY_CHARS = 34

/** Prepare title for rendering: truncate with ellipsis if needed, choose font size so it fits. */
function prepareTitleForDisplay(title: string): { text: string; fontSize: number } {
  const t = title.trim()
  if (t.length <= MAX_TITLE_DISPLAY_CHARS) return { text: t, fontSize: TITLE_FONT_SIZE_DEFAULT }
  const truncated = t.slice(0, MAX_TITLE_DISPLAY_CHARS - 1).trim().replace(/\s+\S*$/, "") || t.slice(0, MAX_TITLE_DISPLAY_CHARS - 1)
  const text = (truncated + "…").slice(0, MAX_TITLE_DISPLAY_CHARS + 1)
  const fontSize = t.length > 28 ? TITLE_FONT_SIZE_SMALL : TITLE_FONT_SIZE_DEFAULT
  return { text, fontSize }
}

const LAYOUT_VARIANT_COUNT = 4

/** Parse previous layout tag "kind:variant" to avoid reusing same layout on consecutive generations. */
function parsePreviousLayoutType(previous: string | undefined): { kind: string; variant: number } | null {
  if (!previous || typeof previous !== "string") return null
  const i = previous.indexOf(":")
  if (i <= 0 || i === previous.length - 1) return null
  const k = previous.slice(0, i).trim()
  const v = parseInt(previous.slice(i + 1), 10)
  if (k === "" || !Number.isInteger(v) || v < 0) return null
  return { kind: k, variant: v }
}

function generateTemplateElements(args: {
  prompt: string
  centerX: number
  centerY: number
  spec?: any
  previousLayoutType?: string
}): { elements: any[]; layoutType: string; generationStrategy: string } {
  const kind = (args.spec?.kind || inferTemplateKind(args.prompt)) as "retro" | "kanban" | "brainstorm" | "diagram" | "kickoff"
  const elements: any[] = []
  const cx = args.centerX
  const cy = args.centerY
  let layoutVariant = hashString(args.prompt.trim() || kind) % LAYOUT_VARIANT_COUNT
  const prev = parsePreviousLayoutType(args.previousLayoutType)
  if (prev && prev.kind === kind && prev.variant === layoutVariant) {
    layoutVariant = (layoutVariant + 1) % LAYOUT_VARIANT_COUNT
  }
  const generationStrategy = args.previousLayoutType ? "avoid_consecutive" : "hash_prompt"

  const boardTitle = deriveShortTitle(args.prompt, args.spec)
  const { text: titleText, fontSize: titleFontSize } = prepareTitleForDisplay(boardTitle)

  elements.push(
    makeTextElement({
      x: cx - TEMPLATE_TITLE_WIDTH / 2,
      y: cy - 340,
      width: TEMPLATE_TITLE_WIDTH,
      height: 44,
      text: titleText,
      fontFamily: 2,
      fontSize: titleFontSize,
      textAlign: "center",
      strokeColor: "#0f172a",
      autoResize: false,
    })
  )

  if (kind === "kanban") {
    const numColsVariant = [2, 3, 4, 3][layoutVariant % 4]
    const colCount = Array.isArray(args.spec?.columns) && args.spec?.kind === "kanban"
      ? Math.max(2, Math.min(5, (args.spec.columns as any[]).length))
      : numColsVariant
    const totalW = TEMPLATE_CONTENT_WIDTH - 80
    const gap = 20
    const colW = (totalW - gap * (colCount - 1)) / colCount
    const colH = 420
    const boardX = cx - totalW / 2
    const boardY = cy - 260

    const cols: Array<{ title: string; cards: string[]; color?: string }> =
      Array.isArray(args.spec?.columns) && args.spec?.kind === "kanban"
        ? (args.spec.columns as any[]).slice(0, colCount).map((c: any) => ({
            title: String(c?.title || "Column"),
            cards: Array.isArray(c?.cards) ? c.cards.map((s: any) => String(s)).filter(Boolean) : [],
            color: isHexColor(c?.color) ? c.color : undefined,
          }))
        : [
            { title: "To do", cards: ["New task", "Review & prioritize", "Break down if needed"] },
            { title: "Doing", cards: ["In progress", "Blocked? Add note", "Update status"] },
            ...(colCount >= 3 ? [{ title: "Done", cards: ["Completed", "Validated", "Archived"] }] : []),
            ...(colCount >= 4 ? [{ title: "Backlog", cards: ["Future item", "Idea", "Maybe later"] }] : []),
          ].slice(0, colCount)

    cols.forEach((label, i) => {
      const x = boardX + i * (colW + gap)
      const y = boardY
      elements.push(
        makeBaseElement("rectangle", {
          x,
          y,
          width: colW,
          height: colH,
          strokeColor: "#cbd5e1",
          backgroundColor: "#ffffff",
          roundness: { type: 3 },
          roughness: 0,
        })
      )
      elements.push(
        makeTextElement({
          x: x + 14,
          y: y + 14,
          width: colW - 28,
          height: 26,
          text: label.title,
          fontFamily: 2,
          fontSize: 18,
          strokeColor: "#0f172a",
        })
      )
      const stickyBg = label.color || "#FEF08A"
      const stickyStroke = label.color || "#EAB308"
      const cards = label.cards.length ? label.cards.slice(0, 5) : ["Task 1", "Task 2", "Task 3"]
      const cardH = 68
      cards.forEach((text, n) => {
        const sy = y + 52 + n * (cardH + 10)
        elements.push(
          makeBaseElement("rectangle", {
            x: x + 14,
            y: sy,
            width: colW - 28,
            height: cardH,
            strokeColor: stickyStroke,
            backgroundColor: stickyBg,
            roundness: { type: 3 },
            roughness: 0,
          })
        )
        elements.push(
          makeTextElement({
            x: x + 22,
            y: sy + 12,
            width: colW - 44,
            height: 44,
            text,
            fontFamily: 2,
            fontSize: 14,
            strokeColor: "#0f172a",
          })
        )
      })
    })
  } else if (kind === "retro") {
    const numColsVariant = [2, 3, 4, 3][layoutVariant % 4]
    const colCount = Array.isArray(args.spec?.columns) && args.spec?.kind === "retro"
      ? Math.max(2, Math.min(4, (args.spec.columns as any[]).length))
      : numColsVariant
    const totalW = TEMPLATE_CONTENT_WIDTH - 80
    const gap = 20
    const colW = (totalW - gap * (colCount - 1)) / colCount
    const colH = 380
    const boardX = cx - totalW / 2
    const boardY = cy - 260

    const cols: Array<{ title: string; cards: string[]; color?: string }> =
      Array.isArray(args.spec?.columns) && args.spec?.kind === "retro"
        ? (args.spec.columns as any[]).slice(0, colCount).map((c: any) => ({
            title: String(c?.title || "Column"),
            cards: Array.isArray(c?.cards) ? c.cards.map((s: any) => String(s)).filter(Boolean) : [],
            color: isHexColor(c?.color) ? c.color : undefined,
          }))
        : colCount === 2
          ? [
              { title: "Went well", cards: ["Smooth delivery", "Good collaboration", "Clear scope"] },
              { title: "To improve", cards: ["Timeline slip", "Communication", "Next time we…"] },
            ]
          : [
              { title: "Went well", cards: ["Win 1", "Win 2", "Win 3"] },
              { title: "To improve", cards: ["Improvement 1", "Improvement 2"] },
              { title: "Action items", cards: ["Owner + due date", "Follow-up"] },
              ...(colCount >= 4 ? [{ title: "Kudos", cards: ["Shout-out", "Thank you"] }] : []),
            ].slice(0, colCount)

    cols.forEach((label, i) => {
      const x = boardX + i * (colW + gap)
      const y = boardY
      elements.push(
        makeBaseElement("rectangle", {
          x,
          y,
          width: colW,
          height: colH,
          strokeColor: "#cbd5e1",
          backgroundColor: "#ffffff",
          roundness: { type: 3 },
          roughness: 0,
        })
      )
      elements.push(
        makeTextElement({
          x: x + 14,
          y: y + 14,
          width: colW - 28,
          height: 26,
          text: label.title,
          fontFamily: 2,
          fontSize: 18,
          strokeColor: "#0f172a",
        })
      )
      const fallbackBg = i === 0 ? "#BBF7D0" : i === 1 ? "#FED7AA" : i === 2 ? "#DBEAFE" : "#E9D5FF"
      const fallbackStroke = i === 0 ? "#22C55E" : i === 1 ? "#F97316" : i === 2 ? "#3B82F6" : "#A855F7"
      const stickyBg = label.color || fallbackBg
      const stickyStroke = label.color || fallbackStroke
      const cards = label.cards.length ? label.cards.slice(0, 8) : ["Note 1", "Note 2", "Note 3"]
      const cardH = 58
      cards.forEach((text, n) => {
        const sy = y + 50 + n * (cardH + 8)
        elements.push(
          makeBaseElement("rectangle", {
            x: x + 14,
            y: sy,
            width: colW - 28,
            height: cardH,
            strokeColor: stickyStroke,
            backgroundColor: stickyBg,
            roundness: { type: 3 },
            roughness: 0,
          })
        )
        elements.push(
          makeTextElement({
            x: x + 22,
            y: sy + 10,
            width: colW - 44,
            height: 38,
            text,
            fontFamily: 2,
            fontSize: 14,
            strokeColor: "#0f172a",
          })
        )
      })
    })
  } else if (kind === "brainstorm") {
    const areaW = TEMPLATE_CONTENT_WIDTH - 60
    const areaH = 380
    const areaX = cx - areaW / 2
    const areaY = cy - 260
    elements.push(
      makeBaseElement("rectangle", {
        x: areaX,
        y: areaY,
        width: areaW,
        height: areaH,
        strokeColor: "#cbd5e1",
        backgroundColor: "#ffffff",
        roundness: { type: 3 },
        roughness: 0,
      })
    )

    const prompts: string[] =
      Array.isArray(args.spec?.prompts) && args.spec?.kind === "brainstorm"
        ? (args.spec.prompts as any[]).map((s: any) => String(s)).filter(Boolean)
        : (() => {
            const words = args.prompt.trim().split(/\s+/).filter((w) => w.length > 2).slice(0, 6)
            const base = words.length ? words : ["Topic"]
            return base.map((_, i) => (i === 0 ? `Angle: ${base[0]}` : `Angle ${i + 1}`)).concat(
              ["Another angle", "Alternative", "Option", "Variant", "Different view"].slice(0, 8 - base.length)
            ).slice(0, 12)
          })()

    const gridLayouts: [number, number][] = [[3, 4], [4, 3], [2, 5], [3, 3]]
    const [cols, rows] = gridLayouts[layoutVariant % gridLayouts.length]
    const count = Math.min(cols * rows, prompts.length)
    const cardW = 200
    const cardH = 96
    const gx = 16
    const gy = 16
    const innerW = cols * cardW + (cols - 1) * gx
    const innerH = rows * cardH + (rows - 1) * gy
    const startX = areaX + (areaW - innerW) / 2
    const startY = areaY + 50

    const colors: [string, string][] = [
      ["#FEF08A", "#EAB308"],
      ["#BBF7D0", "#22C55E"],
      ["#DBEAFE", "#3B82F6"],
      ["#FED7AA", "#F97316"],
    ]
    for (let i = 0; i < count; i++) {
      const c = i % cols
      const r = Math.floor(i / cols)
      const [bg, stroke] = colors[i % colors.length]
      const x = startX + c * (cardW + gx)
      const y = startY + r * (cardH + gy)
      const text = prompts[i] || `Point ${i + 1}`
      elements.push(
        makeBaseElement("rectangle", {
          x,
          y,
          width: cardW,
          height: cardH,
          strokeColor: stroke,
          backgroundColor: bg,
          roundness: { type: 3 },
          roughness: 0,
        })
      )
      elements.push(
        makeTextElement({
          x: x + 12,
          y: y + 12,
          width: cardW - 24,
          height: cardH - 24,
          text,
          fontFamily: 2,
          fontSize: 15,
          strokeColor: "#0f172a",
        })
      )
    }
  } else if (kind === "diagram") {
    const totalW = TEMPLATE_CONTENT_WIDTH - 80
    const boardX = cx - totalW / 2
    const boardY = cy - 260
    const sectionW = totalW / 3 - 16
    const sectionH = 140
    const sections: Array<{ title: string; hint: string }> =
      Array.isArray(args.spec?.sections) && (args.spec?.kind === "kickoff" || args.spec?.kind === "diagram")
        ? (args.spec.sections as any[]).slice(0, 6).map((s: any) => ({
            title: String(s?.title || "Component"),
            hint: String(s?.hint ?? ""),
          }))
        : [
            { title: "Input / Trigger", hint: "Entry point" },
            { title: "Process", hint: "Main logic" },
            { title: "Output", hint: "Result" },
            { title: "Storage", hint: "Data layer" },
            { title: "External API", hint: "Integration" },
            { title: "Notes", hint: "Assumptions, constraints" },
          ]
    sections.forEach((sec, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = boardX + col * (sectionW + 12)
      const y = boardY + row * (sectionH + 12)
      elements.push(
        makeBaseElement("rectangle", {
          x,
          y,
          width: sectionW,
          height: sectionH,
          strokeColor: "#94a3b8",
          backgroundColor: "#f8fafc",
          roundness: { type: 2 },
          roughness: 0,
        })
      )
      elements.push(
        makeTextElement({
          x: x + 12,
          y: y + 12,
          width: sectionW - 24,
          height: 24,
          text: sec.title,
          fontFamily: 2,
          fontSize: 16,
          strokeColor: "#0f172a",
        })
      )
      if (sec.hint) {
        elements.push(
          makeTextElement({
            x: x + 12,
            y: y + 42,
            width: sectionW - 24,
            height: sectionH - 54,
            text: sec.hint,
            fontFamily: 2,
            fontSize: 13,
            strokeColor: "#64748b",
          })
        )
      }
    })
  } else {
    // Kickoff / workshop: layout variants (2-col, 3-col, single column)
    const colCount = [2, 3, 2, 3][layoutVariant % 4]
    const totalW = TEMPLATE_CONTENT_WIDTH - 80
    const gap = 20
    const cardW = (totalW - gap * (colCount - 1)) / colCount
    const cardH = 120
    const x0 = cx - totalW / 2
    const y0 = cy - 260

    const cards: Array<{ title: string; hint: string }> =
      Array.isArray(args.spec?.sections) && args.spec?.kind === "kickoff"
        ? (args.spec.sections as any[])
            .map((s: any) => ({ title: String(s?.title || "Section"), hint: String(s?.hint || "") }))
            .filter((s) => Boolean(s.title))
            .slice(0, 8)
        : [
            { title: "Goal", hint: "What are we trying to achieve?" },
            { title: "Audience", hint: "Who is this for?" },
            { title: "Scope", hint: "In / out of scope" },
            { title: "Constraints", hint: "Time, budget, tech" },
            { title: "Risks", hint: "What could block us?" },
            { title: "Next actions", hint: "Owners + due dates" },
          ]
    cards.forEach((c, i) => {
      const col = i % colCount
      const row = Math.floor(i / colCount)
      const x = x0 + col * (cardW + gap)
      const y = y0 + row * (cardH + 16)
      elements.push(
        makeBaseElement("rectangle", {
          x,
          y,
          width: cardW,
          height: cardH,
          strokeColor: "#cbd5e1",
          backgroundColor: "#ffffff",
          roundness: { type: 3 },
          roughness: 0,
        })
      )
      elements.push(
        makeTextElement({
          x: x + 14,
          y: y + 14,
          width: cardW - 28,
          height: 24,
          text: c.title,
          fontFamily: 2,
          fontSize: 17,
          strokeColor: "#0f172a",
        })
      )
      elements.push(
        makeTextElement({
          x: x + 14,
          y: y + 44,
          width: cardW - 28,
          height: cardH - 58,
          text: c.hint,
          fontFamily: 2,
          fontSize: 14,
          strokeColor: "#64748b",
        })
      )
    })
  }

  const layoutType = `${kind}:${layoutVariant}`
  return { elements, layoutType, generationStrategy }
}

function sanitizeInitialData(raw: unknown) {
  if (!isRecord(raw)) return null
  const elements = Array.isArray(raw.elements) ? raw.elements : []
  const files = (isRecord(raw.files) ? raw.files : {}) as any
  const appStateRaw = isRecord(raw.appState) ? raw.appState : {}

  // Only keep JSON-safe subset. Excalidraw appState has non-serializable fields (e.g. collaborators: Map).
  const viewBackgroundColor =
    typeof appStateRaw.viewBackgroundColor === "string"
      ? appStateRaw.viewBackgroundColor
      : "#ffffff"

  const gridModeEnabled = Boolean(appStateRaw.gridModeEnabled)
  const zenModeEnabled = Boolean(appStateRaw.zenModeEnabled)
  const theme = typeof appStateRaw.theme === "string" ? appStateRaw.theme : undefined
  const __templateLayoutType = typeof appStateRaw.__templateLayoutType === "string" ? appStateRaw.__templateLayoutType : undefined
  const __templateGenerationStrategy = typeof appStateRaw.__templateGenerationStrategy === "string" ? appStateRaw.__templateGenerationStrategy : undefined

  const appState = {
    viewBackgroundColor,
    gridModeEnabled,
    zenModeEnabled,
    ...(theme ? { theme } : {}),
    ...(__templateLayoutType ? { __templateLayoutType } : {}),
    ...(__templateGenerationStrategy ? { __templateGenerationStrategy } : {}),
  }

  return { elements, files, appState }
}

export function BoardPage() {
  const { boardId } = useParams()
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const backendApi = useApi()
  const { token, user: authUser } = useAuth()

  const persistenceKey = useMemo(() => `board:${boardId || "unknown"}`, [boardId])

  const [initialData] = useState(() => {
    try {
      const raw = localStorage.getItem(persistenceKey)
      if (!raw) return null
      return sanitizeInitialData(JSON.parse(raw))
    } catch {
      return null
    }
  })

  const [gridModeEnabled, setGridModeEnabled] = useState<boolean>(() =>
    Boolean(initialData?.appState?.gridModeEnabled)
  )

  const apiRef = useRef<any>(null)
  const [shapesOpen, setShapesOpen] = useState(false)
  const [selectionInfo, setSelectionInfo] = useState<{
    kind: "none" | "text" | "shape" | "draw" | "image" | "mixed"
    count: number
    primary?: any
    selectedIds: string[]
  }>({ kind: "none", count: 0, selectedIds: [] })
  const [topMenuOpen, setTopMenuOpen] = useState<string | null>(null)
  const activeToolSigRef = useRef<string>("")
  const [activeToolType, setActiveToolType] = useState<string>("selection")
  const [freedrawMode, setFreedrawMode] = useState<"pencil" | "highlighter">("pencil")
  const zoomSigRef = useRef<string>("")
  const [zoomValue, setZoomValue] = useState<number>(1)
  const [zoomEditing, setZoomEditing] = useState(false)
  const [zoomDraft, setZoomDraft] = useState("")
  const zoomInputRef = useRef<HTMLInputElement | null>(null)
  const initialToolSetRef = useRef(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiNotice, setAiNotice] = useState<string | null>(null)
  const aiTextAreaRef = useRef<HTMLTextAreaElement | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState("")
  const [shareBusy, setShareBusy] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [shareNotice, setShareNotice] = useState<string | null>(null)
  const shareEmailRef = useRef<HTMLInputElement | null>(null)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [onboardingPrompt, setOnboardingPrompt] = useState("")
  const [onboardingBusy, setOnboardingBusy] = useState(false)
  const onboardingInputRef = useRef<HTMLInputElement | null>(null)
  const onboardingSubmitRef = useRef<HTMLButtonElement | null>(null)
  const [showTemplateReview, setShowTemplateReview] = useState(false)
  const templateBeforeRef = useRef<{ elements: any[]; appState: any } | null>(null)
  const selectionSigRef = useRef<string>("")
  const defaultsSigRef = useRef<string>("")
  const [defaults, setDefaults] = useState<{
    strokeColor: string
    backgroundColor: string
    opacity: number
    strokeWidth: number
    strokeStyle: string
    roughness: number
    fontFamily: number
    fontSize: number
    textAlign: "left" | "center" | "right"
    roundness: "sharp" | "round"
  }>({
    strokeColor: "#1f2937",
    backgroundColor: "#ffffff",
    opacity: 100,
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    fontFamily: 1,
    fontSize: 20,
    textAlign: "left",
    roundness: "sharp",
  })

  const latestRef = useRef<any>(
    initialData || {
      elements: [],
      files: {},
      appState: {
        viewBackgroundColor: "#ffffff",
        zenModeEnabled: false,
        gridModeEnabled: false,
      },
    }
  )

  const wsRef = useRef<WebSocket | null>(null)
  const wsAuthedRef = useRef(false)
  const applyingRemoteRef = useRef(false)
  const pendingSceneRef = useRef<any | null>(null)
  const pendingIncomingSceneRef = useRef<any | null>(null)
  const sendTimerRef = useRef<number | null>(null)
  const saveTimerRef = useRef<number | null>(null)
  const lastHttpSaveAtRef = useRef<number>(0)
  const [boardMeta, setBoardMeta] = useState<{ name: string; workspaceId: string; ownerId: string } | null>(null)
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const saveNoticeTimerRef = useRef<number | null>(null)
  const [saveAsOpen, setSaveAsOpen] = useState(false)
  const [saveAsName, setSaveAsName] = useState("")
  const [saveAsWorkspaceId, setSaveAsWorkspaceId] = useState("")
  const [saveAsWorkspaces, setSaveAsWorkspaces] = useState<{ workspaceId: string; name: string }[]>([])
  const [saveAsBusy, setSaveAsBusy] = useState(false)
  const [saveAsError, setSaveAsError] = useState<string | null>(null)
  const saveAsNameRef = useRef<HTMLInputElement | null>(null)

  const toSerializableAppState = useCallback(
    (appState: any) => {
      return {
        viewBackgroundColor: appState?.viewBackgroundColor ?? "#ffffff",
        zenModeEnabled: Boolean(appState?.zenModeEnabled),
        gridModeEnabled: Boolean(gridModeEnabled),
        ...(typeof appState?.theme === "string" ? { theme: appState.theme } : {}),
        ...(typeof appState?.__templateLayoutType === "string" ? { __templateLayoutType: appState.__templateLayoutType } : {}),
        ...(typeof appState?.__templateGenerationStrategy === "string" ? { __templateGenerationStrategy: appState.__templateGenerationStrategy } : {}),
      }
    },
    [gridModeEnabled]
  )

  const persist = useCallback(
    (next: any) => {
      latestRef.current = next
      try {
        localStorage.setItem(persistenceKey, JSON.stringify(next))
      } catch {
        // ignore
      }
    },
    [persistenceKey]
  )

  const queueSendScene = useCallback(
    (scene: any) => {
      pendingSceneRef.current = scene

      if (sendTimerRef.current) window.clearTimeout(sendTimerRef.current)
      sendTimerRef.current = window.setTimeout(() => {
        const ws = wsRef.current
        if (!ws || ws.readyState !== WebSocket.OPEN || !wsAuthedRef.current) return
        const s = pendingSceneRef.current
        if (!s) return
        try {
          ws.send(JSON.stringify({ type: "scene:update", scene: s }))
        } catch {
          // ignore
        }
      }, 350)
    },
    []
  )

  const queueSaveScene = useCallback(
    (scene: any) => {
      if (!boardId) return
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = window.setTimeout(async () => {
        const ws = wsRef.current
        const wsActive = Boolean(ws && ws.readyState === WebSocket.OPEN && wsAuthedRef.current)

        // Always autosave to the server. When websocket is active we normally throttle HTTP more,
        // but for large scenes (common with pencil/freehand) websocket persistence/broadcast may be
        // skipped or fail due to payload size, so keep HTTP saves frequent.
        const now = Date.now()
        let isLarge = false
        try {
          const bytes = new Blob([JSON.stringify(scene)]).size
          isLarge = bytes > 900_000
        } catch {
          // If we can't size it, treat as large to be safe.
          isLarge = true
        }

        const minIntervalMs = wsActive && !isLarge ? 10_000 : 1_200
        if (now - lastHttpSaveAtRef.current < minIntervalMs) return
        lastHttpSaveAtRef.current = now

        try {
          await backendApi.saveBoardScene(boardId, { scene })
        } catch {
          // ignore
        }
      }, 1200)
    },
    [backendApi, boardId]
  )

  useEffect(() => {
    if (!boardId || !token) return
    const onVisibility = () => {
      if (document.visibilityState !== "hidden") return
      const scene = latestRef.current
      if (!scene || typeof scene !== "object") return
      // Best-effort flush when tab is backgrounded.
      void backendApi.saveBoardScene(boardId, { scene }).catch(() => {})
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [backendApi, boardId, token])

  const initialDataForExcalidraw = useMemo(() => {
    return (
      initialData || {
        elements: [],
        files: {},
        appState: {
          viewBackgroundColor: "#ffffff",
          zenModeEnabled: false,
          gridModeEnabled: false,
        },
      }
    )
  }, [initialData])

  useEffect(() => {
    if (!boardId || !token) return

    // In React dev/StrictMode, effects may mount/unmount immediately to detect unsafe side effects.
    // If we open a WebSocket synchronously and then close it during cleanup before it connects,
    // browsers often log "WebSocket is closed before the connection is established."
    // Deferring creation by a tick avoids that noise and prevents accidental rapid reconnect loops.
    let ws: WebSocket | null = null
    let cancelled = false
    const flushToServer = () => {
      const scene = latestRef.current
      if (!scene || typeof scene !== "object") return
      void backendApi.saveBoardScene(boardId, { scene }).catch(() => {})
    }
    const t = window.setTimeout(() => {
      if (cancelled) return
      const wsUrl = `${getWsUrl()}/ws`
      ws = new WebSocket(wsUrl)
      wsRef.current = ws
      wsAuthedRef.current = false

      const close = () => {
        wsAuthedRef.current = false
        if (wsRef.current === ws) wsRef.current = null
        // If the websocket drops mid-edit, immediately flush the latest scene via HTTP
        // so freehand/pencil strokes don't get lost on reconnect/refresh.
        flushToServer()
      }

      ws.addEventListener("open", () => {
        try {
          ws?.send(JSON.stringify({ type: "auth", token, boardId }))
        } catch {
          // ignore
        }
      })

      ws.addEventListener("message", (evt) => {
        let msg: any
        try {
          msg = JSON.parse(String((evt as any).data || ""))
        } catch {
          return
        }

        if (msg?.type === "auth:ok") {
          wsAuthedRef.current = true
          return
        }

        if (msg?.type === "scene:sync" || msg?.type === "scene:update") {
          const scene = msg?.scene
          if (!scene || typeof scene !== "object") return
          const api = apiRef.current
          if (!api?.updateScene || !api?.getAppState) {
            pendingIncomingSceneRef.current = scene
            return
          }

          const current = api.getAppState()
          applyingRemoteRef.current = true
          try {
            api.updateScene({
              elements: (scene as any).elements || [],
              appState: {
                ...current,
                ...((scene as any).appState || {}),
                // Keep local viewport stable.
                scrollX: current.scrollX,
                scrollY: current.scrollY,
                zoom: current.zoom,
              },
            })
          } catch {
            // ignore
          } finally {
            window.setTimeout(() => {
              applyingRemoteRef.current = false
            }, 0)
          }
        }
      })

      ws.addEventListener("close", close)
      ws.addEventListener("error", close)
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(t)
      if (ws) {
        try {
          ws.close()
        } catch {
          // ignore
        }
      }
      wsAuthedRef.current = false
      if (wsRef.current === ws) wsRef.current = null
      flushToServer()
    }
  }, [backendApi, boardId, token])

  useEffect(() => {
    if (!boardId || !token) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await backendApi.getBoard(boardId)
        const b = res?.board
        if (!cancelled && b && typeof b === "object") {
          setBoardMeta({
            name: String((b as any).name || "Board"),
            workspaceId: String((b as any).workspaceId || ""),
            ownerId: String((b as any).ownerId || ""),
          })
          const dismissedAt = (b as any).onboardingDismissedAt
          if (dismissedAt == null || typeof dismissedAt !== "number") {
            setOnboardingOpen(true)
          }
        }
        const scene = res?.board?.scene
        if (!scene || typeof scene !== "object") return
        if (cancelled) return

        const api = apiRef.current
        if (!api?.updateScene || !api?.getAppState) {
          pendingIncomingSceneRef.current = scene
          return
        }

        const current = api.getAppState()
        applyingRemoteRef.current = true
        api.updateScene({
          elements: (scene as any).elements || [],
          appState: {
            ...current,
            ...((scene as any).appState || {}),
            scrollX: current.scrollX,
            scrollY: current.scrollY,
            zoom: current.zoom,
          },
        })
        window.setTimeout(() => {
          applyingRemoteRef.current = false
        }, 0)
      } catch {
        // ignore
      }
    })()

    return () => {
      cancelled = true
    }
  }, [backendApi, boardId, token])

  const saveNow = useCallback(async () => {
    if (!boardId) return
    const scene = latestRef.current
    if (!scene || typeof scene !== "object") return
    setSaveBusy(true)
    setSaveError(null)
    try {
      await backendApi.saveBoardScene(boardId, { scene })
      setSaveNotice("Saved.")
      if (saveNoticeTimerRef.current) window.clearTimeout(saveNoticeTimerRef.current)
      saveNoticeTimerRef.current = window.setTimeout(() => setSaveNotice(null), 2000)
    } catch (e: any) {
      setSaveError(e?.message || "Save failed")
      setSaveNotice(null)
    } finally {
      setSaveBusy(false)
    }
  }, [backendApi, boardId])

  useEffect(() => {
    return () => {
      if (saveNoticeTimerRef.current) window.clearTimeout(saveNoticeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!saveAsOpen) return
    setSaveAsError(null)
    setSaveAsBusy(false)
    const t = window.setTimeout(() => saveAsNameRef.current?.focus(), 0)

    const defaultName = boardMeta?.name ? `${boardMeta.name} (copy)` : "Untitled (copy)"
    setSaveAsName((v) => (v.trim() ? v : defaultName))
    const personalWsId = authUser?.userId ? `ws_${authUser.userId}` : ""
    if (personalWsId && !saveAsWorkspaceId) setSaveAsWorkspaceId(personalWsId)

    let alive = true
    ;(async () => {
      try {
        const res = await backendApi.listWorkspaces()
        if (!alive) return
        const ws = (res.workspaces || []).map((w: any) => ({
          workspaceId: String(w.workspaceId || ""),
          name: String(w.name || "Workspace"),
        }))
        setSaveAsWorkspaces(ws.filter((w) => w.workspaceId))
        if (!saveAsWorkspaceId) {
          const first = ws[0]?.workspaceId || personalWsId
          if (first) setSaveAsWorkspaceId(first)
        }
      } catch {
        // ignore; server defaults to personal workspace
      }
    })()

    return () => {
      alive = false
      window.clearTimeout(t)
    }
  }, [saveAsOpen, backendApi, boardMeta?.name, authUser?.userId])

  const uiOptions = useMemo(
    () => ({
      welcomeScreen: false,
      canvasActions: {
        loadScene: false,
        saveToActiveFile: false,
        clearCanvas: true,
        changeViewBackgroundColor: true,
        toggleTheme: true,
      },
    }),
    []
  )

  const iconBtnClass =
    "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface/90 text-sm font-semibold text-text-secondary shadow-sm backdrop-blur hover:bg-toolbar hover:text-text-primary active:translate-y-px transition duration-fast"
  const iconBtnActiveClass = "bg-toolbar text-text-primary"
  const pillBtnClass =
    "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-border bg-surface/90 px-3 text-sm font-semibold text-text-secondary shadow-sm backdrop-blur hover:bg-toolbar hover:text-text-primary active:translate-y-px transition duration-fast disabled:cursor-not-allowed disabled:opacity-50"
  const topIconBtnClass =
    "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface/85 text-base font-semibold text-text-secondary shadow-sm backdrop-blur hover:bg-toolbar hover:text-text-primary active:translate-y-px transition duration-fast"
  const dropdownClass =
    "absolute left-0 top-[calc(100%+10px)] z-50 min-w-64 rounded-2xl border border-border bg-surface p-3 shadow-lg"

  const dispatchKeyDown = (evt: {
    key: string
    shiftKey?: boolean
    altKey?: boolean
    ctrlKey?: boolean
    metaKey?: boolean
  }) => {
    // Excalidraw listens on document; make sure events bubble.
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: evt.key,
        shiftKey: Boolean(evt.shiftKey),
        altKey: Boolean(evt.altKey),
        ctrlKey: Boolean(evt.ctrlKey),
        metaKey: Boolean(evt.metaKey),
        bubbles: true,
        cancelable: true,
      })
    )
  }

  const sendUndo = () => {
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
    dispatchKeyDown({ key: "z", ...(isMac ? { metaKey: true } : { ctrlKey: true }) })
  }

  const sendRedo = () => {
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
    // Only trigger ONE redo shortcut (avoid double-redo on Windows/Linux).
    dispatchKeyDown({ key: "z", shiftKey: true, ...(isMac ? { metaKey: true } : { ctrlKey: true }) })
  }

  const setTool = (type: string) => {
    const api = apiRef.current
    if (api?.setActiveTool) return api.setActiveTool({ type })
    if (type === "text") dispatchKeyDown({ key: "t" })
  }

  const insertImage = () => {
    const api = apiRef.current
    if (!api?.setActiveTool) return setTool("image")
    api.setActiveTool({ type: "image", insertOnCanvasDirectly: true })
  }

  const sendShortcut = (opts: { key: string; shift?: boolean; alt?: boolean; metaOrCtrl?: boolean }) => {
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
    dispatchKeyDown({
      key: opts.key,
      shiftKey: Boolean(opts.shift),
      altKey: Boolean(opts.alt),
      ...(opts.metaOrCtrl ? (isMac ? { metaKey: true } : { ctrlKey: true }) : {}),
    })
  }

  const clampZoom = (z: number) => Math.min(5, Math.max(0.1, z))

  const setZoomTo = (nextZoomRaw: number) => {
    const api = apiRef.current
    if (!api?.getAppState || !api?.updateScene) return

    const appState = api.getAppState()
    const currentZoom = typeof appState?.zoom?.value === "number" ? appState.zoom.value : 1
    const nextZoom = clampZoom(nextZoomRaw)
    if (!Number.isFinite(nextZoom) || Math.abs(nextZoom - currentZoom) < 1e-6) return

    const width = typeof appState?.width === "number" ? appState.width : window.innerWidth
    const height = typeof appState?.height === "number" ? appState.height : window.innerHeight
    const scrollX = typeof appState?.scrollX === "number" ? appState.scrollX : 0
    const scrollY = typeof appState?.scrollY === "number" ? appState.scrollY : 0

    // Preserve the scene point at the viewport center when changing zoom.
    const centerSceneX = -scrollX + width / 2 / currentZoom
    const centerSceneY = -scrollY + height / 2 / currentZoom
    const nextScrollX = -centerSceneX + width / 2 / nextZoom
    const nextScrollY = -centerSceneY + height / 2 / nextZoom

    api.updateScene({
      appState: {
        ...appState,
        scrollX: nextScrollX,
        scrollY: nextScrollY,
        zoom: { ...(appState?.zoom || {}), value: nextZoom },
      },
      captureUpdate: "IMMEDIATELY",
    })
  }

  const sendZoomIn = () => {
    const api = apiRef.current
    const appState = api?.getAppState?.()
    const current = typeof appState?.zoom?.value === "number" ? appState.zoom.value : zoomValue || 1
    setZoomTo(current * 1.1)
  }
  const sendZoomOut = () => {
    const api = apiRef.current
    const appState = api?.getAppState?.()
    const current = typeof appState?.zoom?.value === "number" ? appState.zoom.value : zoomValue || 1
    setZoomTo(current / 1.1)
  }
  const sendZoomReset = () => {
    setZoomTo(1)
  }

  const getSelectedIds = (appState: any): string[] => {
    const selected = appState?.selectedElementIds
    if (!isRecord(selected)) return []
    return Object.keys(selected).filter((id) => Boolean((selected as any)[id]))
  }

  const bump = (el: any, patch: Record<string, unknown>) => {
    const next: any = { ...el, ...patch }
    if (typeof el?.version === "number") next.version = el.version + 1
    if (typeof el?.versionNonce === "number") next.versionNonce = Math.floor(Math.random() * 2 ** 31)
    if (typeof el?.updated === "number") next.updated = Date.now()
    return next
  }

  const applyToSelection = (patch: Record<string, unknown>, predicate?: (el: any) => boolean) => {
    const api = apiRef.current
    if (!api?.getAppState || !api?.getSceneElements || !api?.updateScene) return
    const appState = api.getAppState()
    const selectedIds = new Set(getSelectedIds(appState))
    if (!selectedIds.size) return
    const elements = api.getSceneElements() ?? []
    const nextElements = elements.map((el: any) => {
      if (!selectedIds.has(el?.id)) return el
      if (predicate && !predicate(el)) return el
      return bump(el, patch)
    })
    api.updateScene({ elements: nextElements, captureUpdate: "IMMEDIATELY" })
  }

  const updateAppState = (patch: Record<string, unknown>) => {
    const api = apiRef.current
    if (!api?.getAppState || !api?.updateScene) return
    const appState = api.getAppState()
    api.updateScene({ appState: { ...appState, ...patch }, captureUpdate: "IMMEDIATELY" })
  }

  const generateAiTemplate = useCallback(
    async (mode: "insert" | "replace", promptOverride?: string) => {
      const api = apiRef.current
      if (!api?.getAppState || !api?.getSceneElements || !api?.updateScene) return

      const prompt = (promptOverride != null ? promptOverride : aiPrompt).trim()
      const fromOnboarding = promptOverride != null
      if (!fromOnboarding) {
        setAiBusy(true)
        setAiError(null)
        setAiNotice(null)
      }
      try {
        const appState = api.getAppState()
        const zoom = typeof appState?.zoom?.value === "number" ? appState.zoom.value : 1
        const width = typeof appState?.width === "number" ? appState.width : window.innerWidth
        const height = typeof appState?.height === "number" ? appState.height : window.innerHeight
        const scrollX = typeof appState?.scrollX === "number" ? appState.scrollX : 0
        const scrollY = typeof appState?.scrollY === "number" ? appState.scrollY : 0
        const centerX = -scrollX + width / 2 / zoom
        const centerY = -scrollY + height / 2 / zoom

        let spec: any | undefined
        if (prompt) {
          try {
            const res = await backendApi.generateTemplate({ prompt })
            if (res?.error === "llm_not_configured") {
              spec = undefined
              if (!fromOnboarding) setAiNotice("Gemini isn't configured yet — using built‑in templates.")
            } else {
              spec = res?.spec
              if (spec && !fromOnboarding) setAiNotice("Generated with Gemini.")
            }
          } catch (err: any) {
            if (!fromOnboarding) {
            // If Gemini isn't configured or fails, fall back to local templates.
            const status = typeof err?.status === "number" ? err.status : undefined
            let body: any = null
            if (typeof err?.message === "string" && err.message.trim().startsWith("{")) {
              try {
                body = JSON.parse(err.message)
              } catch {
                body = null
              }
            }

            if (status === 501 || body?.error === "llm_not_configured") {
              setAiNotice("Gemini isn’t configured yet — using built‑in templates.")
            } else if (status === 401 || body?.error === "unauthorized") {
              setAiNotice("Gemini request wasn’t authorized — using built‑in templates.")
            } else if (status === 502 || body?.error === "llm_invalid_json") {
              setAiNotice("Gemini output couldn’t be used — using built‑in templates.")
            } else {
              setAiNotice("Gemini failed — using built‑in templates.")
            }
            }
            spec = undefined
          }
        }

        const previousLayoutType = appState?.__templateLayoutType
        const { elements: nextTemplate, layoutType, generationStrategy } = generateTemplateElements({
          prompt,
          centerX,
          centerY,
          spec,
          previousLayoutType,
        })
        const nextIds = nextTemplate.map((e: any) => e.id)

        const existing = api.getSceneElements() ?? []
        const nextElements = mode === "replace" ? nextTemplate : [...existing, ...nextTemplate]

        templateBeforeRef.current = {
          elements: existing.map((e: any) => ({ ...e })),
          appState: { ...appState },
        }

        const strategyTag = `${mode}:${generationStrategy}`
        api.updateScene({
          elements: nextElements,
          appState: {
            ...appState,
            selectedElementIds: Object.fromEntries(nextIds.map((id: string) => [id, true])),
            __templateLayoutType: layoutType,
            __templateGenerationStrategy: strategyTag,
          },
          captureUpdate: "IMMEDIATELY",
        })

        // Fit template to viewport and center; then switch to hand tool for pan/drag.
        const bbox = getElementsBoundingBox(nextTemplate)
        const padding = 80
        const viewportWidth = typeof appState?.width === "number" ? appState.width : window.innerWidth
        const viewportHeight = typeof appState?.height === "number" ? appState.height : window.innerHeight
        if (bbox) {
          const bboxW = bbox.maxX - bbox.minX + 2 * padding
          const bboxH = bbox.maxY - bbox.minY + 2 * padding
          const centerX = (bbox.minX + bbox.maxX) / 2
          const centerY = (bbox.minY + bbox.maxY) / 2
          const fitZoom = Math.min(
            viewportWidth / bboxW,
            viewportHeight / bboxH,
            2
          )
          const zoomValue = Math.max(0.15, Math.min(2, fitZoom))
          const scrollX = viewportWidth / 2 - centerX * zoomValue
          const scrollY = viewportHeight / 2 - centerY * zoomValue
          const afterState = api.getAppState()
          api.updateScene({
            appState: {
              ...afterState,
              scrollX,
              scrollY,
              zoom: { ...(afterState?.zoom || {}), value: zoomValue },
              selectedElementIds: {},
            },
            captureUpdate: "IMMEDIATELY",
          })
        }

        if (api?.setActiveTool) api.setActiveTool({ type: "hand" })
        setShowTemplateReview(true)
        if (!fromOnboarding) setAiOpen(false)
      } catch (e: any) {
        if (!fromOnboarding) setAiError(e?.message || "Failed to generate template")
        throw e
      } finally {
        if (!fromOnboarding) setAiBusy(false)
      }
    },
    [aiPrompt, backendApi]
  )

  const dismissOnboarding = useCallback(async () => {
    if (!boardId) return
    setOnboardingOpen(false)
    try {
      await backendApi.dismissBoardOnboarding(boardId)
    } catch {
      // best-effort; modal is already closed
    }
  }, [backendApi, boardId])

  const submitOnboarding = useCallback(async () => {
    const prompt = onboardingPrompt.trim() || "a collaborative board"
    setOnboardingBusy(true)
    try {
      await generateAiTemplate("replace", prompt)
      setOnboardingOpen(false)
      if (boardMeta && boardId) {
        try {
          await backendApi.dismissBoardOnboarding(boardId)
        } catch {
          // Best-effort: modal already closed; onboarding may show again on next visit
        }
      }
    } catch {
      // leave modal open so user can retry or dismiss
    } finally {
      setOnboardingBusy(false)
    }
  }, [onboardingPrompt, generateAiTemplate, backendApi, boardId, boardMeta])

  const keepTemplate = useCallback(() => {
    setShowTemplateReview(false)
    templateBeforeRef.current = null
  }, [])

  const discardTemplate = useCallback(() => {
    const before = templateBeforeRef.current
    const api = apiRef.current
    if (before && api?.updateScene) {
      api.updateScene({
        elements: before.elements,
        appState: before.appState,
        captureUpdate: "IMMEDIATELY",
      })
      if (api?.setActiveTool) api.setActiveTool({ type: "hand" })
    }
    setShowTemplateReview(false)
    templateBeforeRef.current = null
  }, [])

  const onboardingChips = [
    "Brainstorm ideas",
    "Create sequence diagram",
    "Plan sprint timeline",
    "Create system architecture diagram",
    "Create technical spec draft",
  ]

  useEffect(() => {
    if (!onboardingOpen) return
    const t = window.setTimeout(() => onboardingInputRef.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [onboardingOpen])

  useEffect(() => {
    if (!onboardingOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        dismissOnboarding()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onboardingOpen, dismissOnboarding])

  const handleChange = useCallback(
    (elements: any, appState: any, files: any) => {
      const scene = {
        elements: Array.isArray(elements) ? elements : [],
        appState: toSerializableAppState(appState),
        files: files && typeof files === "object" && !Array.isArray(files) ? files : {},
      }

      persist(scene)

      if (!applyingRemoteRef.current) {
        queueSendScene(scene)
        queueSaveScene(scene)
      }

      // Track active tool (used for left toolbar highlighting + pencil-only topbar mode).
      try {
        const nextTool = String(appState?.activeTool?.type || "selection")
        if (activeToolSigRef.current !== nextTool) {
          activeToolSigRef.current = nextTool
          setActiveToolType(nextTool)
        }
      } catch {
        // ignore
      }

      // Track zoom value for zoom widget.
      try {
        const nextZoom = typeof appState?.zoom?.value === "number" ? appState.zoom.value : 1
        const sig = String(nextZoom)
        if (zoomSigRef.current !== sig) {
          zoomSigRef.current = sig
          setZoomValue(nextZoom)
        }
      } catch {
        // ignore
      }

      // Track default editor settings (for when nothing is selected).
      try {
        const nextDefaults = {
          strokeColor: (appState?.currentItemStrokeColor as string) || "#1f2937",
          backgroundColor: (appState?.currentItemBackgroundColor as string) || "#ffffff",
          opacity: typeof appState?.currentItemOpacity === "number" ? appState.currentItemOpacity : 100,
          strokeWidth: typeof appState?.currentItemStrokeWidth === "number" ? appState.currentItemStrokeWidth : 2,
          strokeStyle: (appState?.currentItemStrokeStyle as string) || "solid",
          roughness: typeof appState?.currentItemRoughness === "number" ? appState.currentItemRoughness : 1,
          fontFamily: typeof appState?.currentItemFontFamily === "number" ? appState.currentItemFontFamily : 1,
          fontSize: typeof appState?.currentItemFontSize === "number" ? appState.currentItemFontSize : 20,
          textAlign: (appState?.currentItemTextAlign as any) || "left",
          roundness: (appState?.currentItemRoundness as any) || "sharp",
        }
        const sig = JSON.stringify(nextDefaults)
        if (defaultsSigRef.current !== sig) {
          defaultsSigRef.current = sig
          setDefaults(nextDefaults)
        }
      } catch {
        // ignore
      }

      // Track selection to drive contextual top bar.
      try {
        const selectedIds = getSelectedIds(appState)
        const selectedElements = selectedIds.length
          ? (elements || []).filter((el: any) => selectedIds.includes(el?.id))
          : []
        const types = new Set(selectedElements.map((el: any) => el?.type).filter(Boolean))
        let kind: (typeof selectionInfo)["kind"] = "none"
        if (selectedIds.length === 0) kind = "none"
        else if (types.size === 1) {
          const t = [...types][0]
          if (t === "text") kind = "text"
          else if (t === "image") kind = "image"
          else if (t === "freedraw") kind = "draw"
          else kind = "shape"
        } else {
          kind = "mixed"
        }

        const primary = selectedElements[0] as any
        const p = primary as any

        // Keep this signature small & stable to avoid update loops.
        const sig = JSON.stringify({
          kind,
          count: selectedIds.length,
          selectedIds,
          p: primary
            ? {
                id: p.id,
                type: p.type,
                strokeColor: p.strokeColor,
                backgroundColor: p.backgroundColor,
                strokeWidth: p.strokeWidth,
                strokeStyle: p.strokeStyle,
                roughness: p.roughness,
                opacity: p.opacity,
                fontFamily: p.fontFamily,
                fontSize: p.fontSize,
                textAlign: p.textAlign,
                roundness: p.roundness,
              }
            : null,
        })

        if (selectionSigRef.current !== sig) {
          selectionSigRef.current = sig
          setSelectionInfo({ kind, count: selectedIds.length, primary, selectedIds })
        }
      } catch {
        // ignore UI state errors
      }
    },
    [persist, toSerializableAppState, queueSaveScene, queueSendScene]
  )

  const handleExcalidrawApi = useCallback((api: any) => {
    apiRef.current = api

    // Defer calling Excalidraw API methods by a tick. Calling `setActiveTool` / `updateScene`
    // synchronously during initial mount can trigger dev warnings like:
    // "Can't call setState on a component that is not yet mounted."
    window.setTimeout(() => {
      if (apiRef.current !== api) return

      if (!initialToolSetRef.current) {
        initialToolSetRef.current = true
        try {
          api?.setActiveTool?.({ type: "hand" })
        } catch {
          // ignore
        }
      }

      const pending = pendingIncomingSceneRef.current
      if (pending && api?.updateScene && api?.getAppState) {
        pendingIncomingSceneRef.current = null
        const current = api.getAppState()
        applyingRemoteRef.current = true
        try {
          api.updateScene({
            elements: (pending as any).elements || [],
            appState: {
              ...current,
              ...((pending as any).appState || {}),
              scrollX: current.scrollX,
              scrollY: current.scrollY,
              zoom: current.zoom,
            },
          })
        } catch {
          // ignore
        } finally {
          window.setTimeout(() => {
            applyingRemoteRef.current = false
          }, 0)
        }
      }
    }, 0)
  }, [])

  useEffect(() => {
    if (!shapesOpen) return
    const onDown = (e: MouseEvent) => {
      const root = containerRef.current
      if (!root) return setShapesOpen(false)
      const el = e.target as HTMLElement | null
      if (!el) return setShapesOpen(false)
      if (root.contains(el) && el.closest("[data-shapes-popover-root]")) return
      setShapesOpen(false)
    }
    window.addEventListener("pointerdown", onDown)
    return () => window.removeEventListener("pointerdown", onDown)
  }, [shapesOpen])

  useEffect(() => {
    if (!topMenuOpen) return
    const onDown = (e: MouseEvent) => {
      const root = containerRef.current
      if (!root) return setTopMenuOpen(null)
      const el = e.target as HTMLElement | null
      if (!el) return setTopMenuOpen(null)
      if (root.contains(el) && el.closest("[data-topbar-menu-root]")) return
      setTopMenuOpen(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTopMenuOpen(null)
    }
    window.addEventListener("pointerdown", onDown)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("pointerdown", onDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [topMenuOpen])

  useEffect(() => {
    // Close open dropdown when selection context changes.
    setTopMenuOpen(null)
  }, [selectionInfo.kind, selectionInfo.count])

  // Ensure double-clicking a text element enters edit mode.
  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    const onDblClick = () => {
      const api = apiRef.current
      if (!api?.getAppState || !api?.getSceneElements) return

      // If we're in a drawing tool, first switch back to selection.
      if (api?.setActiveTool) api.setActiveTool({ type: "selection" })

      // Let Excalidraw update selection state from the click.
      window.setTimeout(() => {
        const appState = api.getAppState?.()
        if (!appState) return

        // If Excalidraw is already editing something, don't interfere.
        if ((appState as any).editingElement) return

        const selected = (appState as any).selectedElementIds
        if (!isRecord(selected)) return

        const selectedIds = Object.keys(selected).filter((id) => Boolean((selected as any)[id]))
        if (selectedIds.length !== 1) return

        const id = selectedIds[0]
        const elements = api.getSceneElements?.() ?? []
        const el = elements.find((e: any) => e?.id === id)
        if (!el || el.type !== "text") return

        // Excalidraw enters text-edit on Enter when a text element is selected.
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
        )
      }, 0)
    }

    root.addEventListener("dblclick", onDblClick)
    return () => root.removeEventListener("dblclick", onDblClick)
  }, [])

  useEffect(() => {
    if (!aiOpen) return
    setAiError(null)
    const t = window.setTimeout(() => aiTextAreaRef.current?.focus(), 0)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAiOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [aiOpen])

  useEffect(() => {
    if (!shareOpen) return
    setShareError(null)
    setShareNotice(null)
    const t = window.setTimeout(() => shareEmailRef.current?.focus(), 0)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShareOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [shareOpen])

  useEffect(() => {
    if (!zoomEditing) return
    setZoomDraft(String(Math.round((zoomValue || 1) * 100)))
    const t = window.setTimeout(() => zoomInputRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [zoomEditing, zoomValue])

  return (
    <div ref={containerRef} style={{ position: "absolute", inset: 0 }}>
      {/* Hide Excalidraw's built-in toolbars/menus (we render our own). */}
      <style>{`
        .excalidraw .App-toolbar-container,
        .excalidraw .App-toolbar,
        .excalidraw .layer-ui__wrapper__footer,
        .excalidraw .App-menu {
          display: none !important;
        }
      `}</style>

      {/* Top contextual properties bar */}
      <div className="pointer-events-none absolute left-0 right-0 top-4 z-50 flex justify-center px-4">
        <div className="pointer-events-auto inline-flex items-center gap-3 rounded-2xl border border-border bg-surface/85 p-2 shadow-md backdrop-blur">
          {(() => {
            const hasSelection = selectionInfo.selectedIds.length > 0
            const isText = selectionInfo.kind === "text"
            const isDraw = selectionInfo.kind === "draw"
            const isShape =
              selectionInfo.kind === "shape" || selectionInfo.kind === "draw" || selectionInfo.kind === "mixed"
            const isImage = selectionInfo.kind === "image"
            const isNone = selectionInfo.kind === "none"
            const isPencilTool = activeToolType === "freedraw" || activeToolType === "eraser"

            // If pencil is selected and nothing is selected, show pencil-only controls.
            const showTextControls = isText || (isNone && !isPencilTool)
            const showStyleControls = isShape || (isNone && true)
            const showImageControls = isImage || (isNone && !isPencilTool)

            const toggle = (key: string) => setTopMenuOpen((v) => (v === key ? null : key))

            return (
              <div className="flex items-center gap-2" data-topbar-menu-root>
                {/* TEXT */}
                {showTextControls && (
                  <>
                    <div className="relative" data-topbar-menu-root>
                      <button
                        type="button"
                        className={topIconBtnClass}
                        aria-label="Text color"
                        title="Text color"
                        aria-expanded={topMenuOpen === "textColor"}
                        onClick={() => toggle("textColor")}
                      >
                        <span
                          aria-hidden
                          className="h-3.5 w-3.5 rounded-full border border-border"
                          style={{
                            backgroundColor: toColorInputValue(
                              selectionInfo.primary?.type === "text"
                                ? ((selectionInfo.primary?.strokeColor as string) || defaults.strokeColor)
                                : defaults.strokeColor,
                              "#1f2937"
                            ),
                          }}
                        />
                      </button>
                      {topMenuOpen === "textColor" && (
                        <div className={dropdownClass}>
                          <input
                            aria-label="Text color"
                            type="color"
                            className="h-10 w-12 cursor-pointer rounded-xl border border-border bg-transparent p-1"
                            value={toColorInputValue(
                              selectionInfo.primary?.type === "text"
                                ? ((selectionInfo.primary?.strokeColor as string) || defaults.strokeColor)
                                : defaults.strokeColor,
                              "#1f2937"
                            )}
                            onChange={(e) => {
                              if (selectionInfo.primary?.type === "text")
                                applyToSelection({ strokeColor: e.target.value }, (el) => el?.type === "text")
                              else updateAppState({ currentItemStrokeColor: e.target.value })
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="relative" data-topbar-menu-root>
                      <button
                        type="button"
                        className={topIconBtnClass}
                        aria-label="Highlight"
                        title="Highlight"
                        aria-expanded={topMenuOpen === "textHighlight"}
                        onClick={() => toggle("textHighlight")}
                      >
                        <span
                          aria-hidden
                          className="h-3.5 w-3.5 rounded-sm border border-border"
                          style={{
                            backgroundColor: toColorInputValue(
                              selectionInfo.primary?.type === "text"
                                ? ((selectionInfo.primary?.backgroundColor as string) || defaults.backgroundColor)
                                : defaults.backgroundColor,
                              "#ffffff"
                            ),
                          }}
                        />
                      </button>
                      {topMenuOpen === "textHighlight" && (
                        <div className={dropdownClass}>
                          <input
                            aria-label="Text highlight color"
                            type="color"
                            className="h-10 w-12 cursor-pointer rounded-xl border border-border bg-transparent p-1"
                            value={toColorInputValue(
                              selectionInfo.primary?.type === "text"
                                ? ((selectionInfo.primary?.backgroundColor as string) || defaults.backgroundColor)
                                : defaults.backgroundColor,
                              "#ffffff"
                            )}
                            onChange={(e) => {
                              if (selectionInfo.primary?.type === "text")
                                applyToSelection({ backgroundColor: e.target.value }, (el) => el?.type === "text")
                              else updateAppState({ currentItemBackgroundColor: e.target.value })
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="relative" data-topbar-menu-root>
                      <button
                        type="button"
                        className={topIconBtnClass}
                        aria-label="Font"
                        title="Font"
                        aria-expanded={topMenuOpen === "font"}
                        onClick={() => toggle("font")}
                      >
                        Aa
                      </button>
                      {topMenuOpen === "font" && (
                        <div className={dropdownClass}>
                          <div className="grid gap-2">
                            <button
                              type="button"
                              className={pillBtnClass}
                              style={{ fontFamily: "cursive" }}
                              aria-label="Virgil"
                              title="Virgil"
                              onClick={() => {
                                const next = 1
                                if (selectionInfo.primary?.type === "text")
                                  applyToSelection({ fontFamily: next }, (el) => el?.type === "text")
                                else updateAppState({ currentItemFontFamily: next })
                                setTopMenuOpen(null)
                              }}
                            >
                              Virgil
                            </button>
                            <button
                              type="button"
                              className={pillBtnClass}
                              style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
                              aria-label="Inter"
                              title="Inter"
                              onClick={() => {
                                const next = 2
                                if (selectionInfo.primary?.type === "text")
                                  applyToSelection({ fontFamily: next }, (el) => el?.type === "text")
                                else updateAppState({ currentItemFontFamily: next })
                                setTopMenuOpen(null)
                              }}
                            >
                              Inter
                            </button>
                            <button
                              type="button"
                              className={pillBtnClass}
                              style={{ fontFamily: "\"JetBrains Mono\", ui-monospace, SFMono-Regular, Menlo, monospace" }}
                              aria-label="JetBrains Mono"
                              title="JetBrains Mono"
                              onClick={() => {
                                const next = 3
                                if (selectionInfo.primary?.type === "text")
                                  applyToSelection({ fontFamily: next }, (el) => el?.type === "text")
                                else updateAppState({ currentItemFontFamily: next })
                                setTopMenuOpen(null)
                              }}
                            >
                              JetBrains Mono
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="relative" data-topbar-menu-root>
                      <button
                        type="button"
                        className={topIconBtnClass}
                        aria-label="Font size"
                        title="Font size"
                        aria-expanded={topMenuOpen === "fontSize"}
                        onClick={() => toggle("fontSize")}
                      >
                        Tt
                      </button>
                      {topMenuOpen === "fontSize" && (
                        <div className={dropdownClass}>
                          <input
                            aria-label="Font size"
                            className="h-10 w-24 rounded-xl border border-border bg-surface px-2 text-sm text-text-secondary"
                            type="number"
                            min={8}
                            max={256}
                            value={
                              selectionInfo.primary?.type === "text" && typeof selectionInfo.primary?.fontSize === "number"
                                ? selectionInfo.primary.fontSize
                                : defaults.fontSize
                            }
                            onChange={(e) => {
                              const next = Number(e.target.value)
                              if (selectionInfo.primary?.type === "text")
                                applyToSelection({ fontSize: next }, (el) => el?.type === "text")
                              else updateAppState({ currentItemFontSize: next })
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="relative" data-topbar-menu-root>
                      <button
                        type="button"
                        className={topIconBtnClass}
                        aria-label="Text align"
                        title="Text align"
                        aria-expanded={topMenuOpen === "align"}
                        onClick={() => toggle("align")}
                      >
                        <AlignIcon align="center" />
                      </button>
                      {topMenuOpen === "align" && (
                        <div className={dropdownClass}>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              className={pillBtnClass}
                              aria-label="Align left"
                              title="Align left"
                              onClick={() => {
                                if (selectionInfo.primary?.type === "text")
                                  applyToSelection({ textAlign: "left" }, (el) => el?.type === "text")
                                else updateAppState({ currentItemTextAlign: "left" })
                                setTopMenuOpen(null)
                              }}
                            >
                              <AlignIcon align="left" />
                            </button>
                            <button
                              type="button"
                              className={pillBtnClass}
                              aria-label="Align center"
                              title="Align center"
                              onClick={() => {
                                if (selectionInfo.primary?.type === "text")
                                  applyToSelection({ textAlign: "center" }, (el) => el?.type === "text")
                                else updateAppState({ currentItemTextAlign: "center" })
                                setTopMenuOpen(null)
                              }}
                            >
                              <AlignIcon align="center" />
                            </button>
                            <button
                              type="button"
                              className={pillBtnClass}
                              aria-label="Align right"
                              title="Align right"
                              onClick={() => {
                                if (selectionInfo.primary?.type === "text")
                                  applyToSelection({ textAlign: "right" }, (el) => el?.type === "text")
                                else updateAppState({ currentItemTextAlign: "right" })
                                setTopMenuOpen(null)
                              }}
                            >
                              <AlignIcon align="right" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <button type="button" className={topIconBtnClass} aria-label="Bold" title="Bold" disabled>
                      B
                    </button>
                    <button type="button" className={topIconBtnClass} aria-label="Underline" title="Underline" disabled>
                      U
                    </button>
                  </>
                )}

                {/* SHAPES + STROKES */}
                {showStyleControls && (
                  <>
                    <div className="relative" data-topbar-menu-root>
                      <button
                        type="button"
                        className={topIconBtnClass}
                        aria-label="Stroke color"
                        title="Stroke color"
                        aria-expanded={topMenuOpen === "strokeColor"}
                        onClick={() => toggle("strokeColor")}
                      >
                        <span
                          aria-hidden
                          className="h-3.5 w-3.5 rounded-full border border-border"
                          style={{
                            backgroundColor: toColorInputValue(
                              hasSelection
                                ? ((selectionInfo.primary?.strokeColor as string) || defaults.strokeColor)
                                : defaults.strokeColor,
                              "#1f2937"
                            ),
                          }}
                        />
                      </button>
                      {topMenuOpen === "strokeColor" && (
                        <div className={dropdownClass}>
                          <input
                            aria-label="Stroke color"
                            type="color"
                            className="h-10 w-12 cursor-pointer rounded-xl border border-border bg-transparent p-1"
                            value={toColorInputValue(
                              hasSelection ? ((selectionInfo.primary?.strokeColor as string) || defaults.strokeColor) : defaults.strokeColor,
                              "#1f2937"
                            )}
                            onChange={(e) => {
                              if (hasSelection)
                                applyToSelection(
                                  { strokeColor: e.target.value },
                                  (el) => el?.type !== "text" && el?.type !== "image"
                                )
                              else updateAppState({ currentItemStrokeColor: e.target.value })
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="relative" data-topbar-menu-root>
                      <button
                        type="button"
                        className={topIconBtnClass}
                        aria-label="Fill color"
                        title="Fill color"
                        aria-expanded={topMenuOpen === "fillColor"}
                        onClick={() => toggle("fillColor")}
                      >
                        <span
                          aria-hidden
                          className="h-3.5 w-3.5 rounded-sm border border-border"
                          style={{
                            backgroundColor: toColorInputValue(
                              hasSelection
                                ? ((selectionInfo.primary?.backgroundColor as string) || defaults.backgroundColor)
                                : defaults.backgroundColor,
                              "#ffffff"
                            ),
                          }}
                        />
                      </button>
                      {topMenuOpen === "fillColor" && (
                        <div className={dropdownClass}>
                          <input
                            aria-label="Fill color"
                            type="color"
                            className="h-10 w-12 cursor-pointer rounded-xl border border-border bg-transparent p-1"
                            value={toColorInputValue(
                              hasSelection
                                ? ((selectionInfo.primary?.backgroundColor as string) || defaults.backgroundColor)
                                : defaults.backgroundColor,
                              "#ffffff"
                            )}
                            onChange={(e) => {
                              if (hasSelection)
                                applyToSelection(
                                  { backgroundColor: e.target.value },
                                  (el) => el?.type !== "text" && el?.type !== "image"
                                )
                              else updateAppState({ currentItemBackgroundColor: e.target.value })
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="relative" data-topbar-menu-root>
                      <button
                        type="button"
                        className={topIconBtnClass}
                        aria-label="Stroke width"
                        title="Stroke width"
                        aria-expanded={topMenuOpen === "strokeWidth"}
                        onClick={() => toggle("strokeWidth")}
                      >
                        ↕
                      </button>
                      {topMenuOpen === "strokeWidth" && (
                        <div className={dropdownClass}>
                          <input
                            aria-label="Stroke width"
                            type="range"
                            min={1}
                            max={24}
                            className="w-64"
                            value={
                              hasSelection
                                ? typeof selectionInfo.primary?.strokeWidth === "number"
                                  ? selectionInfo.primary.strokeWidth
                                  : defaults.strokeWidth
                                : defaults.strokeWidth
                            }
                            onChange={(e) => {
                              const next = Number(e.target.value)
                              if (hasSelection)
                                applyToSelection({ strokeWidth: next }, (el) => el?.type !== "text" && el?.type !== "image")
                              else updateAppState({ currentItemStrokeWidth: next })
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="relative" data-topbar-menu-root>
                      <button
                        type="button"
                        className={topIconBtnClass}
                        aria-label="Stroke style"
                        title="Stroke style"
                        aria-expanded={topMenuOpen === "strokeStyle"}
                        onClick={() => toggle("strokeStyle")}
                      >
                        ┄
                      </button>
                      {topMenuOpen === "strokeStyle" && (
                        <div className={dropdownClass}>
                          <select
                            aria-label="Stroke style"
                            className="h-10 w-28 rounded-xl border border-border bg-surface px-2 text-sm text-text-secondary"
                            value={hasSelection ? ((selectionInfo.primary?.strokeStyle as string) || defaults.strokeStyle) : defaults.strokeStyle}
                            onChange={(e) => {
                              if (hasSelection)
                                applyToSelection({ strokeStyle: e.target.value }, (el) => el?.type !== "text" && el?.type !== "image")
                              else updateAppState({ currentItemStrokeStyle: e.target.value })
                            }}
                          >
                            <option value="solid">━</option>
                            <option value="dashed">┄</option>
                            <option value="dotted">┈</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="relative" data-topbar-menu-root>
                      <button
                        type="button"
                        className={topIconBtnClass}
                        aria-label="Sloppiness"
                        title="Sloppiness"
                        aria-expanded={topMenuOpen === "roughness"}
                        onClick={() => toggle("roughness")}
                      >
                        〰
                      </button>
                      {topMenuOpen === "roughness" && (
                        <div className={dropdownClass}>
                          <input
                            aria-label="Sloppiness"
                            type="range"
                            min={0}
                            max={4}
                            className="w-64"
                            value={
                              hasSelection
                                ? typeof selectionInfo.primary?.roughness === "number"
                                  ? selectionInfo.primary.roughness
                                  : defaults.roughness
                                : defaults.roughness
                            }
                            onChange={(e) => {
                              const next = Number(e.target.value)
                              if (hasSelection)
                                applyToSelection({ roughness: next }, (el) => el?.type !== "text" && el?.type !== "image")
                              else updateAppState({ currentItemRoughness: next })
                            }}
                          />
                        </div>
                      )}
                    </div>

                  </>
                )}

                {/* IMAGES */}
                {showImageControls && (
                  <div className="relative" data-topbar-menu-root>
                    <button
                      type="button"
                      className={topIconBtnClass}
                      aria-label="Edges"
                      title="Edges"
                      aria-expanded={topMenuOpen === "edges"}
                      onClick={() => toggle("edges")}
                    >
                      ▢
                    </button>
                    {topMenuOpen === "edges" && (
                      <div className={dropdownClass}>
                        <button
                          type="button"
                          className={pillBtnClass}
                          onClick={() => {
                            const next = defaults.roundness === "round" ? "sharp" : "round"
                            if (selectionInfo.primary?.type === "image") {
                              applyToSelection({ roundness: next === "round" ? { type: 3 } : null }, (el) => el?.type === "image")
                            } else {
                              updateAppState({ currentItemRoundness: next })
                            }
                          }}
                          aria-label="Toggle edges"
                          title="Toggle edges"
                        >
                          {defaults.roundness === "round" ? "◯" : "▢"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* COMMON */}
                <div className="relative" data-topbar-menu-root>
                  <button
                    type="button"
                    className={topIconBtnClass}
                    aria-label="Opacity"
                    title="Opacity"
                    aria-expanded={topMenuOpen === "opacity"}
                    onClick={() => toggle("opacity")}
                  >
                    ◐
                  </button>
                  {topMenuOpen === "opacity" && (
                    <div className={dropdownClass}>
                      <input
                        aria-label="Opacity"
                        type="range"
                        min={0}
                        max={100}
                        className="w-64"
                        value={
                          hasSelection
                            ? typeof selectionInfo.primary?.opacity === "number"
                              ? selectionInfo.primary.opacity
                              : defaults.opacity
                            : defaults.opacity
                        }
                        onChange={(e) => {
                          const next = Number(e.target.value)
                          if (hasSelection) applyToSelection({ opacity: next })
                          else updateAppState({ currentItemOpacity: next })
                        }}
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className={topIconBtnClass}
                  aria-label="Duplicate"
                  title="Duplicate"
                  onClick={() => sendShortcut({ key: "d", metaOrCtrl: true })}
                  disabled={!hasSelection}
                >
                  ⧉
                </button>

                <button
                  type="button"
                  className={topIconBtnClass}
                  aria-label="Delete"
                  title="Delete"
                  onClick={() => {
                    dispatchKeyDown({ key: "Backspace" })
                    dispatchKeyDown({ key: "Delete" })
                  }}
                  disabled={!hasSelection}
                >
                  ⌫
                </button>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Left vertical tool column */}
      <div className="pointer-events-none absolute left-4 top-20 z-50">
        <div className="pointer-events-auto flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface/85 p-2 shadow-md backdrop-blur">
          <button type="button" className={iconBtnClass} onClick={sendUndo} title="Undo (Ctrl/Cmd+Z)">
            ↶
          </button>
          <button type="button" className={iconBtnClass} onClick={sendRedo} title="Redo (Ctrl/Cmd+Shift+Z)">
            ↷
          </button>
          <div className="h-px w-10 bg-border/70" />
          <button
            type="button"
            className={`${iconBtnClass} ${activeToolType === "hand" ? iconBtnActiveClass : ""}`}
            onClick={() => setTool("hand")}
            title="Pan"
            aria-label="Pan"
          >
            <CursorIcon />
          </button>
          <button
            type="button"
            className={`${iconBtnClass} ${activeToolType === "text" ? iconBtnActiveClass : ""}`}
            onClick={() => setTool("text")}
            title="Text"
          >
            <TextBoxIcon />
          </button>

          <div className="relative" data-shapes-popover-root>
            <button
              type="button"
              className={`${iconBtnClass} ${
                ["rectangle", "ellipse", "diamond", "arrow", "line"].includes(activeToolType) ? iconBtnActiveClass : ""
              }`}
              onClick={() => setShapesOpen((v) => !v)}
              title="Shapes"
              aria-expanded={shapesOpen}
            >
              <ShapesIcon />
            </button>
            {shapesOpen && (
              <div className="absolute left-[calc(100%+10px)] top-0 z-50 min-w-56 rounded-2xl border border-border bg-surface p-2 shadow-lg">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={pillBtnClass}
                    onClick={() => {
                      setTool("rectangle")
                      setShapesOpen(false)
                    }}
                    title="Rectangle"
                  >
                    ▭ Rectangle
                  </button>
                  <button
                    type="button"
                    className={pillBtnClass}
                    onClick={() => {
                      setTool("ellipse")
                      setShapesOpen(false)
                    }}
                    title="Ellipse"
                  >
                    ◯ Ellipse
                  </button>
                  <button
                    type="button"
                    className={pillBtnClass}
                    onClick={() => {
                      setTool("diamond")
                      setShapesOpen(false)
                    }}
                    title="Diamond"
                  >
                    ◇ Diamond
                  </button>
                  <button
                    type="button"
                    className={pillBtnClass}
                    onClick={() => {
                      setTool("arrow")
                      setShapesOpen(false)
                    }}
                    title="Arrow"
                  >
                    ➝ Arrow
                  </button>
                  <button
                    type="button"
                    className={pillBtnClass}
                    onClick={() => {
                      setTool("line")
                      setShapesOpen(false)
                    }}
                    title="Line"
                  >
                    ／ Line
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className={`${iconBtnClass} ${activeToolType === "laser" ? iconBtnActiveClass : ""}`}
            onClick={() => setTool("laser")}
            title="Laser pointer"
          >
            ⊙
          </button>

          <button
            type="button"
            className={iconBtnClass}
            onClick={() => insertImage()}
            title="Upload image"
            aria-label="Upload image"
          >
            <PaperclipIcon />
          </button>

          <button
            type="button"
            className={`${iconBtnClass} ${gridModeEnabled ? iconBtnActiveClass : ""}`}
            onClick={() => {
              setGridModeEnabled((prev) => {
                const next = !prev
                const snap = latestRef.current
                persist({
                  ...snap,
                  appState: { ...(snap?.appState || {}), gridModeEnabled: next },
                })
                return next
              })
            }}
            aria-pressed={gridModeEnabled}
            title="Grid"
          >
            #
          </button>
        </div>
      </div>

      {/* Bottom-right zoom controls */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-50">
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-2xl border border-border bg-surface/85 p-1 shadow-md backdrop-blur">
          <button type="button" className={iconBtnClass} onClick={sendZoomOut} title="Zoom out" aria-label="Zoom out">
            −
          </button>
          {zoomEditing ? (
            <input
              ref={zoomInputRef}
              value={zoomDraft}
              onChange={(e) => setZoomDraft(e.target.value.replace(/[^\d.]/g, ""))}
              onBlur={() => {
                const n = Number.parseFloat(zoomDraft)
                if (Number.isFinite(n) && n > 0) setZoomTo(n / 100)
                setZoomEditing(false)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const n = Number.parseFloat(zoomDraft)
                  if (Number.isFinite(n) && n > 0) setZoomTo(n / 100)
                  setZoomEditing(false)
                }
                if (e.key === "Escape") setZoomEditing(false)
              }}
              inputMode="decimal"
              aria-label="Zoom percent"
              title="Type a zoom percent and press Enter"
              className="h-10 w-20 rounded-xl border border-border bg-surface/90 px-2 text-center text-sm font-semibold text-text-secondary shadow-sm backdrop-blur focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          ) : (
            <button
              type="button"
              className="inline-flex h-10 min-w-16 items-center justify-center rounded-xl border border-border bg-surface/90 px-2 text-sm font-semibold text-text-secondary shadow-sm backdrop-blur hover:bg-toolbar hover:text-text-primary"
              onClick={() => setZoomEditing(true)}
              onDoubleClick={sendZoomReset}
              title="Click to type zoom • Double-click to reset"
              aria-label="Zoom percent"
            >
              {Math.round(zoomValue * 100)}%
            </button>
          )}
          <button type="button" className={iconBtnClass} onClick={sendZoomIn} title="Zoom in" aria-label="Zoom in">
            +
          </button>
        </div>
      </div>

      {/* Keep / Discard template review bar (after AI template is placed) */}
      {showTemplateReview && (
        <div className="pointer-events-auto absolute bottom-24 left-1/2 z-50 -translate-x-1/2">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-border bg-surface/95 px-4 py-2.5 shadow-lg backdrop-blur">
            <span className="text-sm font-medium text-text-primary">Template added.</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={pillBtnClass}
                onClick={keepTemplate}
                aria-label="Keep template"
              >
                Keep
              </button>
              <button
                type="button"
                className={pillBtnClass}
                onClick={discardTemplate}
                aria-label="Discard template"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom-center AI template generator */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-50 -translate-x-1/2">
        <div className="pointer-events-auto">
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-border bg-surface/90 px-4 text-sm font-medium text-text-secondary shadow-md backdrop-blur hover:bg-toolbar hover:text-text-primary active:translate-y-px transition duration-fast"
              onClick={() => setAiOpen(true)}
              aria-label="Need Help Generating"
              title="Need Help Generating"
            >
              Need Help Generating
            </button>
            <button
              type="button"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-border bg-surface/90 px-4 text-sm font-medium text-text-secondary shadow-md backdrop-blur hover:bg-toolbar hover:text-text-primary active:translate-y-px transition duration-fast"
              onClick={() => setShareOpen(true)}
              aria-label="Collaborate"
              title="Collaborate"
            >
              Collaborate
            </button>
          </div>
        </div>
      </div>

      {aiOpen && (
        <div className="pointer-events-auto absolute inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setAiOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-1/2 top-1/2 w-[min(680px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-surface p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-text-primary">AI template generator</div>
                <div className="mt-1 text-sm text-text-secondary">
                  Describe the board you want (e.g. “Sprint retro”, “Kanban for marketing”, “Project kickoff workshop”).
                </div>
              </div>
              <button
                type="button"
                className={iconBtnClass}
                onClick={() => setAiOpen(false)}
                aria-label="Close"
                title="Close"
              >
                ×
              </button>
            </div>

            <textarea
              ref={aiTextAreaRef}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="What kind of collaborative board do you want to make?"
              className="mt-4 h-28 w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-primary shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />

            {aiNotice && <div className="mt-3 text-sm text-text-muted">{aiNotice}</div>}
            {aiError && <div className="mt-3 text-sm text-red-600">{aiError}</div>}

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                className={pillBtnClass}
                onClick={() => generateAiTemplate("insert")}
                disabled={aiBusy}
              >
                {aiBusy ? "Generating…" : "Insert template"}
              </button>
              <button
                type="button"
                className={pillBtnClass}
                onClick={() => generateAiTemplate("replace")}
                disabled={aiBusy}
                title="Clears the current board content and generates a new template"
              >
                {aiBusy ? "Generating…" : "Replace board"}
              </button>
            </div>
          </div>
        </div>
      )}

      {shareOpen && (
        <div className="pointer-events-auto absolute inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setShareOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-1/2 top-1/2 w-[min(560px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-surface p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-text-primary">Share this board</div>
                <div className="mt-1 text-sm text-text-secondary">
                  Enter an email address. They’ll get an in-app notification and this board will appear on their dashboard.
                </div>
              </div>
              <button
                type="button"
                className={iconBtnClass}
                onClick={() => setShareOpen(false)}
                aria-label="Close"
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-4">
              <label className="block">
                <div className="text-sm font-semibold text-text-primary">Email</div>
                <input
                  ref={shareEmailRef}
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  type="email"
                  autoComplete="email"
                  maxLength={320}
                  placeholder="teammate@example.com"
                  className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-primary shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-surface/70 p-3">
              <div className="text-xs font-semibold text-text-muted">Share link</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 truncate rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
                  {`${window.location.origin}/app/boards/${boardId || ""}`}
                </div>
                <button
                  type="button"
                  className={pillBtnClass}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`${window.location.origin}/app/boards/${boardId || ""}`)
                      setShareNotice("Link copied.")
                    } catch {
                      setShareNotice("Copy failed — select the link and copy manually.")
                    }
                  }}
                >
                  Copy
                </button>
              </div>
            </div>

            {shareNotice && <div className="mt-3 text-sm text-text-muted">{shareNotice}</div>}
            {shareError && <div className="mt-3 text-sm text-red-600">{shareError}</div>}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className={pillBtnClass}
                disabled={shareBusy || !shareEmail.trim() || !boardId}
                onClick={async () => {
                  if (!boardId) return
                  setShareBusy(true)
                  setShareError(null)
                  setShareNotice(null)
                  try {
                    await backendApi.shareBoard(boardId, { email: shareEmail.trim() })
                    setShareNotice("Shared. They’ll see it on their dashboard.")
                  } catch (e: any) {
                    if (e?.status === 404) setShareError("No user found with that email.")
                    else if (e?.status === 403) setShareError("You don’t have permission to share this board.")
                    else setShareError(e?.message || "Failed to share board.")
                  } finally {
                    setShareBusy(false)
                  }
                }}
              >
                {shareBusy ? "Sharing…" : "Share"}
              </button>
            </div>
          </div>
        </div>
      )}

      {onboardingOpen && (
        <div className="pointer-events-auto absolute inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
          <div
            className="absolute inset-0 bg-black/25 backdrop-blur-sm"
            onClick={dismissOnboarding}
            aria-hidden="true"
          />
          <div
            className="absolute left-1/2 top-1/2 w-[min(520px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
                e.preventDefault()
                submitOnboarding()
              }
              if (e.key === "Tab") {
                const target = e.target as HTMLElement
                if (e.shiftKey && target === onboardingInputRef.current) {
                  e.preventDefault()
                  onboardingSubmitRef.current?.focus()
                } else if (!e.shiftKey && target === onboardingSubmitRef.current) {
                  e.preventDefault()
                  onboardingInputRef.current?.focus()
                }
              }
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="onboarding-title" className="text-lg font-semibold text-text-primary">
                  Hey {authUser?.displayName || "there"}, what are we working on today?
                </h2>
                <p className="mt-1.5 text-sm text-text-secondary">
                  AI can help generate structure for your board — describe what you need and we’ll add notes, sections, and shapes to get you started.
                </p>
              </div>
              <button
                type="button"
                className={iconBtnClass}
                onClick={dismissOnboarding}
                aria-label="Close"
                title="Close"
                data-dismiss
              >
                ×
              </button>
            </div>

            <input
              ref={onboardingInputRef}
              type="text"
              value={onboardingPrompt}
              onChange={(e) => setOnboardingPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  submitOnboarding()
                }
              }}
              placeholder="I want to create…"
              className="mt-4 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={onboardingBusy}
              aria-label="Describe what you want to create"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              {onboardingChips.map((label) => (
                <button
                  key={label}
                  type="button"
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary shadow-xs hover:bg-toolbar hover:text-text-primary transition-colors"
                  onClick={() => setOnboardingPrompt(label)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                ref={onboardingSubmitRef}
                type="button"
                className={pillBtnClass}
                onClick={submitOnboarding}
                disabled={onboardingBusy}
              >
                {onboardingBusy ? "Generating…" : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Excalidraw
        excalidrawAPI={handleExcalidrawApi}
        initialData={initialDataForExcalidraw as any}
        gridModeEnabled={gridModeEnabled}
        handleKeyboardGlobally={!aiOpen && !shareOpen && !onboardingOpen && !zoomEditing}
        onChange={handleChange}
        UIOptions={uiOptions}
      />
    </div>
  )
}

