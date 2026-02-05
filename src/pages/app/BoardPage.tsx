import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { Excalidraw } from "@excalidraw/excalidraw"
import "@excalidraw/excalidraw/index.css"
import { getWsUrl, useApi } from "../../lib/api"
import { useAuth } from "../../auth/AuthProvider"

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null
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
    autoResize: true,
  }
}

function inferTemplateKind(prompt: string) {
  const p = prompt.toLowerCase()
  if (/(retro|retrospective|post[- ]mortem|postmortem)/.test(p)) return "retro"
  if (/(kanban|to do|todo|doing|done|backlog)/.test(p)) return "kanban"
  if (/(brainstorm|ideation|ideas|mind map|mindmap)/.test(p)) return "brainstorm"
  if (/(sprint planning|planning|standup|meeting|workshop|kickoff|project)/.test(p)) return "kickoff"
  return "kickoff"
}

function generateTemplateElements(args: {
  prompt: string
  centerX: number
  centerY: number
  spec?: any
}) {
  const kind = String(args.spec?.kind || inferTemplateKind(args.prompt))
  const elements: any[] = []

  const cx = args.centerX
  const cy = args.centerY

  const title =
    typeof args.spec?.title === "string" && args.spec.title.trim()
      ? args.spec.title.trim()
      : args.prompt.trim()
        ? `AI Template: ${args.prompt.trim()}`
        : kind === "retro"
          ? "Retro"
          : kind === "kanban"
            ? "Kanban"
            : kind === "brainstorm"
              ? "Brainstorm"
              : "Project Kickoff"

  elements.push(
    makeTextElement({
      x: cx - 520,
      y: cy - 420,
      width: 1040,
      height: 44,
      text: title,
      fontFamily: 2,
      fontSize: 32,
      textAlign: "center",
      strokeColor: "#0f172a",
    })
  )

  if (kind === "kanban") {
    const boardX = cx - 600
    const boardY = cy - 340
    const colW = 380
    const colH = 560
    const gap = 30
    const cols: Array<{ title: string; cards: string[]; color?: string }> =
      Array.isArray(args.spec?.columns) && args.spec?.kind === "kanban"
        ? (args.spec.columns as any[]).map((c: any) => ({
            title: String(c?.title || "Column"),
            cards: Array.isArray(c?.cards) ? c.cards.map((s: any) => String(s)).filter(Boolean) : [],
            color: isHexColor(c?.color) ? c.color : undefined,
          }))
        : [
            { title: "To do", cards: ["Add a task…", "Add another task…"] },
            { title: "Doing", cards: ["In progress…", "Blocked? Add note…"] },
            { title: "Done", cards: ["Shipped…", "Validated…"] },
          ]

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
          x: x + 18,
          y: y + 16,
          width: colW - 36,
          height: 28,
          text: label.title,
          fontFamily: 2,
          fontSize: 20,
          strokeColor: "#0f172a",
        })
      )

      // A couple of starter "sticky" cards
      const stickyBg = label.color || "#FEF08A"
      const stickyStroke = label.color || "#EAB308"
      const cards = label.cards.length ? label.cards.slice(0, 6) : ["Add a task…", "Add another task…"]
      cards.forEach((text, n) => {
        const sy = y + 64 + n * 96
        elements.push(
          makeBaseElement("rectangle", {
            x: x + 18,
            y: sy,
            width: colW - 36,
            height: 76,
            strokeColor: stickyStroke,
            backgroundColor: stickyBg,
            roundness: { type: 3 },
            roughness: 0,
          })
        )
        elements.push(
          makeTextElement({
            x: x + 32,
            y: sy + 16,
            width: colW - 64,
            height: 44,
            text,
            fontFamily: 2,
            fontSize: 16,
            strokeColor: "#0f172a",
          })
        )
      })
    })
  } else if (kind === "retro") {
    const boardX = cx - 600
    const boardY = cy - 340
    const colW = 380
    const colH = 560
    const gap = 30
    const cols: Array<{ title: string; cards: string[]; color?: string }> =
      Array.isArray(args.spec?.columns) && args.spec?.kind === "retro"
        ? (args.spec.columns as any[]).map((c: any) => ({
            title: String(c?.title || "Column"),
            cards: Array.isArray(c?.cards) ? c.cards.map((s: any) => String(s)).filter(Boolean) : [],
            color: isHexColor(c?.color) ? c.color : undefined,
          }))
        : [
            { title: "Went well", cards: ["Add a note…", "Add a note…", "Add a note…"] },
            { title: "To improve", cards: ["Add a note…", "Add a note…", "Add a note…"] },
            { title: "Action items", cards: ["Add a note…", "Add a note…", "Add a note…"] },
          ]

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
          x: x + 18,
          y: y + 16,
          width: colW - 36,
          height: 28,
          text: label.title,
          fontFamily: 2,
          fontSize: 20,
          strokeColor: "#0f172a",
        })
      )

      // Starter sticky notes
      const fallbackBg = i === 0 ? "#BBF7D0" : i === 1 ? "#FED7AA" : "#DBEAFE"
      const fallbackStroke = i === 0 ? "#22C55E" : i === 1 ? "#F97316" : "#3B82F6"
      const stickyBg = label.color || fallbackBg
      const stickyStroke = label.color || fallbackStroke
      const cards = label.cards.length ? label.cards.slice(0, 10) : ["Add a note…", "Add a note…", "Add a note…"]
      cards.forEach((text, n) => {
        const sy = y + 64 + n * 86
        elements.push(
          makeBaseElement("rectangle", {
            x: x + 18,
            y: sy,
            width: colW - 36,
            height: 66,
            strokeColor: stickyStroke,
            backgroundColor: stickyBg,
            roundness: { type: 3 },
            roughness: 0,
          })
        )
        elements.push(
          makeTextElement({
            x: x + 32,
            y: sy + 14,
            width: colW - 64,
            height: 40,
            text,
            fontFamily: 2,
            fontSize: 16,
            strokeColor: "#0f172a",
          })
        )
      })
    })
  } else if (kind === "brainstorm") {
    const areaX = cx - 620
    const areaY = cy - 340
    elements.push(
      makeBaseElement("rectangle", {
        x: areaX,
        y: areaY,
        width: 1240,
        height: 560,
        strokeColor: "#cbd5e1",
        backgroundColor: "#ffffff",
        roundness: { type: 3 },
        roughness: 0,
      })
    )
    elements.push(
      makeTextElement({
        x: areaX + 18,
        y: areaY + 16,
        width: 1240 - 36,
        height: 28,
        text: "Brainstorm space",
        fontFamily: 2,
        fontSize: 20,
        strokeColor: "#0f172a",
      })
    )

    const stickyBg = "#FEF08A"
    const stickyStroke = "#EAB308"
    const startX = areaX + 40
    const startY = areaY + 74
    const cardW = 240
    const cardH = 120
    const gx = 24
    const gy = 24
    const prompts: string[] =
      Array.isArray(args.spec?.prompts) && args.spec?.kind === "brainstorm"
        ? (args.spec.prompts as any[]).map((s: any) => String(s)).filter(Boolean)
        : ["Idea…", "Idea…", "Idea…", "Idea…", "Idea…", "Idea…", "Idea…", "Idea…"]

    let idx = 0
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        const x = startX + c * (cardW + gx)
        const y = startY + r * (cardH + gy)
        const text = prompts[idx] || "Idea…"
        idx++
        elements.push(
          makeBaseElement("rectangle", {
            x,
            y,
            width: cardW,
            height: cardH,
            strokeColor: stickyStroke,
            backgroundColor: stickyBg,
            roundness: { type: 3 },
            roughness: 0,
          })
        )
        elements.push(
          makeTextElement({
            x: x + 14,
            y: y + 14,
            width: cardW - 28,
            height: cardH - 28,
            text,
            fontFamily: 2,
            fontSize: 18,
            strokeColor: "#0f172a",
          })
        )
      }
    }
  } else {
    // Kickoff / workshop default
    const x0 = cx - 620
    const y0 = cy - 340
    const cardW = 600
    const cardH = 170
    const gx = 40
    const gy = 28
    const cards: Array<{ title: string; hint: string }> =
      Array.isArray(args.spec?.sections) && args.spec?.kind === "kickoff"
        ? (args.spec.sections as any[])
            .map((s: any) => ({ title: String(s?.title || "Section"), hint: String(s?.hint || "") }))
            .filter((s) => Boolean(s.title) && Boolean(s.hint))
            .slice(0, 10)
        : [
            { title: "Goal", hint: "What are we trying to achieve?" },
            { title: "Audience / Users", hint: "Who is this for?" },
            { title: "Scope", hint: "In / Out of scope" },
            { title: "Constraints", hint: "Time, budget, tech, policy…" },
            { title: "Risks", hint: "What could block us?" },
            { title: "Next actions", hint: "Owners + due dates" },
          ]
    cards.forEach((c, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = x0 + col * (cardW + gx)
      const y = y0 + row * (cardH + gy)
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
          x: x + 20,
          y: y + 18,
          width: cardW - 40,
          height: 28,
          text: c.title,
          fontFamily: 2,
          fontSize: 20,
          strokeColor: "#0f172a",
        })
      )
      elements.push(
        makeTextElement({
          x: x + 20,
          y: y + 54,
          width: cardW - 40,
          height: cardH - 72,
          text: c.hint,
          fontFamily: 2,
          fontSize: 16,
          strokeColor: "#64748b",
        })
      )
    })
  }

  return elements
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

  const appState = {
    viewBackgroundColor,
    gridModeEnabled,
    zenModeEnabled,
    ...(theme ? { theme } : {}),
  }

  return { elements, files, appState }
}

export function BoardPage() {
  const { boardId } = useParams()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const backendApi = useApi()
  const { token } = useAuth()

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

  const toSerializableAppState = useCallback(
    (appState: any) => {
      return {
        viewBackgroundColor: appState?.viewBackgroundColor ?? "#ffffff",
        zenModeEnabled: Boolean(appState?.zenModeEnabled),
        gridModeEnabled: Boolean(gridModeEnabled),
        ...(typeof appState?.theme === "string" ? { theme: appState.theme } : {}),
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
        // If websocket is active, it already persists scenes server-side.
        const ws = wsRef.current
        if (ws && ws.readyState === WebSocket.OPEN && wsAuthedRef.current) return
        try {
          await backendApi.saveBoardScene(boardId, { scene })
        } catch {
          // ignore
        }
      }, 1200)
    },
    [backendApi, boardId]
  )

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

    const wsUrl = `${getWsUrl()}/ws`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    wsAuthedRef.current = false

    const close = () => {
      wsAuthedRef.current = false
      if (wsRef.current === ws) wsRef.current = null
    }

    ws.addEventListener("open", () => {
      try {
        ws.send(JSON.stringify({ type: "auth", token, boardId }))
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

    return () => {
      try {
        ws.close()
      } catch {
        // ignore
      }
      close()
    }
  }, [boardId, token])

  useEffect(() => {
    if (!boardId || !token) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await backendApi.getBoard(boardId)
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
    async (mode: "insert" | "replace") => {
      const api = apiRef.current
      if (!api?.getAppState || !api?.getSceneElements || !api?.updateScene) return

      const prompt = aiPrompt.trim()
      setAiBusy(true)
      setAiError(null)
      setAiNotice(null)
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
            spec = res?.spec
            if (spec) setAiNotice("Generated with Gemini.")
          } catch (err: any) {
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
            spec = undefined
          }
        }

        const nextTemplate = generateTemplateElements({ prompt, centerX, centerY, spec })
        const nextIds = nextTemplate.map((e: any) => e.id)

        const existing = api.getSceneElements() ?? []
        const nextElements = mode === "replace" ? nextTemplate : [...existing, ...nextTemplate]

        api.updateScene({
          elements: nextElements,
          appState: {
            ...appState,
            selectedElementIds: Object.fromEntries(nextIds.map((id: string) => [id, true])),
          },
          captureUpdate: "IMMEDIATELY",
        })

        if (api?.setActiveTool) api.setActiveTool({ type: "selection" })
        setAiOpen(false)
      } catch (e: any) {
        setAiError(e?.message || "Failed to generate template")
      } finally {
        setAiBusy(false)
      }
    },
    [aiPrompt, backendApi]
  )

  const handleChange = useCallback(
    (elements: any, appState: any, files: any) => {
      const scene = {
        elements,
        appState: toSerializableAppState(appState),
        files,
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

                    {(isDraw || activeToolType === "freedraw") && (
                      <button
                        type="button"
                        className={topIconBtnClass}
                        aria-label="Eraser"
                        title="Eraser"
                        onClick={() => {
                          setTopMenuOpen(null)
                          setTool("eraser")
                        }}
                      >
                        <PencilEraserIcon />
                      </button>
                    )}
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
          <button
            type="button"
            className={`${iconBtnClass} ${
              activeToolType === "freedraw" && freedrawMode === "pencil" ? iconBtnActiveClass : ""
            }`}
            onClick={() => {
              setFreedrawMode("pencil")
              setTool("freedraw")
            }}
            title="Pencil"
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            className={`${iconBtnClass} ${
              activeToolType === "freedraw" && freedrawMode === "highlighter" ? iconBtnActiveClass : ""
            }`}
            onClick={() => {
              // Highlighter ≈ freedraw with higher width + low opacity.
              updateAppState({
                currentItemStrokeWidth: 12,
                currentItemOpacity: 35,
                currentItemStrokeColor: "#facc15",
              })
              setFreedrawMode("highlighter")
              setTool("freedraw")
            }}
            title="Highlighter"
          >
            <HighlighterIcon />
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

      {/* Bottom-center AI template generator */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-50 -translate-x-1/2">
        <div className="pointer-events-auto inline-flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface/90 text-text-secondary shadow-md backdrop-blur hover:bg-toolbar hover:text-text-primary active:translate-y-px transition duration-fast"
            onClick={() => setAiOpen(true)}
            aria-label="AI template generator"
            title="AI template generator"
          >
            <AiSparklesIcon />
          </button>
          <button
            type="button"
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface/90 text-text-secondary shadow-md backdrop-blur hover:bg-toolbar hover:text-text-primary active:translate-y-px transition duration-fast"
            onClick={() => setShareOpen(true)}
            aria-label="Share board"
            title="Share board"
          >
            <ShareIcon />
          </button>
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
                  Enter an email address. We’ll grant access to collaborate on this board.
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
                  type="email"
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
                    setShareNotice("Shared. Send them the link above.")
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

      <Excalidraw
        excalidrawAPI={(api) => {
          apiRef.current = api
          if (!initialToolSetRef.current) {
            initialToolSetRef.current = true
            try {
              api.setActiveTool?.({ type: "hand" })
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
        }}
        initialData={initialDataForExcalidraw as any}
        gridModeEnabled={gridModeEnabled}
        handleKeyboardGlobally
        onChange={handleChange}
        UIOptions={uiOptions}
      />
    </div>
  )
}

