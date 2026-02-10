import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Excalidraw } from "@excalidraw/excalidraw"
import "@excalidraw/excalidraw/index.css"
import { getWsUrl, useApi } from "../../lib/api"
import { useAuth } from "../../auth/AuthProvider"
import { DEFAULT_FONT_ID, FONT_REGISTRY, getFontById, getFontsByCategory, type FontCategory } from "../../lib/fonts"

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

const CATEGORY_LABELS: Record<FontCategory, string> = {
  Sans: "Sans Serif",
  Serif: "Serif",
  Mono: "Monospace",
  Display: "Display",
}

function FontPicker({ value, onChange }: { value: number; onChange: (id: number) => void }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onOutside = (e: MouseEvent) => {
      if (buttonRef.current?.contains(e.target as Node) || panelRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    window.addEventListener("pointerdown", onOutside)
    return () => window.removeEventListener("pointerdown", onOutside)
  }, [open])

  const current = getFontById(value) ?? FONT_REGISTRY[0]
  const byCategory = getFontsByCategory()

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="flex min-w-[140px] items-center rounded-lg border border-border bg-surface px-2 py-1.5 text-left text-sm"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span style={{ fontFamily: current.fontFamily }}>{current.displayName}</span>
      </button>
      {open && (
        <div
          ref={panelRef}
          className="absolute left-0 top-full z-[100] mt-1 max-h-64 w-56 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-lg"
          role="listbox"
        >
          {(Object.keys(byCategory) as FontCategory[]).map((cat) => {
            const fonts = byCategory[cat]
            if (fonts.length === 0) return null
            return (
              <div key={cat} className="py-1">
                <div className="px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {CATEGORY_LABELS[cat]}
                </div>
                {fonts.map((font) => (
                  <button
                    key={font.id}
                    type="button"
                    className="flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-toolbar"
                    style={{ fontFamily: font.fontFamily }}
                    onClick={() => {
                      onChange(font.id)
                      setOpen(false)
                    }}
                    role="option"
                    aria-selected={value === font.id}
                  >
                    {font.displayName}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
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
    locked: false,
    text: opts.text,
    originalText: opts.text,
    fontSize,
    fontFamily: opts.fontFamily ?? DEFAULT_FONT_ID,
    textAlign: opts.textAlign ?? "left",
    verticalAlign: opts.verticalAlign ?? "top",
    baseline: Math.max(1, Math.round(fontSize * 0.9)),
    lineHeight: 1.25,
    containerId: null,
    autoResize: opts.autoResize !== false,
  }
}

/** Arrow or line element (no binding). Points from (x1,y1) to (x2,y2). */
function makeArrowLine(
  kind: "arrow" | "line",
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  opts?: { strokeColor?: string; strokeStyle?: "solid" | "dashed"; strokeWidth?: number }
) {
  const dx = x2 - x1
  const dy = y2 - y1
  const now = Date.now()
  return {
    id: randId(),
    type: kind,
    x: x1,
    y: y1,
    width: dx,
    height: dy,
    angle: 0,
    strokeColor: opts?.strokeColor ?? "#1f2937",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: opts?.strokeWidth ?? 2,
    strokeStyle: opts?.strokeStyle ?? "solid",
    roughness: 1,
    opacity: 100,
    points: [[0, 0], [dx, dy]],
    lastCommittedPoint: null,
    startArrowhead: kind === "arrow" ? "arrow" : null,
    endArrowhead: kind === "arrow" ? "arrow" : null,
    groupIds: [],
    frameId: null,
    roundness: null,
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

/** Sticky note: rounded rect + empty text. Returns two elements. */
function makeStickyNote(
  x: number,
  y: number,
  w: number,
  h: number,
  backgroundColor: string,
  pad = 12
): any[] {
  const rect = makeBaseElement("rectangle", {
    x,
    y,
    width: w,
    height: h,
    backgroundColor,
    strokeColor: "#e5e7eb",
    strokeWidth: 1,
    roundness: { type: 3 },
  })
  const textEl = makeTextElement({
    x: x + pad,
    y: y + pad,
    width: w - pad * 2,
    height: h - pad * 2,
    text: "",
    fontSize: 16,
    backgroundColor: "transparent",
  })
  return [rect, textEl]
}

/** Image placeholder: dashed rect, neutral fill (no text). */
function makeImagePlaceholder(x: number, y: number, w: number, h: number) {
  return makeBaseElement("rectangle", {
    x,
    y,
    width: w,
    height: h,
    strokeColor: "#9ca3af",
    backgroundColor: "#f3f4f6",
    strokeWidth: 1,
    strokeStyle: "dashed",
  })
}

/** Section/frame: light background fill for areas. */
function makeSection(
  x: number,
  y: number,
  w: number,
  h: number,
  opts?: { backgroundColor?: string; strokeColor?: string }
) {
  return makeBaseElement("rectangle", {
    x,
    y,
    width: w,
    height: h,
    backgroundColor: opts?.backgroundColor ?? "#f8fafc",
    strokeColor: opts?.strokeColor ?? "#e2e8f0",
    strokeWidth: 1,
  })
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

const TEMPLATE_CATEGORIES = [
  "Meetings & Workshops",
  "Ideation & Brainstorming",
  "Research & Design",
  "Agile Workflows",
  "Strategy & Planning",
  "Diagramming & Mapping",
  "Presentations & Slides",
  "Wireframing & Prototyping",
  "Image Creation",
] as const

const TEMPLATES_BY_CATEGORY: Record<string, Array<{ id: string; title: string; previewKind: string }>> = {
  "Meetings & Workshops": [
    { id: "project-review", title: "Project Review", previewKind: "blocks-3" },
    { id: "weekly-okr", title: "Workshop: Weekly OKR Meeting", previewKind: "kanban" },
    { id: "icebreaker", title: "Activity: Check-in Icebreaker", previewKind: "grid" },
    { id: "eisenhower", title: "Activity: Impact/Effort Matrix (Eisenhower)", previewKind: "quad" },
    { id: "4ls-retro", title: "4 L's Retrospective", previewKind: "blocks-4" },
    { id: "standup", title: "Daily Standup", previewKind: "timeline" },
    { id: "planning-poker", title: "Planning Poker", previewKind: "grid" },
  ],
  "Ideation & Brainstorming": [
    { id: "brainstorm-grid", title: "Brainstorm Grid", previewKind: "grid" },
    { id: "mind-map", title: "Mind Map", previewKind: "radial" },
    { id: "affinity", title: "Affinity Diagram", previewKind: "blocks-4" },
    { id: "scamper", title: "SCAMPER", previewKind: "list" },
    { id: "reverse-brainstorm", title: "Reverse Brainstorm", previewKind: "quad" },
  ],
  "Research & Design": [
    { id: "user-persona", title: "User Persona", previewKind: "blocks-3" },
    { id: "empathy-map", title: "Empathy Map", previewKind: "quad" },
    { id: "journey-map", title: "Journey Map", previewKind: "timeline" },
    { id: "swot", title: "SWOT Analysis", previewKind: "quad" },
  ],
  "Agile Workflows": [
    { id: "kanban-board", title: "Kanban Board", previewKind: "kanban" },
    { id: "sprint-backlog", title: "Sprint Backlog", previewKind: "list" },
    { id: "retro-board", title: "Retro Board", previewKind: "blocks-3" },
    { id: "story-map", title: "User Story Map", previewKind: "grid" },
  ],
  "Strategy & Planning": [
    { id: "okr", title: "OKR Board", previewKind: "blocks-3" },
    { id: "roadmap", title: "Roadmap", previewKind: "timeline" },
    { id: "goals", title: "Goals & Metrics", previewKind: "quad" },
  ],
  "Diagramming & Mapping": [
    { id: "flowchart", title: "Flow Chart", previewKind: "flow" },
    { id: "org-chart", title: "Org Chart", previewKind: "tree" },
    { id: "venn", title: "Venn Diagram", previewKind: "circles" },
  ],
  "Presentations & Slides": [
    { id: "slide-deck", title: "Slide Deck", previewKind: "slides" },
    { id: "pitch", title: "Pitch Outline", previewKind: "list" },
  ],
  "Wireframing & Prototyping": [
    { id: "wireframe", title: "Wireframe", previewKind: "blocks-3" },
    { id: "mockup", title: "Mockup Layout", previewKind: "grid" },
  ],
  "Image Creation": [
    { id: "moodboard", title: "Moodboard", previewKind: "grid" },
    { id: "reference", title: "Reference Board", previewKind: "grid" },
  ],
}

const G = 16
const GRID = 8
const STICKY_W = 140
const STICKY_H = 120
const SECTION_COLORS = { warm: "#fef3c7", blue: "#dbeafe", green: "#d1fae5", purple: "#e9d5ff", pink: "#fce7f3", indigo: "#e0e7ff" }
const STICKY_COLORS = ["#fef08a", "#bfdbfe", "#bbf7d0", "#fbcfe8", "#e9d5ff"]

function snap(n: number): number {
  return Math.round(n / GRID) * GRID
}

function buildComposedTemplate(id: string): any[] {
  const el = (x: number, y: number, w: number, h: number, opts?: Partial<{ backgroundColor: string; strokeColor: string; strokeStyle: "solid" | "dashed" }>) =>
    makeBaseElement("rectangle", { x: snap(x), y: snap(y), width: w, height: h, ...opts })
  const section = (x: number, y: number, w: number, h: number, bg?: string) =>
    makeSection(snap(x), snap(y), w, h, { backgroundColor: bg ?? SECTION_COLORS.warm })
  const sticky = (x: number, y: number, color: string) => makeStickyNote(snap(x), snap(y), STICKY_W, STICKY_H, color).flat()
  const img = (x: number, y: number, w: number, h: number) => makeImagePlaceholder(snap(x), snap(y), w, h)
  const arrow = (x1: number, y1: number, x2: number, y2: number, dashed?: boolean) =>
    makeArrowLine("arrow", snap(x1), snap(y1), snap(x2), snap(y2), { strokeStyle: dashed ? "dashed" : "solid" })
  const line = (x1: number, y1: number, x2: number, y2: number) => makeArrowLine("line", snap(x1), snap(y1), snap(x2), snap(y2))

  const elements: any[] = []

  switch (id) {
    case "project-review": {
      const h = 180
      const headH = 56
      const pad = G
      const contentWidth = 3 * STICKY_W + 2 * G
      const sectionW = contentWidth + pad * 2
      const contentTop = -h + headH + pad
      elements.push(section(-sectionW / 2, -h - pad, sectionW, headH), section(-sectionW / 2, contentTop, sectionW, h - headH - pad + 20))
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) elements.push(...sticky(-sectionW / 2 + pad + c * (STICKY_W + G), contentTop + pad + r * (STICKY_H + G), STICKY_COLORS[c % STICKY_COLORS.length]))
      break
    }
    case "weekly-okr": {
      const colW = 200
      const headH = 44
      for (let col = 0; col < 3; col++) {
        const cx = -300 + col * (colW + G)
        elements.push(section(cx, -120, colW, headH, SECTION_COLORS.blue))
        for (let r = 0; r < 3; r++) elements.push(...sticky(cx + 8, -120 + headH + G + r * (STICKY_H + 8), STICKY_COLORS[r % STICKY_COLORS.length]))
      }
      elements.push(arrow(-300 + colW, -98, -300 + colW + G, -98), arrow(-100 + colW, -98, -100 + colW + G, -98))
      break
    }
    case "icebreaker": {
      const cellW = 100
      const cellH = 72
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) elements.push(...sticky(-200 + c * (cellW + G), -100 + r * (cellH + G), STICKY_COLORS[(r + c) % STICKY_COLORS.length]))
      break
    }
    case "eisenhower": {
      const q = 180
      const gap = 12
      elements.push(section(-q - gap, -q - gap, q, q, "#fef3c7"), section(gap, -q - gap, q, q, "#dbeafe"), section(-q - gap, gap, q, q, "#d1fae5"), section(gap, gap, q, q, "#e9d5ff"))
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) elements.push(...sticky(-q - gap + 20 + j * (q + gap) + 16, -q - gap + 24 + i * (q + gap) + 16, STICKY_COLORS[(i * 2 + j) % STICKY_COLORS.length]))
      elements.push(arrow(-gap, 0, gap, 0), arrow(0, -gap, 0, gap))
      break
    }
    case "4ls-retro": {
      const colW = 200
      const labels = [SECTION_COLORS.warm, SECTION_COLORS.blue, SECTION_COLORS.green, SECTION_COLORS.purple]
      for (let col = 0; col < 4; col++) {
        const cx = -400 + col * (colW + G)
        elements.push(section(cx, -140, colW, 40, labels[col]))
        for (let r = 0; r < 2; r++) elements.push(...sticky(cx + 8, -96 + r * (STICKY_H + 8), STICKY_COLORS[col % STICKY_COLORS.length]))
      }
      break
    }
    case "standup": {
      const stepW = 160
      const boxW = 120
      const boxH = 64
      for (let i = 0; i < 4; i++) {
        const x = -280 + i * (stepW + G)
        elements.push(section(x, -40, boxW, boxH, SECTION_COLORS.blue))
        if (i < 3) elements.push(arrow(x + boxW, -8, x + boxW + G, -8))
      }
      elements.push(line(-320, 0, 320, 0))
      break
    }
    case "planning-poker": {
      const cardW = 72
      const cardH = 100
      for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) elements.push(el(-200 + c * (cardW + G), -60 + r * (cardH + G), cardW, cardH, { backgroundColor: STICKY_COLORS[c % STICKY_COLORS.length], strokeColor: "#e5e7eb" }))
      elements.push(section(-220, -180, 440, 48, SECTION_COLORS.purple))
      break
    }
    case "brainstorm-grid": {
      const pad = G
      const totalW = 4 * STICKY_W + 3 * pad
      const totalH = 3 * STICKY_H + 2 * pad
      const left = -totalW / 2
      const top = -totalH / 2
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) elements.push(...sticky(left + c * (STICKY_W + pad), top + r * (STICKY_H + pad), STICKY_COLORS[(r + c) % STICKY_COLORS.length]))
      break
    }
    case "mind-map": {
      const centerW = 100
      const centerH = 60
      elements.push(el(-centerW / 2, -centerH / 2, centerW, centerH, { backgroundColor: SECTION_COLORS.indigo }))
      const branches = [
        [-140, -80, -200, -120],
        [-140, 0, -200, 0],
        [-140, 80, -200, 120],
        [140, -80, 200, -120],
        [140, 0, 200, 0],
        [140, 80, 200, 120],
      ]
      branches.forEach(([x1, y1, x2, y2]) => {
        elements.push(arrow(x1, y1, x2, y2))
        elements.push(...sticky(x2 - STICKY_W / 2, y2 - STICKY_H / 2, STICKY_COLORS[Math.abs(x2) % STICKY_COLORS.length]))
      })
      break
    }
    case "affinity": {
      const zoneW = 220
      const zoneH = 160
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
        const bx = -250 + c * (zoneW + G)
        const by = -180 + r * (zoneH + G)
        elements.push(section(bx, by, zoneW, zoneH, [SECTION_COLORS.warm, SECTION_COLORS.blue, SECTION_COLORS.green, SECTION_COLORS.purple][r * 2 + c]))
        elements.push(...sticky(bx + 12, by + 12, STICKY_COLORS[(r + c) % STICKY_COLORS.length]))
        elements.push(...sticky(bx + 12 + STICKY_W + 8, by + 12, STICKY_COLORS[(r + c + 1) % STICKY_COLORS.length]))
      }
      break
    }
    case "scamper": {
      const colW = 140
      for (let col = 0; col < 5; col++) {
        const cx = -360 + col * (colW + G)
        elements.push(section(cx, -140, colW, 36, SECTION_COLORS.blue))
        elements.push(...sticky(cx + 8, -96, STICKY_COLORS[col % STICKY_COLORS.length]))
        if (col < 4) elements.push(arrow(cx + colW, -122, cx + colW + G, -122))
      }
      break
    }
    case "reverse-brainstorm": {
      const q = 160
      elements.push(section(-q - G, -q - G, q, q, "#fef3c7"), section(G, -q - G, q, q, "#dbeafe"), section(-q - G, G, q, q, "#d1fae5"), section(G, G, q, q, "#e9d5ff"))
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) elements.push(...sticky(-q - G + 16 + j * (q + G) + 12, -q - G + 16 + i * (q + G) + 12, STICKY_COLORS[(i * 2 + j) % STICKY_COLORS.length]))
      break
    }
    case "empathy-map": {
      const w = 140
      const h = 100
      elements.push(section(-w - G, -h - G, w * 2 + G * 2, 40, SECTION_COLORS.purple))
      elements.push(section(-w - G, -h - G, w, h, "#fef3c7"), section(G, -h - G, w, h, "#dbeafe"), section(-w - G, G, w, h, "#d1fae5"), section(G, G, w, h, "#e9d5ff"))
      elements.push(...sticky(-w - G + 12, -h - G + 48, STICKY_COLORS[0]), ...sticky(G + 12, -h - G + 48, STICKY_COLORS[1]), ...sticky(-w - G + 12, G + 12, STICKY_COLORS[2]), ...sticky(G + 12, G + 12, STICKY_COLORS[3]))
      break
    }
    case "user-persona": {
      const personaImgW = 120
      const personaImgH = 140
      const personaHeaderH = 44
      const blockW = 240
      const blockH = 72
      const topY = -140
      elements.push(img(-personaImgW - G, topY, personaImgW, personaImgH))
      elements.push(section(personaImgW + G, topY, 380, personaHeaderH, SECTION_COLORS.blue))
      const blockTop = topY + personaHeaderH + G
      for (let i = 0; i < 4; i++) elements.push(section(-blockW - G / 2 + (i % 2) * (blockW + G), blockTop + Math.floor(i / 2) * (blockH + G), blockW, blockH, SECTION_COLORS.warm))
      break
    }
    case "journey-map": {
      const stageW = 140
      const stageH = 80
      for (let i = 0; i < 4; i++) {
        const x = -280 + i * (stageW + G)
        elements.push(section(x, -60, stageW, stageH, SECTION_COLORS.blue))
        if (i < 3) elements.push(arrow(x + stageW, -20, x + stageW + G, -20))
      }
      elements.push(line(-320, 20, 320, 20))
      elements.push(...sticky(-260, 40, STICKY_COLORS[0]), ...sticky(-100, 40, STICKY_COLORS[1]), ...sticky(60, 40, STICKY_COLORS[2]), ...sticky(220, 40, STICKY_COLORS[3]))
      break
    }
    case "swot": {
      const q = 160
      const g = 12
      const colors = [SECTION_COLORS.green, SECTION_COLORS.blue, SECTION_COLORS.warm, SECTION_COLORS.purple]
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) elements.push(section(-q - g + c * (q + g), -q - g + r * (q + g), q, q, colors[r * 2 + c]))
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) elements.push(...sticky(-q - g + c * (q + g) + 16, -q - g + r * (q + g) + 16, STICKY_COLORS[(r * 2 + c) % STICKY_COLORS.length]))
      break
    }
    case "kanban-board": {
      const colW = 180
      const headH = 40
      for (let col = 0; col < 4; col++) {
        const cx = -300 + col * (colW + G)
        elements.push(section(cx, -120, colW, headH, SECTION_COLORS.blue))
        for (let r = 0; r < 3; r++) elements.push(el(cx + 8, -120 + headH + G + r * 52, colW - 16, 44, { backgroundColor: "#fff", strokeColor: "#e2e8f0" }))
        if (col < 3) elements.push(arrow(cx + colW, -100, cx + colW + G, -100))
      }
      break
    }
    case "sprint-backlog": {
      elements.push(section(-280, -180, 560, 48, SECTION_COLORS.blue))
      for (let i = 0; i < 6; i++) elements.push(el(-260 + (i % 2) * 260, -120 + Math.floor(i / 2) * 56, 240, 48, { backgroundColor: "#fff", strokeColor: "#e2e8f0" }))
      for (let i = 0; i < 3; i++) elements.push(arrow(-20, -120 + i * 56, 20, -120 + i * 56, true))
      break
    }
    case "retro-board": {
      const colW = 200
      const labels = [SECTION_COLORS.warm, SECTION_COLORS.blue, SECTION_COLORS.green]
      for (let col = 0; col < 3; col++) {
        const cx = -320 + col * (colW + G)
        elements.push(section(cx, -140, colW, 44, labels[col]))
        for (let r = 0; r < 2; r++) elements.push(...sticky(cx + 8, -88 + r * (STICKY_H + 8), STICKY_COLORS[col % STICKY_COLORS.length]))
      }
      break
    }
    case "story-map": {
      const rowH = 120
      const rowGap = G
      elements.push(section(-320, -200, 640, 40, SECTION_COLORS.purple))
      for (let r = 0; r < 3; r++) {
        const rowTop = -152 + r * (rowH + rowGap)
        elements.push(section(-320, rowTop, 640, rowH, r === 0 ? SECTION_COLORS.blue : "#f8fafc"))
        for (let c = 0; c < 5; c++) elements.push(...sticky(-280 + c * (STICKY_W + 8), rowTop + 12, STICKY_COLORS[(r + c) % STICKY_COLORS.length]))
      }
      break
    }
    case "okr": {
      elements.push(section(-320, -160, 640, 52, SECTION_COLORS.indigo))
      elements.push(section(-320, -96, 300, 120, SECTION_COLORS.blue))
      elements.push(section(20, -96, 300, 120, SECTION_COLORS.green))
      elements.push(...sticky(-300, -76, STICKY_COLORS[0]), ...sticky(-300, 20, STICKY_COLORS[1]), ...sticky(40, -76, STICKY_COLORS[2]))
      break
    }
    case "roadmap": {
      const phaseW = 160
      for (let i = 0; i < 4; i++) {
        const x = -300 + i * (phaseW + G)
        elements.push(section(x, -50, phaseW, 60, SECTION_COLORS.blue))
        if (i < 3) elements.push(arrow(x + phaseW, -20, x + phaseW + G, -20))
      }
      elements.push(line(-320, 30, 320, 30))
      elements.push(...sticky(-260, 50, STICKY_COLORS[0]), ...sticky(-80, 50, STICKY_COLORS[1]), ...sticky(100, 50, STICKY_COLORS[2]), ...sticky(236, 50, STICKY_COLORS[3]))
      break
    }
    case "goals": {
      elements.push(section(-300, -140, 280, 100, SECTION_COLORS.blue))
      elements.push(section(20, -140, 280, 100, SECTION_COLORS.green))
      elements.push(...sticky(-280, -120, STICKY_COLORS[0]), ...sticky(-280, 20, STICKY_COLORS[1]), ...sticky(40, -120, STICKY_COLORS[2]))
      elements.push(arrow(-20, -90, 20, -90))
      break
    }
    case "flowchart": {
      const boxW = 100, boxH = 44
      const centers: [number, number][] = [[-70, -88], [-70, 0], [-70, 88]]
      centers.forEach(([cx, cy]) => elements.push(el(cx - boxW / 2, cy - boxH / 2, boxW, boxH, { backgroundColor: SECTION_COLORS.blue })))
      elements.push(arrow(-70, -44, -70, -22), arrow(-70, 22, -70, 44))
      break
    }
    case "org-chart": {
      const boxW = 90
      const boxH = 40
      elements.push(el(-boxW / 2, -80, boxW, boxH, { backgroundColor: SECTION_COLORS.indigo }))
      elements.push(el(-120, 20, boxW, boxH, { backgroundColor: SECTION_COLORS.blue }))
      elements.push(el(30, 20, boxW, boxH, { backgroundColor: SECTION_COLORS.blue }))
      elements.push(arrow(0, -40, -45, 0), arrow(0, -40, 45, 0))
      break
    }
    case "venn": {
      const r = 70
      elements.push(makeBaseElement("ellipse", { x: -r - 30, y: -r / 2, width: r * 2, height: r * 2, backgroundColor: "#dbeafe", strokeColor: "#1e40af", opacity: 80 }))
      elements.push(makeBaseElement("ellipse", { x: -20, y: -r / 2, width: r * 2, height: r * 2, backgroundColor: "#d1fae5", strokeColor: "#047857", opacity: 80 }))
      elements.push(makeBaseElement("ellipse", { x: 30, y: -r / 2, width: r * 2, height: r * 2, backgroundColor: "#fef3c7", strokeColor: "#b45309", opacity: 80 }))
      break
    }
    case "slide-deck": {
      const slideW = 160
      const slideH = 100
      for (let i = 0; i < 3; i++) elements.push(section(-260 + i * (slideW + G), -60, slideW, slideH, "#fff"))
      for (let i = 0; i < 3; i++) elements.push(img(-250 + i * (slideW + G), -50, 140, 60))
      elements.push(arrow(-100, 50, -100 + G, 50))
      break
    }
    case "pitch": {
      elements.push(section(-280, -160, 560, 44, SECTION_COLORS.purple))
      for (let i = 0; i < 4; i++) elements.push(section(-260, -100 + i * 56, 520, 48, "#f8fafc"))
      for (let i = 0; i < 3; i++) elements.push(arrow(0, -72 + i * 56, 0, -44 + (i + 1) * 56))
      break
    }
    case "wireframe": {
      const headerH = 40
      const contentH = 200
      const wirePad = G
      elements.push(el(-240 - wirePad, -120 - wirePad, 200 + wirePad * 2, headerH, { backgroundColor: "#fff", strokeColor: "#e2e8f0" }))
      elements.push(el(-240 - wirePad, -120 + headerH, 440 + wirePad * 2, contentH, { backgroundColor: "#fff", strokeColor: "#e2e8f0" }))
      elements.push(img(-220, -40, 160, 120))
      elements.push(el(-40, -40, 200, 36, { backgroundColor: "#fff", strokeColor: "#e2e8f0" }))
      break
    }
    case "mockup": {
      const cellW = 160
      const cellH = 120
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) elements.push(img(-260 + c * (cellW + G), -140 + r * (cellH + G), cellW, cellH))
      elements.push(section(-280, -180, 560, 44, "#f1f5f9"))
      break
    }
    case "moodboard": {
      const cellW = 140
      const cellH = 120
      const totalW = 4 * cellW + 3 * G
      const totalH = 3 * cellH + 2 * G
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) elements.push(img(-totalW / 2 + c * (cellW + G), -totalH / 2 + r * (cellH + G), cellW, cellH))
      break
    }
    case "reference": {
      const refImgW = 160
      const refImgH = 120
      const refGap = G
      const row1Y = -refImgH - refGap
      const totalImgW = 3 * refImgW + 2 * refGap
      const left = -totalImgW / 2
      elements.push(img(left, row1Y, refImgW, refImgH))
      elements.push(img(left + refImgW + refGap, row1Y, refImgW, refImgH))
      elements.push(img(left + 2 * (refImgW + refGap), row1Y, refImgW, refImgH))
      const stickyY = row1Y + refImgH + refGap
      elements.push(...sticky(left, stickyY, STICKY_COLORS[0]))
      elements.push(...sticky(left + refImgW + refGap, stickyY, STICKY_COLORS[1]))
      break
    }
    default:
      return []
  }
  return elements.flat()
}

function getTemplatesForCategory(category: string): Array<{ id: string; title: string; previewKind: string }> {
  return TEMPLATES_BY_CATEGORY[category] ?? []
}

const FORMATS_TOP_LEVEL = ["Doc", "Slides", "Table", "Timeline", "Kanban", "Flow Chart"] as const
const FORMATS_SUB_OPTIONS: Record<string, string[]> = {
  Doc: ["Blank Document", "Project Brief", "Meeting Notes", "Product Requirements", "Research Summary"],
  Slides: ["Title Slide", "Section Slides", "Pitch Deck", "Presentation Outline"],
  Table: ["Simple Table", "Comparison Table", "Planning Table", "Metrics Table"],
  Timeline: ["Horizontal Timeline", "Vertical Timeline", "Milestone Timeline", "Roadmap Timeline"],
  Kanban: ["Basic Kanban", "Scrum Board", "Personal Task Board", "Team Workflow"],
  "Flow Chart": ["Basic Flow", "Decision Tree", "Process Flow", "Swimlane Flow"],
}

const FORMATS_GAP = 16
const FORMATS_GRID = 8
function snapFormats(n: number) {
  return Math.round(n / FORMATS_GRID) * FORMATS_GRID
}

/** Build format-specific elements (origin at 0,0). Caller centers and groups on insert. */
function buildFormatsStructure(kind: string): any[] {
  const topLevelToSub: Record<string, string> = {
    Doc: "Blank Document",
    Slides: "Title Slide",
    Table: "Simple Table",
    Timeline: "Horizontal Timeline",
    Kanban: "Basic Kanban",
    "Flow Chart": "Basic Flow",
  }
  const subKind = topLevelToSub[kind] ?? kind
  const el = (x: number, y: number, w: number, h: number, opts?: Partial<{ backgroundColor: string; strokeColor: string }>) =>
    makeBaseElement("rectangle", { x: snapFormats(x), y: snapFormats(y), width: w, height: h, backgroundColor: opts?.backgroundColor ?? "#f8fafc", strokeColor: opts?.strokeColor ?? "#e2e8f0", strokeWidth: 1 })
  const txt = (x: number, y: number, w: number, h: number, text: string, fontSize = 14) =>
    makeTextElement({ x: snapFormats(x), y: snapFormats(y), width: w, height: h, text, fontSize, fontFamily: DEFAULT_FONT_ID })
  const arrow = (x1: number, y1: number, x2: number, y2: number) =>
    makeArrowLine("arrow", snapFormats(x1), snapFormats(y1), snapFormats(x2), snapFormats(y2))
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    makeArrowLine("line", snapFormats(x1), snapFormats(y1), snapFormats(x2), snapFormats(y2))
  const boxW = 100
  const boxH = 44
  const elements: any[] = []

  switch (subKind) {
    case "Blank Document": {
      const w = 320, h = 400
      elements.push(el(-w / 2, -h / 2, w, h, { backgroundColor: "#ffffff", strokeColor: "#e2e8f0" }))
      elements.push(txt(-w / 2 + 24, -h / 2 + 24, w - 48, 32, "Title", 18))
      elements.push(txt(-w / 2 + 24, -h / 2 + 72, w - 48, h - 120, "Start typing…", 14))
      break
    }
    case "Project Brief": {
      const w = 340, top = -200
      elements.push(el(-w / 2, top, w, 380, { backgroundColor: "#ffffff", strokeColor: "#e2e8f0" }))
      elements.push(txt(-w / 2 + 20, top + 16, w - 40, 28, "Project Brief", 20))
      const sections = ["Overview", "Goals", "Scope", "Timeline", "Team"]
      sections.forEach((s, i) => { elements.push(txt(-w / 2 + 20, top + 56 + i * 56, w - 40, 24, s, 16)); elements.push(txt(-w / 2 + 20, top + 84 + i * 56, w - 40, 28, "", 14)) })
      break
    }
    case "Meeting Notes": {
      const w = 320, top = -180
      elements.push(el(-w / 2, top, w, 360, { backgroundColor: "#ffffff", strokeColor: "#e2e8f0" }))
      elements.push(txt(-w / 2 + 20, top + 16, w - 40, 24, "Meeting Notes", 18))
      elements.push(txt(-w / 2 + 20, top + 52, w - 40, 24, "Date / Attendees", 12))
      for (let i = 0; i < 4; i++) elements.push(txt(-w / 2 + 20, top + 88 + i * 52, w - 40, 44, "• ", 14))
      break
    }
    case "Product Requirements": {
      const w = 340, top = -200
      elements.push(el(-w / 2, top, w, 400, { backgroundColor: "#ffffff", strokeColor: "#e2e8f0" }))
      elements.push(txt(-w / 2 + 20, top + 16, w - 40, 28, "Product Requirements", 20))
      const rows = ["User stories", "Acceptance criteria", "Constraints", "Out of scope"]
      rows.forEach((s, i) => { elements.push(txt(-w / 2 + 20, top + 56 + i * 72, w - 40, 22, s, 14)); elements.push(txt(-w / 2 + 20, top + 82 + i * 72, w - 40, 44, "", 12)) })
      break
    }
    case "Research Summary": {
      const w = 320, top = -180
      elements.push(el(-w / 2, top, w, 360, { backgroundColor: "#ffffff", strokeColor: "#e2e8f0" }))
      elements.push(txt(-w / 2 + 20, top + 16, w - 40, 26, "Research Summary", 18))
      elements.push(txt(-w / 2 + 20, top + 54, w - 40, 22, "Key findings", 14))
      elements.push(txt(-w / 2 + 20, top + 84, w - 40, 120, "", 12))
      elements.push(txt(-w / 2 + 20, top + 216, w - 40, 22, "Recommendations", 14))
      elements.push(txt(-w / 2 + 20, top + 246, w - 40, 90, "", 12))
      break
    }
    case "Title Slide": {
      const slideW = 280, slideH = 180
      elements.push(el(-slideW / 2, -slideH / 2, slideW, slideH, { backgroundColor: "#ffffff", strokeColor: "#e2e8f0" }))
      elements.push(txt(-slideW / 2 + 24, -slideH / 2 + 40, slideW - 48, 36, "Title", 28))
      elements.push(txt(-slideW / 2 + 24, -slideH / 2 + 90, slideW - 48, 28, "Subtitle", 16))
      break
    }
    case "Section Slides": {
      const slideW = 240, slideH = 140, gap = 24
      for (let i = 0; i < 3; i++) {
        const x = -slideW - gap / 2 + i * (slideW + gap)
        elements.push(el(x, -slideH / 2, slideW, slideH, { backgroundColor: "#ffffff", strokeColor: "#e2e8f0" }))
        elements.push(txt(x + 16, -slideH / 2 + 20, slideW - 32, 24, `Section ${i + 1}`, 16))
        elements.push(txt(x + 16, -slideH / 2 + 52, slideW - 32, 80, "", 12))
      }
      break
    }
    case "Pitch Deck": {
      const slideW = 200, slideH = 120, gap = 20
      for (let i = 0; i < 5; i++) {
        const x = -2 * (slideW + gap) + i * (slideW + gap)
        elements.push(el(x, -slideH / 2, slideW, slideH, { backgroundColor: "#ffffff", strokeColor: "#e2e8f0" }))
        elements.push(txt(x + 12, -slideH / 2 + 16, slideW - 24, 24, i === 0 ? "Title" : `Slide ${i + 1}`, 14))
      }
      break
    }
    case "Presentation Outline": {
      const slideW = 220, slideH = 100, gap = 16
      for (let i = 0; i < 4; i++) {
        const y = -180 + i * (slideH + gap)
        elements.push(el(-slideW / 2, y, slideW, slideH, { backgroundColor: "#ffffff", strokeColor: "#e2e8f0" }))
        elements.push(txt(-slideW / 2 + 16, y + 16, slideW - 32, 24, i === 0 ? "Intro" : i === 3 ? "Conclusion" : `Point ${i}`, 14))
      }
      break
    }
    case "Simple Table": {
      const cols = 3, rows = 4, cw = 90, rh = 36
      const totalW = cols * cw + (cols - 1) * 2
      const totalH = rows * rh + (rows - 1) * 2
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = -totalW / 2 + c * (cw + 2)
        const y = -totalH / 2 + r * (rh + 2)
        elements.push(el(x, y, cw, rh, { backgroundColor: r === 0 ? "#f1f5f9" : "#ffffff", strokeColor: "#e2e8f0" }))
        elements.push(txt(x + 6, y + 8, cw - 12, rh - 16, r === 0 ? `Col ${c + 1}` : "", 12))
      }
      break
    }
    case "Comparison Table": {
      const cw = 140, rh = 40
      const labels = ["Feature", "Option A", "Option B"]
      for (let c = 0; c < 3; c++) {
        elements.push(el(-cw * 1.5 - 8 + c * (cw + 4), -82, cw, 36, { backgroundColor: "#e2e8f0", strokeColor: "#cbd5e1" }))
        elements.push(txt(-cw * 1.5 - 8 + c * (cw + 4) + 8, -76, cw - 16, 24, labels[c], 14))
        for (let r = 0; r < 4; r++) {
          const y = -42 + r * (rh + 2)
          elements.push(el(-cw * 1.5 - 8 + c * (cw + 4), y, cw, rh, { backgroundColor: "#ffffff", strokeColor: "#e2e8f0" }))
          elements.push(txt(-cw * 1.5 - 8 + c * (cw + 4) + 8, y + 10, cw - 16, 22, "", 12))
        }
      }
      break
    }
    case "Planning Table": {
      const cw = 88, rh = 36
      const headers = ["Task", "Owner", "Due", "Status"]
      for (let c = 0; c < 4; c++) {
        elements.push(el(-180 + c * (cw + 4), -78, cw, 32, { backgroundColor: "#dbeafe", strokeColor: "#93c5fd" }))
        elements.push(txt(-180 + c * (cw + 4) + 6, -72, cw - 12, 20, headers[c], 12))
        for (let r = 0; r < 4; r++) {
          const y = -42 + r * (rh + 2)
          elements.push(el(-180 + c * (cw + 4), y, cw, rh, { backgroundColor: "#ffffff", strokeColor: "#e2e8f0" }))
          elements.push(txt(-180 + c * (cw + 4) + 6, y + 8, cw - 12, 22, "", 11))
        }
      }
      break
    }
    case "Metrics Table": {
      const w = 200, h = 120
      elements.push(el(-w / 2, -h / 2, w, h, { backgroundColor: "#ffffff", strokeColor: "#e2e8f0" }))
      elements.push(txt(-w / 2 + 12, -h / 2 + 12, w - 24, 22, "Metric", 12))
      elements.push(txt(-w / 2 + 12, -h / 2 + 38, w - 24, 22, "Value", 12))
      elements.push(txt(-w / 2 + 12, -h / 2 + 64, w - 24, 22, "Target", 12))
      elements.push(txt(-w / 2 + 12, -h / 2 + 90, w - 24, 22, "Status", 12))
      break
    }
    case "Horizontal Timeline": {
      const len = 320
      elements.push(line(-len / 2, 0, len / 2, 0))
      for (let i = 0; i < 4; i++) {
        const x = -len / 2 + (i + 1) * (len / 5)
        elements.push(el(x - 8, -8, 16, 16, { backgroundColor: "#3b82f6", strokeColor: "#2563eb" }))
        elements.push(txt(x - 40, 24, 80, 32, `Step ${i + 1}`, 12))
      }
      break
    }
    case "Vertical Timeline": {
      const len = 240
      elements.push(line(0, -len / 2, 0, len / 2))
      for (let i = 0; i < 4; i++) {
        const y = -len / 2 + (i + 1) * (len / 5)
        elements.push(el(-8, y - 8, 16, 16, { backgroundColor: "#3b82f6", strokeColor: "#2563eb" }))
        elements.push(txt(24, y - 10, 90, 24, `Step ${i + 1}`, 12))
      }
      break
    }
    case "Milestone Timeline": {
      const len = 360
      elements.push(line(-len / 2, 0, len / 2, 0))
      for (let i = 0; i < 5; i++) {
        const x = -len / 2 + (i + 0.5) * (len / 5)
        elements.push(el(x - 12, -12, 24, 24, { backgroundColor: "#8b5cf6", strokeColor: "#7c3aed" }))
        elements.push(txt(x - 35, 28, 70, 36, `M${i + 1}`, 11))
      }
      break
    }
    case "Roadmap Timeline": {
      const len = 320
      elements.push(line(-len / 2, 20, len / 2, 20))
      const phases = ["Q1", "Q2", "Q3", "Q4"]
      for (let i = 0; i < 4; i++) {
        const x = -len / 2 + (i + 0.5) * (len / 4)
        elements.push(el(x - 28, -24, 56, 32, { backgroundColor: "#dbeafe", strokeColor: "#93c5fd" }))
        elements.push(txt(x - 20, -16, 40, 20, phases[i], 12))
        elements.push(txt(x - 35, 48, 70, 44, "", 11))
      }
      break
    }
    case "Basic Kanban": {
      const colW = 140, cardW = 120, cardH = 56
      const cols = ["To Do", "Doing", "Done"]
      cols.forEach((label, c) => {
        const x = -colW * 1.5 - FORMATS_GAP + c * (colW + FORMATS_GAP)
        elements.push(el(x, -100, colW, 32, { backgroundColor: "#e2e8f0", strokeColor: "#cbd5e1" }))
        elements.push(txt(x + 8, -94, colW - 16, 20, label, 14))
        for (let r = 0; r < 2; r++) {
          elements.push(el(x + (colW - cardW) / 2, -56 + r * (cardH + 8), cardW, cardH, { backgroundColor: "#ffffff", strokeColor: "#e2e8f0" }))
          elements.push(txt(x + (colW - cardW) / 2 + 8, -56 + r * (cardH + 8) + 12, cardW - 16, 34, "", 12))
        }
      })
      break
    }
    case "Scrum Board": {
      const colW = 150, cardW = 130, cardH = 52
      const cols = ["To Do", "In Progress", "Done"]
      cols.forEach((label, c) => {
        const x = -225 + c * (colW + FORMATS_GAP)
        elements.push(el(x, -94, colW, 36, { backgroundColor: "#dbeafe", strokeColor: "#93c5fd" }))
        elements.push(txt(x + 10, -86, colW - 20, 22, label, 14))
        const n = c === 1 ? 3 : 2
        for (let r = 0; r < n; r++) {
          elements.push(el(x + (colW - cardW) / 2, -50 + r * (cardH + 8), cardW, cardH, { backgroundColor: "#ffffff", strokeColor: "#e2e8f0" }))
          elements.push(txt(x + (colW - cardW) / 2 + 8, -50 + r * (cardH + 8) + 10, cardW - 16, 34, "", 12))
        }
      })
      break
    }
    case "Personal Task Board": {
      const colW = 120, cardW = 100, cardH = 44
      const cols = ["Backlog", "This Week", "Done"]
      cols.forEach((label, c) => {
        const x = -180 + c * (colW + FORMATS_GAP)
        elements.push(el(x, -80, colW, 28, { backgroundColor: "#f1f5f9", strokeColor: "#e2e8f0" }))
        elements.push(txt(x + 6, -74, colW - 12, 18, label, 12))
        for (let r = 0; r < 2; r++) {
          elements.push(el(x + (colW - cardW) / 2, -48 + r * (cardH + 6), cardW, cardH, { backgroundColor: "#ffffff", strokeColor: "#e2e8f0" }))
          elements.push(txt(x + (colW - cardW) / 2 + 6, -48 + r * (cardH + 6) + 10, cardW - 12, 26, "", 11))
        }
      })
      break
    }
    case "Team Workflow": {
      const colW = 130, cardW = 110, cardH = 48
      const cols = ["Requested", "In Progress", "Review", "Done"]
      cols.forEach((label, c) => {
        const x = -270 + c * (colW + FORMATS_GAP)
        elements.push(el(x, -88, colW, 30, { backgroundColor: "#e0e7ff", strokeColor: "#a5b4fc" }))
        elements.push(txt(x + 8, -82, colW - 16, 20, label, 12))
        for (let r = 0; r < 2; r++) {
          elements.push(el(x + (colW - cardW) / 2, -52 + r * (cardH + 6), cardW, cardH, { backgroundColor: "#ffffff", strokeColor: "#e2e8f0" }))
          elements.push(txt(x + (colW - cardW) / 2 + 6, -52 + r * (cardH + 6) + 12, cardW - 12, 28, "", 11))
        }
      })
      break
    }
    case "Basic Flow": {
      const boxW = 100, boxH = 44
      const centers: [number, number][] = [[0, -88], [0, 0], [0, 88]]
      const labels = ["Start", "Process", "End"]
      centers.forEach(([cx, cy], i) => {
        const x = cx - boxW / 2, y = cy - boxH / 2
        elements.push(el(x, y, boxW, boxH, { backgroundColor: "#dbeafe", strokeColor: "#3b82f6" }))
        elements.push(txt(x + 8, y + 12, boxW - 16, boxH - 24, labels[i], 16))
      })
      elements.push(arrow(0, -44, 0, -22), arrow(0, 22, 0, 44))
      break
    }
    case "Decision Tree": {
      const boxW = 80, boxH = 40, dia = 72
      const dx = -dia / 2, dy = -80
      elements.push(makeBaseElement("diamond", { x: dx, y: dy, width: dia, height: dia, backgroundColor: "#fef3c7", strokeColor: "#eab308" }))
      elements.push(txt(dx + 12, dy + 22, dia - 24, 28, "Decision?", 14))
      const yesX = -124
      const noX = 44
      const branchY = 20
      elements.push(el(yesX, branchY - boxH / 2, boxW, boxH, { backgroundColor: "#d1fae5", strokeColor: "#10b981" }))
      elements.push(txt(yesX + 6, branchY - boxH / 2 + 10, boxW - 12, 24, "Yes", 14))
      elements.push(el(noX, branchY - boxH / 2, boxW, boxH, { backgroundColor: "#fee2e2", strokeColor: "#ef4444" }))
      elements.push(txt(noX + 6, branchY - boxH / 2 + 10, boxW - 12, 24, "No", 14))
      elements.push(arrow(-36, -44, yesX + boxW, 0), arrow(36, -44, noX, 0))
      break
    }
    case "Process Flow": {
      const boxW = 90, boxH = 44, gap = 4
      const labels = ["Input", "Process", "Review", "Output"]
      const totalW = 4 * boxW + 3 * gap
      const cx = -totalW / 2
      for (let i = 0; i < 4; i++) {
        const x = cx + i * (boxW + gap), y = -boxH / 2
        elements.push(el(x, y, boxW, boxH, { backgroundColor: "#dbeafe", strokeColor: "#3b82f6" }))
        elements.push(txt(x + 6, y + 12, boxW - 12, boxH - 24, labels[i], 14))
      }
      elements.push(arrow(cx + boxW, 0, cx + boxW + gap, 0), arrow(cx + boxW + gap + boxW, 0, cx + 2 * (boxW + gap), 0), arrow(cx + 2 * (boxW + gap) + boxW, 0, cx + 3 * (boxW + gap), 0))
      break
    }
    case "Swimlane Flow": {
      const laneW = 320, laneH = 80, headerH = 28, boxW = 80, boxH = 44, gap = 4
      const left = -laneW / 2, topA = -laneH - headerH - 8
      elements.push(el(left, topA, laneW, headerH, { backgroundColor: "#e2e8f0", strokeColor: "#94a3b8" }))
      elements.push(txt(left + 12, topA + 6, 100, 18, "Lane A", 14))
      elements.push(el(left, topA + headerH, laneW, laneH, { backgroundColor: "#f8fafc", strokeColor: "#e2e8f0" }))
      const a1X = left + 40, a2X = left + 40 + boxW + gap
      const aY = topA + headerH + (laneH - boxH) / 2
      elements.push(el(a1X, aY, boxW, boxH, { backgroundColor: "#dbeafe", strokeColor: "#3b82f6" }))
      elements.push(txt(a1X + 6, aY + 12, boxW - 12, 24, "Step 1", 14))
      elements.push(el(a2X, aY, boxW, boxH, { backgroundColor: "#dbeafe", strokeColor: "#3b82f6" }))
      elements.push(txt(a2X + 6, aY + 12, boxW - 12, 24, "Step 2", 14))
      elements.push(arrow(a1X + boxW, aY + boxH / 2, a2X, aY + boxH / 2))
      const topB = 8
      elements.push(el(left, topB, laneW, headerH, { backgroundColor: "#e2e8f0", strokeColor: "#94a3b8" }))
      elements.push(txt(left + 12, topB + 6, 100, 18, "Lane B", 14))
      elements.push(el(left, topB + headerH, laneW, laneH, { backgroundColor: "#f8fafc", strokeColor: "#e2e8f0" }))
      const bX = left + 40, bY = topB + headerH + (laneH - boxH) / 2
      elements.push(el(bX, bY, boxW, boxH, { backgroundColor: "#d1fae5", strokeColor: "#10b981" }))
      elements.push(txt(bX + 6, bY + 12, boxW - 12, 24, "Output", 14))
      elements.push(arrow(left + laneW / 2, topA + headerH + laneH, left + laneW / 2, topB))
      break
    }
    default:
      return []
  }
  return elements
}

const PREVIEW_COLORS = {
  warm: "#fef3c7",
  blue: "#dbeafe",
  green: "#d1fae5",
  purple: "#e9d5ff",
  pink: "#fce7f3",
  indigo: "#e0e7ff",
  neutral: "#f8fafc",
  sticky: ["#fef08a", "#bfdbfe", "#bbf7d0", "#fbcfe8", "#e9d5ff"] as const,
  imgStroke: "#9ca3af",
  imgFill: "#f3f4f6",
}

function TemplatePreviewSvg({ id }: { id: string }) {
  const w = 160
  const h = 100
  const C = PREVIEW_COLORS
  const s = (i: number) => C.sticky[i % C.sticky.length]

  const content = (() => {
    switch (id) {
      case "project-review":
        return (
          <>
            <rect x="0" y="0" width="160" height="22" rx="2" fill={C.warm} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="0" y="26" width="160" height="74" rx="2" fill={C.neutral} stroke="#e2e8f0" strokeWidth="0.5" />
            {[0, 1].map((r) => [0, 1, 2].map((c) => <rect key={`${r}-${c}`} x={8 + c * 50} y={32 + r * 36} width="44" height="28" rx="3" fill={s(c)} stroke="#e5e7eb" strokeWidth="0.5" />))}
          </>
        )
      case "weekly-okr":
        return (
          <>
            {[0, 1, 2].map((col) => (
              <g key={col}>
                <rect x={4 + col * 52} y="4" width="48" height="14" rx="2" fill={C.blue} stroke="#e2e8f0" strokeWidth="0.5" />
                {[0, 1, 2].map((r) => <rect key={r} x={8 + col * 52} y={22 + r * 24} width="40" height="20" rx="3" fill={s(r)} stroke="#e5e7eb" strokeWidth="0.5" />)}
              </g>
            ))}
            <path d="M 54 11 L 58 11" stroke="#1f2937" strokeWidth="1.2" fill="none" />
            <path d="M 106 11 L 110 11" stroke="#1f2937" strokeWidth="1.2" fill="none" />
          </>
        )
      case "icebreaker":
        return (
          <>
            {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => <rect key={`${r}-${c}`} x={4 + c * 39} y={4 + r * 30} width="34" height="24" rx="3" fill={s(r + c)} stroke="#e5e7eb" strokeWidth="0.5" />))}
          </>
        )
      case "eisenhower":
        return (
          <>
            <rect x="2" y="2" width="76" height="46" rx="2" fill={C.warm} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="80" y="2" width="78" height="46" rx="2" fill={C.blue} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="2" y="50" width="76" height="48" rx="2" fill={C.green} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="80" y="50" width="78" height="48" rx="2" fill={C.purple} stroke="#e2e8f0" strokeWidth="0.5" />
            {[0, 1].map((i) => [0, 1].map((j) => <rect key={`${i}-${j}`} x={10 + j * 78} y={12 + i * 44} width="32" height="22" rx="3" fill={s(i * 2 + j)} stroke="#e5e7eb" strokeWidth="0.5" />))}
            <path d="M 78 25 L 82 25" stroke="#1f2937" strokeWidth="1" fill="none" />
            <path d="M 80 48 L 80 52" stroke="#1f2937" strokeWidth="1" fill="none" />
          </>
        )
      case "4ls-retro":
        return (
          <>
            {[0, 1, 2, 3].map((col) => (
              <g key={col}>
                <rect x={2 + col * 40} y="4" width="36" height="12" rx="2" fill={[C.warm, C.blue, C.green, C.purple][col]} stroke="#e2e8f0" strokeWidth="0.5" />
                <rect x={6 + col * 40} y="20" width="28" height="20" rx="3" fill={s(col)} stroke="#e5e7eb" strokeWidth="0.5" />
                <rect x={6 + col * 40} y="44" width="28" height="20" rx="3" fill={s(col)} stroke="#e5e7eb" strokeWidth="0.5" />
              </g>
            ))}
          </>
        )
      case "standup":
        return (
          <>
            <line x1="8" y1="50" x2="152" y2="50" stroke="#1f2937" strokeWidth="1" opacity="0.6" />
            {[0, 1, 2, 3].map((i) => (
              <g key={i}>
                <rect x={12 + i * 38} y="28" width="32" height="20" rx="2" fill={C.blue} stroke="#e2e8f0" strokeWidth="0.5" />
                {i < 3 && <path d={`M ${46 + i * 38} 38 L ${50 + i * 38} 38`} stroke="#1f2937" strokeWidth="1" fill="none" />}
              </g>
            ))}
          </>
        )
      case "planning-poker":
        return (
          <>
            <rect x="4" y="4" width="152" height="16" rx="2" fill={C.purple} stroke="#e2e8f0" strokeWidth="0.5" />
            {[0, 1].map((r) => [0, 1, 2, 3, 4].map((c) => <rect key={`${r}-${c}`} x={8 + c * 30} y={26 + r * 32} width="26" height="28" rx="2" fill={s(c)} stroke="#e5e7eb" strokeWidth="0.5" />))}
          </>
        )
      case "brainstorm-grid":
        return (
          <>
            <rect x="2" y="2" width="156" height="96" rx="2" fill={C.neutral} stroke="#e2e8f0" strokeWidth="0.5" />
            {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => <rect key={`${r}-${c}`} x={8 + c * 38} y={8 + r * 28} width="34" height="24" rx="3" fill={s(r + c)} stroke="#e5e7eb" strokeWidth="0.5" />))}
          </>
        )
      case "mind-map":
        return (
          <>
            <rect x="68" y="38" width="24" height="24" rx="2" fill={C.indigo} stroke="#e2e8f0" strokeWidth="0.5" />
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const a = (i / 6) * Math.PI * 2 - Math.PI / 2
              const x2 = 80 + 36 * Math.cos(a)
              const y2 = 50 + 36 * Math.sin(a)
              return (
                <g key={i}>
                  <line x1="80" y1="50" x2={x2} y2={y2} stroke="#1f2937" strokeWidth="1" fill="none" />
                  <rect x={x2 - 14} y={y2 - 10} width="28" height="20" rx="3" fill={s(i)} stroke="#e5e7eb" strokeWidth="0.5" />
                </g>
              )
            })}
          </>
        )
      case "affinity":
        return (
          <>
            {[0, 1].map((r) => [0, 1].map((c) => {
              const x = 4 + c * 78
              const y = 4 + r * 46
              const bg = [C.warm, C.blue, C.green, C.purple][r * 2 + c]
              return (
                <g key={`${r}-${c}`}>
                  <rect x={x} y={y} width="76" height="44" rx="2" fill={bg} stroke="#e2e8f0" strokeWidth="0.5" />
                  <rect x={x + 6} y={y + 6} width="28" height="20" rx="3" fill={s(r + c)} stroke="#e5e7eb" strokeWidth="0.5" />
                  <rect x={x + 40} y={y + 6} width="28" height="20" rx="3" fill={s(r + c + 1)} stroke="#e5e7eb" strokeWidth="0.5" />
                </g>
              )
            }))}
          </>
        )
      case "scamper":
        return (
          <>
            {[0, 1, 2, 3, 4].map((col) => (
              <g key={col}>
                <rect x={4 + col * 31} y="4" width="28" height="10" rx="2" fill={C.blue} stroke="#e2e8f0" strokeWidth="0.5" />
                <rect x={8 + col * 31} y="18" width="20" height="18" rx="3" fill={s(col)} stroke="#e5e7eb" strokeWidth="0.5" />
                {col < 4 && <path d={`M ${34 + col * 31} 9 L ${38 + col * 31} 9`} stroke="#1f2937" strokeWidth="0.8" fill="none" />}
              </g>
            ))}
          </>
        )
      case "reverse-brainstorm":
        return (
          <>
            <rect x="2" y="2" width="76" height="46" rx="2" fill={C.warm} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="80" y="2" width="78" height="46" rx="2" fill={C.blue} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="2" y="50" width="76" height="48" rx="2" fill={C.green} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="80" y="50" width="78" height="48" rx="2" fill={C.purple} stroke="#e2e8f0" strokeWidth="0.5" />
            {[0, 1].map((i) => [0, 1].map((j) => <rect key={`${i}-${j}`} x={10 + j * 78} y={12 + i * 44} width="32" height="22" rx="3" fill={s(i * 2 + j)} stroke="#e5e7eb" strokeWidth="0.5" />))}
          </>
        )
      case "user-persona":
        return (
          <>
            <rect x="2" y="2" width="156" height="96" rx="2" fill={C.neutral} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="6" y="8" width="36" height="42" rx="2" stroke={C.imgStroke} strokeWidth="0.8" strokeDasharray="3 2" fill={C.imgFill} />
            <rect x="48" y="8" width="108" height="14" rx="2" fill={C.blue} stroke="#e2e8f0" strokeWidth="0.5" />
            {[0, 1, 2, 3].map((i) => <rect key={i} x={6 + (i % 2) * 78} y={28 + Math.floor(i / 2) * 32} width="74" height="26" rx="2" fill={C.warm} stroke="#e2e8f0" strokeWidth="0.5" />)}
          </>
        )
      case "empathy-map":
        return (
          <>
            <rect x="2" y="2" width="156" height="14" rx="2" fill={C.purple} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="2" y="18" width="76" height="38" rx="2" fill={C.warm} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="80" y="18" width="78" height="38" rx="2" fill={C.blue} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="2" y="58" width="76" height="40" rx="2" fill={C.green} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="80" y="58" width="78" height="40" rx="2" fill={C.purple} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="8" y="24" width="28" height="26" rx="3" fill={s(0)} stroke="#e5e7eb" strokeWidth="0.5" />
            <rect x="86" y="24" width="28" height="26" rx="3" fill={s(1)} stroke="#e5e7eb" strokeWidth="0.5" />
            <rect x="8" y="64" width="28" height="26" rx="3" fill={s(2)} stroke="#e5e7eb" strokeWidth="0.5" />
            <rect x="86" y="64" width="28" height="26" rx="3" fill={s(3)} stroke="#e5e7eb" strokeWidth="0.5" />
          </>
        )
      case "journey-map":
        return (
          <>
            <line x1="8" y1="52" x2="152" y2="52" stroke="#1f2937" strokeWidth="0.8" opacity="0.6" />
            {[0, 1, 2, 3].map((i) => (
              <g key={i}>
                <rect x={10 + i * 38} y="28" width="32" height="22" rx="2" fill={C.blue} stroke="#e2e8f0" strokeWidth="0.5" />
                <rect x={10 + i * 38} y="58" width="32" height="24" rx="3" fill={s(i)} stroke="#e5e7eb" strokeWidth="0.5" />
                {i < 3 && <path d={`M ${44 + i * 38} 39 L ${48 + i * 38} 39`} stroke="#1f2937" strokeWidth="0.8" fill="none" />}
              </g>
            ))}
          </>
        )
      case "swot":
        return (
          <>
            {[0, 1].map((r) => [0, 1].map((c) => {
              const x = 2 + c * 79
              const y = 2 + r * 48
              const bg = [C.green, C.blue, C.warm, C.purple][r * 2 + c]
              return (
                <g key={`${r}-${c}`}>
                  <rect x={x} y={y} width="77" height="46" rx="2" fill={bg} stroke="#e2e8f0" strokeWidth="0.5" />
                  <rect x={x + 8} y={y + 8} width="28" height="22" rx="3" fill={s(r * 2 + c)} stroke="#e5e7eb" strokeWidth="0.5" />
                </g>
              )
            }))}
          </>
        )
      case "kanban-board":
        return (
          <>
            {[0, 1, 2, 3].map((col) => (
              <g key={col}>
                <rect x={4 + col * 39} y="4" width="35" height="12" rx="2" fill={C.blue} stroke="#e2e8f0" strokeWidth="0.5" />
                {[0, 1, 2].map((r) => <rect key={r} x={8 + col * 39} y={20 + r * 24} width="27" height="20" rx="2" fill="#fff" stroke="#e2e8f0" strokeWidth="0.5" />)}
                {col < 3 && <path d={`M ${41 + col * 39} 10 L ${45 + col * 39} 10`} stroke="#1f2937" strokeWidth="0.8" fill="none" />}
              </g>
            ))}
          </>
        )
      case "sprint-backlog":
        return (
          <>
            <rect x="4" y="4" width="152" height="14" rx="2" fill={C.blue} stroke="#e2e8f0" strokeWidth="0.5" />
            {[0, 1, 2].map((r) => [0, 1].map((c) => <rect key={`${r}-${c}`} x={8 + c * 76} y={24 + r * 22} width="72" height="18" rx="2" fill="#fff" stroke="#e2e8f0" strokeWidth="0.5" />))}
            <path d="M 78 35 L 82 35" stroke="#1f2937" strokeWidth="0.6" strokeDasharray="2 2" fill="none" />
            <path d="M 78 57 L 82 57" stroke="#1f2937" strokeWidth="0.6" strokeDasharray="2 2" fill="none" />
          </>
        )
      case "retro-board":
        return (
          <>
            {[0, 1, 2].map((col) => (
              <g key={col}>
                <rect x={4 + col * 52} y="4" width="48" height="14" rx="2" fill={[C.warm, C.blue, C.green][col]} stroke="#e2e8f0" strokeWidth="0.5" />
                <rect x={8 + col * 52} y="22" width="40" height="24" rx="3" fill={s(col)} stroke="#e5e7eb" strokeWidth="0.5" />
                <rect x={8 + col * 52} y="50" width="40" height="24" rx="3" fill={s(col)} stroke="#e5e7eb" strokeWidth="0.5" />
              </g>
            ))}
          </>
        )
      case "story-map":
        return (
          <>
            <rect x="4" y="4" width="152" height="12" rx="2" fill={C.purple} stroke="#e2e8f0" strokeWidth="0.5" />
            {[0, 1, 2].map((r) => (
              <rect key={r} x="4" y={20 + r * 26} width="152" height="24" rx="2" fill={r === 0 ? C.blue : C.neutral} stroke="#e2e8f0" strokeWidth="0.5" />
            ))}
            {[0, 1, 2].map((r) => [0, 1, 2, 3, 4].map((c) => <rect key={`${r}-${c}`} x={8 + c * 30} y={24 + r * 26} width="26" height="18" rx="3" fill={s(r + c)} stroke="#e5e7eb" strokeWidth="0.5" />))}
          </>
        )
      case "okr":
        return (
          <>
            <rect x="4" y="4" width="152" height="16" rx="2" fill={C.indigo} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="4" y="24" width="72" height="36" rx="2" fill={C.blue} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="80" y="24" width="76" height="36" rx="2" fill={C.green} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="8" y="28" width="28" height="18" rx="3" fill={s(0)} stroke="#e5e7eb" strokeWidth="0.5" />
            <rect x="8" y="50" width="28" height="18" rx="3" fill={s(1)} stroke="#e5e7eb" strokeWidth="0.5" />
            <rect x="84" y="28" width="28" height="18" rx="3" fill={s(2)} stroke="#e5e7eb" strokeWidth="0.5" />
          </>
        )
      case "roadmap":
        return (
          <>
            {[0, 1, 2, 3].map((i) => (
              <g key={i}>
                <rect x={8 + i * 40} y="32" width="34" height="24" rx="2" fill={C.blue} stroke="#e2e8f0" strokeWidth="0.5" />
                <rect x={8 + i * 40} y="62" width="34" height="22" rx="3" fill={s(i)} stroke="#e5e7eb" strokeWidth="0.5" />
                {i < 3 && <path d={`M ${44 + i * 40} 44 L ${48 + i * 40} 44`} stroke="#1f2937" strokeWidth="0.8" fill="none" />}
              </g>
            ))}
            <line x1="8" y1="72" x2="152" y2="72" stroke="#1f2937" strokeWidth="0.6" opacity="0.5" />
          </>
        )
      case "goals":
        return (
          <>
            <rect x="4" y="4" width="72" height="42" rx="2" fill={C.blue} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="80" y="4" width="76" height="42" rx="2" fill={C.green} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="8" y="8" width="28" height="18" rx="3" fill={s(0)} stroke="#e5e7eb" strokeWidth="0.5" />
            <rect x="8" y="30" width="28" height="18" rx="3" fill={s(1)} stroke="#e5e7eb" strokeWidth="0.5" />
            <rect x="84" y="8" width="28" height="18" rx="3" fill={s(2)} stroke="#e5e7eb" strokeWidth="0.5" />
            <path d="M 76 25 L 80 25" stroke="#1f2937" strokeWidth="0.8" fill="none" />
          </>
        )
      case "flowchart":
        return (
          <>
            <rect x="28" y="18" width="32" height="18" rx="2" fill={C.blue} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="28" y="42" width="32" height="18" rx="2" fill={C.blue} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="28" y="66" width="32" height="18" rx="2" fill={C.blue} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="100" y="42" width="32" height="18" rx="2" fill={C.blue} stroke="#e2e8f0" strokeWidth="0.5" />
            <path d="M 44 36 L 44 40" stroke="#1f2937" strokeWidth="1" fill="none" />
            <path d="M 44 60 L 44 64" stroke="#1f2937" strokeWidth="1" fill="none" />
            <path d="M 60 51 L 98 51" stroke="#1f2937" strokeWidth="1" fill="none" />
          </>
        )
      case "org-chart":
        return (
          <>
            <rect x="68" y="8" width="24" height="16" rx="2" fill={C.indigo} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="24" y="48" width="24" height="16" rx="2" fill={C.blue} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="112" y="48" width="24" height="16" rx="2" fill={C.blue} stroke="#e2e8f0" strokeWidth="0.5" />
            <line x1="80" y1="24" x2="36" y2="48" stroke="#1f2937" strokeWidth="0.8" />
            <line x1="80" y1="24" x2="124" y2="48" stroke="#1f2937" strokeWidth="0.8" />
          </>
        )
      case "venn":
        return (
          <>
            <ellipse cx="45" cy="50" rx="28" ry="24" fill={C.blue} opacity="0.85" stroke="#1e40af" strokeWidth="0.6" />
            <ellipse cx="80" cy="50" rx="28" ry="24" fill={C.green} opacity="0.85" stroke="#047857" strokeWidth="0.6" />
            <ellipse cx="115" cy="50" rx="28" ry="24" fill={C.warm} opacity="0.85" stroke="#b45309" strokeWidth="0.6" />
          </>
        )
      case "slide-deck":
        return (
          <>
            {[0, 1, 2].map((i) => (
              <g key={i}>
                <rect x={12 + i * 48} y="12" width="42" height="32" rx="2" fill="#fff" stroke="#e2e8f0" strokeWidth="0.5" />
                <rect x={14 + i * 48} y="14" width="38" height="20" rx="1" stroke={C.imgStroke} strokeDasharray="2 2" fill={C.imgFill} strokeWidth="0.5" />
              </g>
            ))}
            <path d="M 80 44 L 84 44" stroke="#1f2937" strokeWidth="0.6" fill="none" />
          </>
        )
      case "pitch":
        return (
          <>
            <rect x="4" y="4" width="152" height="14" rx="2" fill={C.purple} stroke="#e2e8f0" strokeWidth="0.5" />
            {[0, 1, 2, 3].map((i) => <rect key={i} x="8" y={22 + i * 18} width="144" height="16" rx="2" fill={C.neutral} stroke="#e2e8f0" strokeWidth="0.5" />)}
            <path d="M 80 31 L 80 36" stroke="#1f2937" strokeWidth="0.5" fill="none" />
            <path d="M 80 49 L 80 54" stroke="#1f2937" strokeWidth="0.5" fill="none" />
            <path d="M 80 67 L 80 72" stroke="#1f2937" strokeWidth="0.5" fill="none" />
          </>
        )
      case "wireframe":
        return (
          <>
            <rect x="4" y="4" width="152" height="92" rx="2" fill={C.neutral} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="8" y="8" width="64" height="14" rx="2" fill="#fff" stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="8" y="26" width="152" height="64" rx="2" fill="#fff" stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="12" y="30" width="48" height="36" rx="1" stroke={C.imgStroke} strokeDasharray="2 2" fill={C.imgFill} strokeWidth="0.5" />
            <rect x="66" y="30" width="88" height="12" rx="2" fill="#fff" stroke="#e2e8f0" strokeWidth="0.5" />
          </>
        )
      case "mockup":
        return (
          <>
            <rect x="4" y="4" width="152" height="14" rx="2" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="0.5" />
            {[0, 1].map((r) => [0, 1, 2].map((c) => <rect key={`${r}-${c}`} x={8 + c * 50} y={22 + r * 36} width="46" height="32" rx="1" stroke={C.imgStroke} strokeDasharray="2 2" fill={C.imgFill} strokeWidth="0.5" />))}
          </>
        )
      case "moodboard":
        return (
          <>
            <rect x="4" y="4" width="152" height="92" rx="2" fill={C.neutral} stroke="#e2e8f0" strokeWidth="0.5" />
            {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => <rect key={`${r}-${c}`} x={8 + c * 38} y={8 + r * 28} width="34" height="24" rx="1" stroke={C.imgStroke} strokeDasharray="2 2" fill={C.imgFill} strokeWidth="0.5" />))}
          </>
        )
      case "reference":
        return (
          <>
            <rect x="4" y="4" width="152" height="92" rx="2" fill={C.neutral} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="8" y="8" width="46" height="38" rx="1" stroke={C.imgStroke} strokeDasharray="2 2" fill={C.imgFill} strokeWidth="0.5" />
            <rect x="58" y="8" width="46" height="38" rx="1" stroke={C.imgStroke} strokeDasharray="2 2" fill={C.imgFill} strokeWidth="0.5" />
            <rect x="108" y="8" width="44" height="38" rx="1" stroke={C.imgStroke} strokeDasharray="2 2" fill={C.imgFill} strokeWidth="0.5" />
            <rect x="8" y="52" width="46" height="24" rx="3" fill={s(0)} stroke="#e5e7eb" strokeWidth="0.5" />
            <rect x="58" y="52" width="46" height="24" rx="3" fill={s(1)} stroke="#e5e7eb" strokeWidth="0.5" />
          </>
        )
      default:
        return (
          <>
            <rect x="20" y="20" width="120" height="60" rx="2" fill={C.neutral} stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="30" y="32" width="40" height="28" rx="3" fill={s(0)} stroke="#e5e7eb" strokeWidth="0.5" />
            <rect x="90" y="32" width="40" height="28" rx="3" fill={s(1)} stroke="#e5e7eb" strokeWidth="0.5" />
          </>
        )
    }
  })()

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full min-h-0 object-contain" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
      {content}
    </svg>
  )
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
      fontFamily: DEFAULT_FONT_ID,
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
          fontFamily: DEFAULT_FONT_ID,
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
            fontFamily: DEFAULT_FONT_ID,
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
          fontFamily: DEFAULT_FONT_ID,
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
            fontFamily: DEFAULT_FONT_ID,
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
          fontFamily: DEFAULT_FONT_ID,
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
          fontFamily: DEFAULT_FONT_ID,
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
            fontFamily: DEFAULT_FONT_ID,
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
          fontFamily: DEFAULT_FONT_ID,
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
          fontFamily: DEFAULT_FONT_ID,
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
  const rightClickStartRef = useRef<number | null>(null)
  const rightClickDurationRef = useRef<number>(0)
  const [shapesOpen, setShapesOpen] = useState(false)
  const [activeLeftTool, setActiveLeftTool] = useState<string | null>(null)
  const [pencilSubTool, setPencilSubTool] = useState<"pen" | "highlighter" | "eraser" | "lasso" | null>(null)
  const secondaryPanelRef = useRef<HTMLDivElement | null>(null)
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false)
  const [templatesSearch, setTemplatesSearch] = useState("")
  const [templatesCategory, setTemplatesCategory] = useState<string>("Meetings & Workshops")
  const [textFormatBarVisible, setTextFormatBarVisible] = useState(false)
  const [stickyNoteColor, setStickyNoteColor] = useState<string>("#fef08a")
  const [commentMarkers, setCommentMarkers] = useState<
    Array<{ id: string; x: number; y: number; text: string; author: string; replies: Array<{ text: string; author: string }> }>
  >([])
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
  const [pendingComment, setPendingComment] = useState<{ x: number; y: number } | null>(null)
  const [pendingCommentText, setPendingCommentText] = useState("")
  const [replyDraft, setReplyDraft] = useState("")
  const threadPopoverRef = useRef<HTMLDivElement | null>(null)
  const [shapeStyle, setShapeStyle] = useState({ strokeColor: "#1f2937", fillColor: "#ffffff", strokeOpacity: 100, fillOpacity: 100 })
  const [pencilOptions, setPencilOptions] = useState({ color: "#1f2937", strokeWidth: 2, strokeStyle: "solid" as "solid" | "dashed", opacity: 100 })
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
  const [scrollX, setScrollX] = useState<number>(0)
  const [scrollY, setScrollY] = useState<number>(0)
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
  const [shareAllowEdit, setShareAllowEdit] = useState(true)
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
    fontFamily: DEFAULT_FONT_ID,
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
  const [presentationMode, setPresentationMode] = useState(false)
  const presentationRestoreRef = useRef<{ viewBackgroundColor: string; gridModeEnabled: boolean } | null>(null)
  const [reactionsOpen, setReactionsOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [formatsActiveCategory, setFormatsActiveCategory] = useState<string | null>(null)
  const [boardNameEditing, setBoardNameEditing] = useState(false)
  const [boardNameDraft, setBoardNameDraft] = useState("")
  const boardNameInputRef = useRef<HTMLInputElement | null>(null)
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
  const [publishTemplateOpen, setPublishTemplateOpen] = useState(false)
  const [publishTemplateName, setPublishTemplateName] = useState("")
  const [publishTemplateDescription, setPublishTemplateDescription] = useState("")
  const [publishTemplateBusy, setPublishTemplateBusy] = useState(false)
  const [publishTemplateNotice, setPublishTemplateNotice] = useState<string | null>(null)

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
  const leftToolbarIconBtnClass =
    "inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface/90 text-sm font-semibold text-text-secondary shadow-sm backdrop-blur hover:bg-toolbar hover:text-text-primary active:translate-y-px transition duration-fast"
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

  const selectLeftTool = useCallback((tool: string | null) => {
    setActiveLeftTool(tool)
    setShapesOpen(false)
    setPencilSubTool(null)
    if (tool === "formats" || tool === "link" || tool === "pencil" || tool === "shapes") {
      setTool("selection")
    } else if (tool === "hand") setTool("hand")
    else if (tool === "text") setTool("text")
    else if (tool === "sticky") setTool("selection")
    else if (tool === "comment") setTool("selection")
    else if (tool === "shapes") setTool("selection")
    else if (tool === null) setTool("hand")
  }, [])

  const insertElementsAtCenter = useCallback((newElements: any[], options?: { selectAndGroup?: boolean }) => {
    const api = apiRef.current
    if (!api?.getAppState || !api?.getSceneElements || !api?.updateScene || !newElements.length) return
    const appState = api.getAppState()
    const zoom = typeof appState?.zoom?.value === "number" ? appState.zoom.value : 1
    const width = typeof appState?.width === "number" ? appState.width : window.innerWidth
    const height = typeof appState?.height === "number" ? appState.height : window.innerHeight
    const scrollX = typeof appState?.scrollX === "number" ? appState.scrollX : 0
    const scrollY = typeof appState?.scrollY === "number" ? appState.scrollY : 0
    const centerX = -scrollX + width / 2 / zoom
    const centerY = -scrollY + height / 2 / zoom
    const bbox = getElementsBoundingBox(newElements)
    const dx = bbox ? centerX - (bbox.minX + bbox.maxX) / 2 : 0
    const dy = bbox ? centerY - (bbox.minY + bbox.maxY) / 2 : 0
    const groupId = options?.selectAndGroup ? randId() : null
    const shifted = newElements.map((el: any) => ({
      ...el,
      x: (el.x ?? 0) + dx,
      y: (el.y ?? 0) + dy,
      ...(groupId ? { groupIds: [...(el.groupIds || []), groupId] } : {}),
    }))
    const existing = api.getSceneElements() ?? []
    const nextElements = [...existing, ...shifted]
    const update: { elements: any[]; appState?: any; captureUpdate?: "IMMEDIATELY" } = { elements: nextElements, captureUpdate: "IMMEDIATELY" }
    if (options?.selectAndGroup && shifted.length > 0) {
      const selectedIds = shifted.reduce((acc: Record<string, true>, el: any) => {
        if (el?.id) acc[el.id] = true
        return acc
      }, {})
      update.appState = { ...appState, selectedElementIds: selectedIds }
      setTool("selection")
    }
    api.updateScene(update)
  }, [])

  const insertFormatsStructure = useCallback((kind: string) => {
    const elements = buildFormatsStructure(kind)
    if (elements.length) {
      insertElementsAtCenter(elements, { selectAndGroup: true })
    }
  }, [insertElementsAtCenter])

  const insertTemplateByKey = useCallback((key: string) => {
    const composed = buildComposedTemplate(key)
    if (composed.length > 0) {
      insertElementsAtCenter(composed, { selectAndGroup: true })
      return
    }
    const formatMap: Record<string, string> = {
      "project-review": "Doc",
      "weekly-okr": "Kanban",
      "icebreaker": "Table",
      "eisenhower": "Flow Chart",
      "4ls-retro": "Kanban",
      "standup": "Timeline",
      "brainstorm-grid": "Table",
      "mind-map": "Flow Chart",
      "affinity": "Kanban",
      "kanban-board": "Kanban",
      "sprint-backlog": "Doc",
      "retro-board": "Kanban",
      "flowchart": "Flow Chart",
      "slide-deck": "Slides",
      "wireframe": "Doc",
      "moodboard": "Table",
    }
    const format = formatMap[key]
    if (format) insertFormatsStructure(format)
    else insertFormatsStructure("Doc")
  }, [insertFormatsStructure, insertElementsAtCenter])

  const insertLinkOrEmbed = useCallback((url: string) => {
    const api = apiRef.current
    if (!api?.getAppState || !api?.getSceneElements || !api?.updateScene) return
    const appState = api.getAppState()
    const zoom = typeof appState?.zoom?.value === "number" ? appState.zoom.value : 1
    const width = typeof appState?.width === "number" ? appState.width : window.innerWidth
    const height = typeof appState?.height === "number" ? appState.height : window.innerHeight
    const scrollX = typeof appState?.scrollX === "number" ? appState.scrollX : 0
    const scrollY = typeof appState?.scrollY === "number" ? appState.scrollY : 0
    const centerX = -scrollX + width / 2 / zoom
    const centerY = -scrollY + height / 2 / zoom
    const linkEl = makeTextElement({ x: centerX - 100, y: centerY - 16, width: 200, height: 32, text: url })
    ;(linkEl as any).link = url
    const existing = api.getSceneElements() ?? []
    api.updateScene({ elements: [...existing, linkEl], captureUpdate: "IMMEDIATELY" })
  }, [])

  const insertStickyAtScene = useCallback((sceneX: number, sceneY: number) => {
    const api = apiRef.current
    if (!api?.getSceneElements || !api?.updateScene) return
    const W = 200
    const H = 180
    const pad = 12
    const rect = makeBaseElement("rectangle", {
      x: sceneX - W / 2,
      y: sceneY - H / 2,
      width: W,
      height: H,
      backgroundColor: stickyNoteColor,
      strokeColor: "#e5e7eb",
      strokeWidth: 1,
      roundness: { type: 3 },
    })
    const textEl = makeTextElement({
      x: sceneX - W / 2 + pad,
      y: sceneY - H / 2 + pad,
      width: W - pad * 2,
      height: H - pad * 2,
      text: "",
      fontSize: 16,
      backgroundColor: "transparent",
    })
    const existing = api.getSceneElements() ?? []
    api.updateScene({ elements: [...existing, rect, textEl], captureUpdate: "IMMEDIATELY" })
    selectLeftTool(null)
  }, [stickyNoteColor])

  const handleContextMenuCapture = useCallback((e: React.MouseEvent) => {
    if (rightClickDurationRef.current >= 1000) e.preventDefault()
  }, [])

  const handleRightClickTracking = useCallback((e: React.PointerEvent) => {
    if (e.button === 2) {
      rightClickStartRef.current = Date.now()
    }
  }, [])

  const handleRightClickUp = useCallback((e: React.PointerEvent) => {
    if (e.button === 2) {
      rightClickDurationRef.current = rightClickStartRef.current != null ? Date.now() - rightClickStartRef.current : 0
      rightClickStartRef.current = null
    }
  }, [])

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    if (activeLeftTool !== "sticky" && activeLeftTool !== "comment") return
    const target = e.target as HTMLElement
    if (target.closest("[data-left-toolbar]") || target.closest("[data-secondary-panel]") || target.closest("[data-templates-modal]") || target.closest("[data-comment-ui]")) return
    const api = apiRef.current
    if (!api?.getAppState || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const vx = e.clientX - rect.left
    const vy = e.clientY - rect.top
    const appState = api.getAppState()
    const zoom = typeof appState?.zoom?.value === "number" ? appState.zoom.value : 1
    const scrollX = typeof appState?.scrollX === "number" ? appState.scrollX : 0
    const scrollY = typeof appState?.scrollY === "number" ? appState.scrollY : 0
    const sceneX = -scrollX + vx / zoom
    const sceneY = -scrollY + vy / zoom
    if (activeLeftTool === "sticky") {
      e.preventDefault()
      e.stopPropagation()
      insertStickyAtScene(sceneX, sceneY)
    }
    if (activeLeftTool === "comment") {
      e.preventDefault()
      e.stopPropagation()
      if (pendingComment != null) return
      setPendingComment({ x: sceneX, y: sceneY })
      setPendingCommentText("")
    }
  }, [activeLeftTool, insertStickyAtScene, pendingComment])

  const commentAuthor = authUser?.displayName ?? "You"

  const saveNewComment = useCallback(() => {
    if (pendingComment == null) return
    const id = `c-${Date.now()}`
    setCommentMarkers((m) => [...m, { id, x: pendingComment.x, y: pendingComment.y, text: pendingCommentText.trim(), author: commentAuthor, replies: [] }])
    setPendingComment(null)
    setPendingCommentText("")
    selectLeftTool(null)
  }, [pendingComment, pendingCommentText, commentAuthor])

  const cancelNewComment = useCallback(() => {
    setPendingComment(null)
    setPendingCommentText("")
    selectLeftTool(null)
  }, [])

  const saveReply = useCallback(() => {
    if (activeCommentId == null || !replyDraft.trim()) return
    setCommentMarkers((prev) =>
      prev.map((c) => (c.id === activeCommentId ? { ...c, replies: [...c.replies, { text: replyDraft.trim(), author: commentAuthor }] } : c))
    )
    setReplyDraft("")
  }, [activeCommentId, replyDraft, commentAuthor])

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

      // Track zoom and scroll for zoom widget and comment markers.
      try {
        const nextZoom = typeof appState?.zoom?.value === "number" ? appState.zoom.value : 1
        const sig = String(nextZoom)
        if (zoomSigRef.current !== sig) {
          zoomSigRef.current = sig
          setZoomValue(nextZoom)
        }
        const nextScrollX = typeof appState?.scrollX === "number" ? appState.scrollX : 0
        const nextScrollY = typeof appState?.scrollY === "number" ? appState.scrollY : 0
        setScrollX(nextScrollX)
        setScrollY(nextScrollY)
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
          fontFamily: typeof appState?.currentItemFontFamily === "number" ? appState.currentItemFontFamily : DEFAULT_FONT_ID,
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
    if (!activeLeftTool) return
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null
      if (!el) return
      if (el.closest("[data-left-toolbar]") || el.closest("[data-secondary-panel]") || el.closest("[data-templates-modal]")) return
      setActiveLeftTool(null)
      setPencilSubTool(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveLeftTool(null)
        setPencilSubTool(null)
      }
    }
    window.addEventListener("pointerdown", onDown)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("pointerdown", onDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [activeLeftTool])

  useEffect(() => {
    if (activeLeftTool !== "shapes") return
    const api = apiRef.current
    if (!api?.getAppState || !api?.updateScene) return
    const appState = api.getAppState()
    api.updateScene({
      appState: {
        ...appState,
        currentItemStrokeColor: shapeStyle.strokeColor,
        currentItemBackgroundColor: shapeStyle.fillColor,
        currentItemOpacity: shapeStyle.fillOpacity,
      },
      captureUpdate: "IMMEDIATELY",
    })
  }, [activeLeftTool, shapeStyle.strokeColor, shapeStyle.fillColor, shapeStyle.fillOpacity])

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

      // Let Excalidraw update selection state from the double-click, then enter edit mode.
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
      }, 100)
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

  const effectiveGrid = presentationMode ? false : gridModeEnabled
  const effectiveViewBackground = presentationMode ? "#ffffff" : undefined

  return (
    <div
        ref={containerRef}
        style={{ position: "absolute", inset: 0 }}
        onPointerDownCapture={handleRightClickTracking}
        onPointerUpCapture={handleRightClickUp}
        onContextMenuCapture={handleContextMenuCapture}
        onPointerDown={handleCanvasPointerDown}
      >
      {/* Hide Excalidraw's built-in toolbars/menus (we render our own). */}
      <style>{`
        .excalidraw .App-toolbar-container,
        .excalidraw .App-toolbar,
        .excalidraw .layer-ui__wrapper__footer,
        .excalidraw .App-menu {
          display: none !important;
        }
      `}</style>

      {/* Floating top nav (Miro-style): colab + board name + right controls. Hidden in presentation mode. */}
      {!presentationMode && (
        <div className="pointer-events-none absolute left-0 right-0 top-4 z-50 flex justify-between px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-border bg-surface/90 px-3 py-2 shadow-md backdrop-blur">
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg px-1 py-0.5 text-lg font-bold tracking-tight text-text-primary hover:bg-toolbar transition-colors font-sans"
              onClick={() => navigate("/app/dashboard")}
            >
              <img src="/logo.png" alt="" className="h-6 w-6" width={24} height={24} />
              colab
            </button>
            <span className="h-5 w-px bg-border" aria-hidden />
            {boardNameEditing ? (
              <input
                ref={boardNameInputRef}
                type="text"
                value={boardNameDraft}
                onChange={(e) => setBoardNameDraft(e.target.value)}
                onBlur={() => {
                  setBoardNameEditing(false)
                  const name = boardNameDraft.trim()
                  if (name && boardId && name !== boardMeta?.name) {
                    backendApi.updateBoard(boardId, { name }).then(() => setBoardMeta((m) => (m ? { ...m, name } : m)))
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                  if (e.key === "Escape") setBoardNameDraft(boardMeta?.name ?? "Untitled"), setBoardNameEditing(false)
                }}
                className="min-w-[120px] rounded-lg border border-border bg-surface px-2 py-1 text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Board name"
              />
            ) : (
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm font-medium text-text-secondary hover:bg-toolbar hover:text-text-primary transition-colors"
                onClick={() => {
                  setBoardNameDraft(boardMeta?.name ?? "Untitled")
                  setBoardNameEditing(true)
                  window.setTimeout(() => boardNameInputRef.current?.focus(), 0)
                }}
              >
                {boardMeta?.name?.trim() || "Untitled"}
              </button>
            )}
            <span className="h-5 w-px bg-border" aria-hidden />
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-sm font-medium text-text-secondary hover:bg-toolbar hover:text-text-primary transition-colors"
              onClick={() => {
                setPublishTemplateName(boardMeta?.name?.trim() || "Untitled")
                setPublishTemplateDescription("")
                setPublishTemplateNotice(null)
                setPublishTemplateOpen(true)
              }}
              title="Publish as Template"
            >
              Publish as Template
            </button>
          </div>
          <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-border bg-surface/90 p-1 shadow-md backdrop-blur">
            <button
              type="button"
              className={iconBtnClass}
              onClick={() => setReactionsOpen((v) => !v)}
              title="Reactions"
              aria-label="Reactions"
            >
              <img src="/reactions-icon.png" alt="" className="h-6 w-6 object-contain" width={24} height={24} />
            </button>
            <button
              type="button"
              className={iconBtnClass}
              onClick={() => setActivityOpen((v) => !v)}
              title="Activity"
              aria-label="Activity"
            >
              <img src="/activity-icon.png" alt="" className="h-6 w-6 object-contain" width={24} height={24} />
            </button>
            <button
              type="button"
              className={iconBtnClass}
              onClick={() => setProfileOpen((v) => !v)}
              title="Profile"
              aria-label="Profile"
            >
              <img src="/profile-icon.png" alt="" className="h-6 w-6 object-contain" width={24} height={24} />
            </button>
            <button
              type="button"
              className={iconBtnClass}
              onClick={() => {
                if (presentationMode) {
                  setPresentationMode(false)
                  const rest = presentationRestoreRef.current
                  if (rest && apiRef.current?.getAppState && apiRef.current?.updateScene) {
                    const current = apiRef.current.getAppState()
                    apiRef.current.updateScene({
                      appState: { ...current, viewBackgroundColor: rest.viewBackgroundColor, gridModeEnabled: rest.gridModeEnabled },
                      captureUpdate: "IMMEDIATELY",
                    })
                  }
                  if (rest) setGridModeEnabled(rest.gridModeEnabled)
                  presentationRestoreRef.current = null
                } else {
                  const api = apiRef.current
                  const app = api?.getAppState?.()
                  presentationRestoreRef.current = {
                    viewBackgroundColor: (app?.viewBackgroundColor as string) ?? "#ffffff",
                    gridModeEnabled: Boolean(app?.gridModeEnabled ?? gridModeEnabled),
                  }
                  api?.updateScene?.({
                    appState: { viewBackgroundColor: "#ffffff", gridModeEnabled: false },
                    captureUpdate: "IMMEDIATELY",
                  })
                  setPresentationMode(true)
                }
              }}
              title="Present"
              aria-label="Present"
            >
              <img src="/presentation-icon.png" alt="" className="h-6 w-6 object-contain" width={24} height={24} />
            </button>
            <button
              type="button"
              className={iconBtnClass}
              onClick={() => setShareOpen(true)}
              title="Collaborated"
              aria-label="Collaborated"
            >
              <img src="/share-icon.png" alt="" className="h-6 w-6 object-contain" width={24} height={24} />
            </button>
          </div>
        </div>
      )}

      {/* Reactions panel (floating modal) */}
      {reactionsOpen && !presentationMode && (
        <>
          <div className="absolute inset-0 z-[55]" aria-hidden onClick={() => setReactionsOpen(false)} />
          <div className="absolute right-4 top-16 z-[56] w-72 rounded-2xl border border-border bg-surface p-3 shadow-xl">
            <div className="text-sm font-semibold text-text-primary">Reactions</div>
            <p className="mt-1 text-xs text-text-muted">Emoji reactions appear live for collaborators.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["👍", "❤️", "👏", "🔥", "✨"].map((emoji) => (
                <button key={emoji} type="button" className="rounded-lg border border-border px-2 py-1.5 text-lg hover:bg-toolbar">
                  {emoji}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-1.5 border-t border-border pt-3">
              <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-secondary hover:bg-toolbar">
                ⏱ Timer
              </button>
              <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-secondary hover:bg-toolbar">
                ✓ Voting
              </button>
              <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-secondary hover:bg-toolbar">
                🔒 Private Mode
              </button>
              <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-secondary hover:bg-toolbar">
                📝 Note
              </button>
            </div>
          </div>
        </>
      )}

      {/* Activity panel */}
      {activityOpen && !presentationMode && (
        <>
          <div className="absolute inset-0 z-[55]" aria-hidden onClick={() => setActivityOpen(false)} />
          <div className="absolute right-4 top-16 z-[56] w-80 rounded-2xl border border-border bg-surface p-3 shadow-xl">
            <div className="text-sm font-semibold text-text-primary">Activity</div>
            <p className="mt-1 text-xs text-text-muted">Actions and reactions on this board.</p>
            <div className="mt-3 max-h-64 overflow-y-auto text-sm text-text-muted">No activity yet.</div>
          </div>
        </>
      )}

      {/* Profile panel */}
      {profileOpen && !presentationMode && (
        <>
          <div className="absolute inset-0 z-[55]" aria-hidden onClick={() => setProfileOpen(false)} />
          <div className="absolute right-4 top-16 z-[56] w-64 rounded-2xl border border-border bg-surface p-3 shadow-xl">
            <div className="text-sm font-semibold text-text-primary">Profile</div>
            <p className="mt-1 text-xs text-text-muted">
              {boardMeta?.ownerId === authUser?.userId ? "You are the host" : "You are a collaborator"}
            </p>
            <button
              type="button"
              className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-secondary hover:bg-toolbar"
              onClick={() => { setProfileOpen(false); navigate("/app/dashboard") }}
            >
              Switch board
            </button>
          </div>
        </>
      )}

      {/* Floating format row above canvas when a text element is selected */}
      {!presentationMode && selectionInfo.kind === "text" && selectionInfo.selectedIds.length > 0 && (
        <div className="pointer-events-auto absolute left-1/2 top-24 z-50 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface/95 p-2 shadow-lg backdrop-blur">
            <FontPicker
              value={typeof selectionInfo.primary?.fontFamily === "number" ? selectionInfo.primary.fontFamily : DEFAULT_FONT_ID}
              onChange={(id) => applyToSelection({ fontFamily: id }, (el) => el?.type === "text")}
            />
            <input type="number" min={8} max={72} className="w-12 rounded-lg border border-border bg-surface px-2 py-1.5 text-center text-sm" value={selectionInfo.primary?.fontSize ?? 20} onChange={(e) => applyToSelection({ fontSize: Number(e.target.value) }, (el) => el?.type === "text")} />
            <button type="button" className={iconBtnClass} title="Bold" onClick={() => dispatchKeyDown({ key: "b", metaOrCtrl: true })}>B</button>
            <button type="button" className={iconBtnClass} title="Underline">U</button>
            <div className="h-6 w-px bg-border" />
            <button type="button" className={iconBtnClass} title="Align left" onClick={() => applyToSelection({ textAlign: "left" }, (el) => el?.type === "text")}>≡</button>
            <button type="button" className={iconBtnClass} title="Center" onClick={() => applyToSelection({ textAlign: "center" }, (el) => el?.type === "text")}>≡</button>
            <button type="button" className={iconBtnClass} title="Align right" onClick={() => applyToSelection({ textAlign: "right" }, (el) => el?.type === "text")}>≡</button>
            <input type="color" className="h-8 w-8 cursor-pointer rounded border border-border" value={toColorInputValue(selectionInfo.primary?.strokeColor as string, "#1f2937")} onChange={(e) => applyToSelection({ strokeColor: e.target.value }, (el) => el?.type === "text")} title="Text color" />
            <input type="color" className="h-8 w-8 cursor-pointer rounded border border-border" value={toColorInputValue(selectionInfo.primary?.backgroundColor as string, "#ffffff")} onChange={(e) => applyToSelection({ backgroundColor: e.target.value }, (el) => el?.type === "text")} title="Highlight" />
            <button type="button" className={iconBtnClass} title="More (Copy, Duplicate, Delete, etc.)">⋯</button>
          </div>
        </div>
      )}

      {/* Left vertical tool column + sliding secondary panel. Hidden in presentation mode. */}
      {!presentationMode && (
      <div className="pointer-events-none absolute left-4 top-20 z-50 flex items-stretch gap-0" data-left-toolbar>
        <div className="pointer-events-auto flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface/85 p-2 shadow-md backdrop-blur transition-shadow">
          <button type="button" className={leftToolbarIconBtnClass} onClick={() => setAiOpen(true)} title="Need Help Generating" aria-label="AI generator">
            <img src="/ai-icon.png" alt="" className="h-6 w-6 object-contain" width={24} height={24} />
          </button>
          <div className="h-px w-10 bg-border/70" />
          <button type="button" className={`${leftToolbarIconBtnClass} ${activeLeftTool === "hand" ? iconBtnActiveClass : ""}`} onClick={() => selectLeftTool("hand")} title="Cursor" aria-label="Cursor">
            <img src="/cursor-icon.png" alt="" className="h-6 w-6 object-contain" width={24} height={24} />
          </button>
          <button type="button" className={`${leftToolbarIconBtnClass} ${activeLeftTool === "formats" ? iconBtnActiveClass : ""}`} onClick={() => selectLeftTool(activeLeftTool === "formats" ? null : "formats")} title="Formats & Flows" aria-label="Formats & Flows">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>
          </button>
          <button type="button" className={leftToolbarIconBtnClass} onClick={() => { setTemplatesModalOpen(true); selectLeftTool(null) }} title="Templates" aria-label="Templates">
            <img src="/templates-icon.png" alt="" className="h-6 w-6 object-contain" width={24} height={24} />
          </button>
          <button type="button" className={`${leftToolbarIconBtnClass} ${activeLeftTool === "sticky" ? iconBtnActiveClass : ""}`} onClick={() => selectLeftTool(activeLeftTool === "sticky" ? null : "sticky")} title="Sticky Notes" aria-label="Sticky notes">
            <img src="/sticky-note-icon.png" alt="" className="h-6 w-6 object-contain" width={24} height={24} />
          </button>
          <button type="button" className={`${leftToolbarIconBtnClass} ${activeLeftTool === "text" ? iconBtnActiveClass : ""}`} onClick={() => selectLeftTool(activeLeftTool === "text" ? null : "text")} title="Text Box" aria-label="Text Box">
            <img src="/text-box-icon.png" alt="" className="h-6 w-6 object-contain" width={24} height={24} />
          </button>
          <button type="button" className={`${leftToolbarIconBtnClass} ${activeLeftTool === "shapes" ? iconBtnActiveClass : ""}`} onClick={() => selectLeftTool(activeLeftTool === "shapes" ? null : "shapes")} title="Shapes" aria-label="Shapes">
            <img src="/shapes-icon.png" alt="" className="h-6 w-6 object-contain" width={24} height={24} />
          </button>
          <button type="button" className={`${leftToolbarIconBtnClass} ${activeLeftTool === "pencil" ? iconBtnActiveClass : ""}`} onClick={() => selectLeftTool(activeLeftTool === "pencil" ? null : "pencil")} title="Pencil" aria-label="Pencil">
            <img src="/pencil-icon.png" alt="" className="h-6 w-6 object-contain" width={24} height={24} />
          </button>
          <button type="button" className={leftToolbarIconBtnClass} title="Emoji / Stickers" aria-label="Emoji">
            <img src="/sticker-icon.png" alt="" className="h-6 w-6 object-contain" width={24} height={24} />
          </button>
          <button type="button" className={`${leftToolbarIconBtnClass} ${activeLeftTool === "comment" ? iconBtnActiveClass : ""}`} onClick={() => selectLeftTool(activeLeftTool === "comment" ? null : "comment")} title="Comment" aria-label="Comment">
            <img src="/comment-icon.png" alt="" className="h-6 w-6 object-contain" width={24} height={24} />
          </button>
          <button type="button" className={`${leftToolbarIconBtnClass} ${activeLeftTool === "link" ? iconBtnActiveClass : ""}`} onClick={() => selectLeftTool(activeLeftTool === "link" ? null : "link")} title="Link" aria-label="Link">
            <img src="/link-icon.png" alt="" className="h-6 w-6 object-contain" width={24} height={24} />
          </button>
          <div className="h-px w-10 bg-border/70" />
          <button type="button" className={leftToolbarIconBtnClass} onClick={sendUndo} title="Undo (Ctrl/Cmd+Z)">
            <img src="/undo-icon.png" alt="" className="h-6 w-6 object-contain" width={24} height={24} />
          </button>
          <button type="button" className={leftToolbarIconBtnClass} onClick={sendRedo} title="Redo (Ctrl/Cmd+Shift+Z)">
            <img src="/redo-icon.png" alt="" className="h-6 w-6 object-contain" width={24} height={24} />
          </button>
        </div>

        {/* Sliding secondary panel */}
        {["formats", "shapes", "pencil", "link"].includes(activeLeftTool || "") && (
          <div ref={secondaryPanelRef} data-secondary-panel className="pointer-events-auto ml-2 flex overflow-hidden rounded-2xl border border-border bg-surface/95 shadow-lg backdrop-blur animate-in slide-in-from-left-2 duration-200">
            <div className="max-h-[calc(100vh-8rem)] w-56 overflow-y-auto p-3">
              {activeLeftTool === "formats" && (
                <>
                  <div className="text-xs font-semibold text-text-muted uppercase tracking-wide">Formats & Flows</div>
                  <div className="mt-2 space-y-0.5">
                    {FORMATS_TOP_LEVEL.map((label) => (
                      <button
                        key={label}
                        type="button"
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-toolbar ${formatsActiveCategory === label ? "bg-toolbar text-text-primary" : "text-text-primary"}`}
                        onClick={() => setFormatsActiveCategory((c) => (c === label ? null : label))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {activeLeftTool === "shapes" && (
                <>
                  <div className="text-xs font-semibold text-text-muted uppercase tracking-wide">Shapes</div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {(["rectangle", "ellipse", "diamond", "arrow", "line"] as const).map((shape) => (
                      <button key={shape} type="button" className={pillBtnClass} onClick={() => { setTool(shape); selectLeftTool(null) }}>{shape === "rectangle" ? "▭" : shape === "ellipse" ? "◯" : shape === "diamond" ? "◇" : shape === "arrow" ? "➝" : "／"} {shape}</button>
                    ))}
                  </div>
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    <label className="block text-xs font-medium text-text-secondary">Border</label>
                    <input type="color" value={shapeStyle.strokeColor} onChange={(e) => setShapeStyle((s) => ({ ...s, strokeColor: e.target.value }))} className="h-8 w-full cursor-pointer rounded border border-border" />
                    <label className="block text-xs font-medium text-text-secondary">Fill</label>
                    <input type="color" value={shapeStyle.fillColor} onChange={(e) => setShapeStyle((s) => ({ ...s, fillColor: e.target.value }))} className="h-8 w-full cursor-pointer rounded border border-border" />
                    <div className="flex gap-2">
                      <label className="flex-1 text-xs text-text-muted">Border opacity</label>
                      <input type="range" min="0" max="100" value={shapeStyle.strokeOpacity} onChange={(e) => setShapeStyle((s) => ({ ...s, strokeOpacity: Number(e.target.value) }))} className="w-20" />
                    </div>
                    <div className="flex gap-2">
                      <label className="flex-1 text-xs text-text-muted">Fill opacity</label>
                      <input type="range" min="0" max="100" value={shapeStyle.fillOpacity} onChange={(e) => setShapeStyle((s) => ({ ...s, fillOpacity: Number(e.target.value) }))} className="w-20" />
                    </div>
                  </div>
                </>
              )}
              {activeLeftTool === "pencil" && (
                <>
                  <div className="text-xs font-semibold text-text-muted uppercase tracking-wide">Draw</div>
                  <div className="mt-2 space-y-1">
                    {(["Pen", "Highlighter", "Eraser", "Lasso"] as const).map((sub) => (
                      <button key={sub} type="button" className={`w-full rounded-lg px-3 py-2 text-left text-sm ${pencilSubTool === sub.toLowerCase() ? "bg-toolbar font-medium" : ""}`} onClick={() => { setPencilSubTool(sub.toLowerCase() as any); if (sub === "Pen") setTool("freedraw"); if (sub === "Eraser") setTool("eraser"); }}>
                        {sub}
                      </button>
                    ))}
                  </div>
                  {(pencilSubTool === "pen" || pencilSubTool === "highlighter") && (
                    <div className="mt-3 space-y-2 border-t border-border pt-3">
                      <label className="block text-xs font-medium text-text-secondary">Color</label>
                      <input type="color" value={pencilOptions.color} onChange={(e) => setPencilOptions((p) => ({ ...p, color: e.target.value }))} className="h-8 w-full cursor-pointer rounded border border-border" />
                      <label className="block text-xs font-medium text-text-secondary">Stroke size</label>
                      <input type="range" min="1" max="20" value={pencilOptions.strokeWidth} onChange={(e) => setPencilOptions((p) => ({ ...p, strokeWidth: Number(e.target.value) }))} className="w-full" />
                      <label className="block text-xs font-medium text-text-secondary">Line style</label>
                      <select value={pencilOptions.strokeStyle} onChange={(e) => setPencilOptions((p) => ({ ...p, strokeStyle: e.target.value as "solid" | "dashed" }))} className="w-full rounded border border-border bg-surface px-2 py-1 text-sm">
                        <option value="solid">Solid</option>
                        <option value="dashed">Dashed</option>
                      </select>
                      <label className="block text-xs font-medium text-text-secondary">Opacity</label>
                      <input type="range" min="0" max="100" value={pencilOptions.opacity} onChange={(e) => setPencilOptions((p) => ({ ...p, opacity: Number(e.target.value) }))} className="w-full" />
                    </div>
                  )}
                </>
              )}
              {activeLeftTool === "link" && (
                <>
                  <div className="text-xs font-semibold text-text-muted uppercase tracking-wide">Link & media</div>
                  <div className="mt-2 space-y-1.5">
                    <button type="button" className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm font-medium hover:bg-toolbar" onClick={() => { const url = window.prompt("Enter URL"); if (url) insertLinkOrEmbed(url); selectLeftTool(null) }}>Insert link</button>
                    <button type="button" className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm font-medium hover:bg-toolbar" onClick={() => { insertImage(); selectLeftTool(null) }}>Upload image</button>
                    <button type="button" className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm font-medium hover:bg-toolbar" onClick={() => { const url = window.prompt("Embed URL"); if (url) insertLinkOrEmbed(url); selectLeftTool(null) }}>Embed external content</button>
                  </div>
                </>
              )}
            </div>
            {activeLeftTool === "formats" && formatsActiveCategory != null && (
              <div className="flex min-w-0 border-l border-border bg-surface/95">
                <div className="max-h-[calc(100vh-8rem)] w-52 overflow-y-auto p-3">
                  <div className="rounded-lg bg-toolbar/70 px-2 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wide">{formatsActiveCategory}</div>
                  <div className="mt-2 space-y-0.5">
                    {(FORMATS_SUB_OPTIONS[formatsActiveCategory] ?? []).map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-text-primary hover:bg-toolbar"
                        onClick={() => insertFormatsStructure(sub)}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {activeLeftTool === "sticky" && (
          <div className="pointer-events-auto ml-2 flex items-center gap-1.5 rounded-2xl border border-border bg-surface/95 px-2 py-2 shadow-md backdrop-blur">
            <span className="text-xs font-medium text-text-muted">Color</span>
            {["#fef08a", "#fecdd3", "#bfdbfe", "#bbf7d0", "#e9d5ff", "#e5e7eb"].map((color) => (
              <button key={color} type="button" className={`h-7 w-7 rounded-lg border-2 ${stickyNoteColor === color ? "border-primary" : "border-transparent"}`} style={{ backgroundColor: color }} onClick={() => setStickyNoteColor(color)} aria-label={`Sticky color ${color}`} />
            ))}
          </div>
        )}
      </div>
      )}

      {/* Bottom-right: Grid (left of zoom), then zoom. Hidden in presentation mode. */}
      {!presentationMode && (
      <div className="pointer-events-none absolute bottom-4 right-4 z-50">
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-2xl border border-border bg-surface/85 p-1 shadow-md backdrop-blur">
          <button
            type="button"
            className={`${iconBtnClass} ${effectiveGrid ? iconBtnActiveClass : ""}`}
            onClick={() => {
              setGridModeEnabled((prev) => {
                const next = !prev
                const snap = latestRef.current
                persist({ ...snap, appState: { ...(snap?.appState || {}), gridModeEnabled: next } })
                return next
              })
            }}
            aria-pressed={effectiveGrid}
            title="Grid"
          >
            #
          </button>
          <span className="h-8 w-px bg-border/70" aria-hidden />
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
      )}

      {/* Keep / Discard template review bar (after AI template is placed). Hidden in presentation mode. */}
      {showTemplateReview && !presentationMode && (
        <div className="pointer-events-auto absolute bottom-24 left-1/2 z-50 -translate-x-1/2">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-border bg-surface/95 px-4 py-2.5 shadow-lg backdrop-blur">
            <span className="text-sm font-medium text-text-primary">Template added.</span>
            <span className="text-xs text-text-muted">Double-click any text to edit.</span>
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

      {/* Bottom-center AI template generator. Hidden in presentation mode. */}
      {!presentationMode && (
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-50 -translate-x-1/2">
        <div className="pointer-events-auto">
          <button
            type="button"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-border bg-surface/90 px-4 text-sm font-medium text-text-secondary shadow-md backdrop-blur hover:bg-toolbar hover:text-text-primary active:translate-y-px transition duration-fast"
            onClick={() => setAiOpen(true)}
            aria-label="Need Help Generating"
            title="Need Help Generating"
          >
            Need Help Generating
          </button>
        </div>
      </div>
      )}

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

            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface/70 p-3">
              <input
                type="checkbox"
                checked={shareAllowEdit}
                onChange={(e) => setShareAllowEdit(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-sm font-medium text-text-primary">Allow editing for shared users</span>
            </label>

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

      {publishTemplateOpen && (
        <div className="pointer-events-auto absolute inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setPublishTemplateOpen(false)} aria-hidden />
          <div className="absolute left-1/2 top-1/2 w-[min(400px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <div className="text-base font-semibold text-text-primary">Publish as Template</div>
            <p className="mt-1 text-sm text-text-secondary">Create a snapshot of this board as a reusable template. The template will not change if you edit this board later.</p>
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-text-primary">Template name</span>
              <input
                type="text"
                value={publishTemplateName}
                onChange={(e) => setPublishTemplateName(e.target.value)}
                placeholder="e.g. Sprint Retro"
                maxLength={120}
                className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="mt-3 block">
              <span className="text-sm font-semibold text-text-secondary">Description (optional)</span>
              <input
                type="text"
                value={publishTemplateDescription}
                onChange={(e) => setPublishTemplateDescription(e.target.value)}
                placeholder="Short description"
                maxLength={500}
                className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            {publishTemplateNotice && <p className="mt-3 text-sm text-text-muted">{publishTemplateNotice}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={pillBtnClass} onClick={() => setPublishTemplateOpen(false)}>Cancel</button>
              <button
                type="button"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={publishTemplateBusy || !publishTemplateName.trim() || !boardId}
                onClick={async () => {
                  if (!boardId || !publishTemplateName.trim()) return
                  setPublishTemplateBusy(true)
                  setPublishTemplateNotice(null)
                  try {
                    const scene = latestRef.current
                    if (scene && typeof scene === "object") {
                      await backendApi.saveBoardScene(boardId, { scene })
                    }
                    await backendApi.publishTemplate(boardId, {
                      name: publishTemplateName.trim(),
                      description: publishTemplateDescription.trim() || undefined,
                    })
                    setPublishTemplateNotice("Template published. It appears on the Create Board page.")
                    setPublishTemplateOpen(false)
                  } catch (e: any) {
                    setPublishTemplateNotice(e?.message || "Failed to publish template.")
                  } finally {
                    setPublishTemplateBusy(false)
                  }
                }}
              >
                {publishTemplateBusy ? "Publishing…" : "Publish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premade Templates modal - nearly full screen, left nav + template cards */}
      {templatesModalOpen && (
        <div className="pointer-events-auto fixed inset-0 z-[60]" data-templates-modal>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setTemplatesModalOpen(false)} aria-hidden />
          <div className="absolute inset-4 flex overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <nav className="w-52 shrink-0 border-r border-border p-3">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wide">Categories</div>
              {TEMPLATE_CATEGORIES.map((cat) => (
                <button key={cat} type="button" className={`mt-2 w-full rounded-lg px-3 py-2 text-left text-sm ${templatesCategory === cat ? "bg-toolbar font-medium text-text-primary" : "text-text-secondary hover:bg-toolbar"}`} onClick={() => setTemplatesCategory(cat)}>{cat}</button>
              ))}
            </nav>
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="shrink-0 border-b border-border p-3">
                <input type="search" placeholder="Search templates…" value={templatesSearch} onChange={(e) => setTemplatesSearch(e.target.value)} className="w-full max-w-md rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-5">
                  {getTemplatesForCategory(templatesCategory)
                    .filter((t) => !templatesSearch.trim() || t.title.toLowerCase().includes(templatesSearch.toLowerCase()))
                    .map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className="flex flex-col overflow-hidden rounded-xl border-2 border-border bg-surface text-left shadow-lg transition-all hover:border-primary/60 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
                        onClick={() => { insertTemplateByKey(t.id); setTemplatesModalOpen(false) }}
                      >
                        <div className="flex h-32 w-full items-center justify-center bg-[#f1f5f9] p-2 shadow-inner">
                          <div className="h-full w-full max-w-[180px] overflow-hidden rounded-lg border border-white/60 bg-white shadow-md">
                            <TemplatePreviewSvg id={t.id} />
                          </div>
                        </div>
                        <div className="border-t border-border bg-surface px-3 py-2.5 font-semibold text-text-primary text-sm shadow-[0_-1px_0_0_rgba(0,0,0,0.05)]">
                          {t.title}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>
            <button type="button" className="absolute right-4 top-4 rounded-lg p-2 text-text-secondary hover:bg-toolbar" onClick={() => setTemplatesModalOpen(false)} aria-label="Close">×</button>
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
        gridModeEnabled={effectiveGrid}
        handleKeyboardGlobally={!aiOpen && !shareOpen && !onboardingOpen && !zoomEditing && !publishTemplateOpen}
        onChange={handleChange}
        UIOptions={uiOptions}
      />

      {/* Comment: new-comment input at click location (one at a time) */}
      {!presentationMode && pendingComment != null && (
        <div
          data-comment-ui
          className="pointer-events-auto absolute z-50 w-80 rounded-xl border border-border bg-surface p-4 shadow-xl"
          style={{
            left: (pendingComment.x + scrollX) * zoomValue,
            top: (pendingComment.y + scrollY) * zoomValue,
            transform: "translate(-50%, -50%)",
          }}
        >
          <textarea
            value={pendingCommentText}
            onChange={(e) => setPendingCommentText(e.target.value)}
            placeholder="Type your comment…"
            rows={4}
            className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" className={pillBtnClass} onClick={cancelNewComment}>Cancel</button>
            <button type="button" className={pillBtnClass} onClick={saveNewComment}>Save</button>
          </div>
        </div>
      )}

      {/* Comment markers on whiteboard: author name, blue bubble, tail to spot; anchored to scene (stationary with canvas) */}
      {!presentationMode && commentMarkers.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-40" aria-hidden>
          {commentMarkers.map((m) => (
            <div
              key={m.id}
              className="pointer-events-auto absolute cursor-pointer"
              style={{ left: (m.x + scrollX) * zoomValue, top: (m.y + scrollY) * zoomValue }}
              onClick={() => setActiveCommentId(activeCommentId === m.id ? null : m.id)}
            >
              <div className="relative flex flex-col items-center" style={{ transform: "translate(-50%, -100%)" }}>
                <div className="rounded-lg bg-blue-500 px-2.5 py-1.5 text-xs font-medium text-white shadow-md whitespace-nowrap">
                  {m.author || "Comment"}
                </div>
                <div
                  className="h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-blue-500"
                  style={{ marginTop: "-1px" }}
                  aria-hidden
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Click-outside backdrop: close thread (does not delete) */}
      {!presentationMode && activeCommentId != null && (
        <div
          className="pointer-events-auto absolute inset-0 z-[45]"
          aria-hidden
          onClick={() => setActiveCommentId(null)}
        />
      )}

      {/* Comment thread popover: original + replies + reply input (send icon posts, Done closes) */}
      {!presentationMode && activeCommentId != null && (
        <div
          ref={threadPopoverRef}
          data-comment-ui
          className="pointer-events-auto absolute bottom-24 left-1/2 z-50 w-96 -translate-x-1/2 rounded-xl border border-border bg-surface p-4 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">Comment</span>
            <button type="button" className="text-text-muted hover:text-text-primary" onClick={() => setActiveCommentId(null)} aria-label="Close">×</button>
          </div>
          {(() => {
            const c = commentMarkers.find((m) => m.id === activeCommentId)
            if (!c) return null
            return (
              <>
                <div className="mt-3 max-h-48 overflow-y-auto space-y-3 text-sm">
                  <div className="rounded-lg bg-muted/50 px-3 py-2">
                    <p className="text-xs font-medium text-text-muted">{c.author}</p>
                    <p className="mt-0.5 text-text-primary whitespace-pre-wrap">{c.text || "—"}</p>
                  </div>
                  {c.replies.map((r, i) => (
                    <div key={i} className="rounded-lg bg-muted/30 px-3 py-2 pl-4 border-l-2 border-primary/30">
                      <p className="text-xs font-medium text-text-muted">{r.author}</p>
                      <p className="mt-0.5 text-text-primary whitespace-pre-wrap">{r.text}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 border-t border-border pt-3">
                  <div className="flex gap-2">
                    <textarea
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      placeholder="Type a reply…"
                      rows={3}
                      className="flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      type="button"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg btn-gradient"
                      onClick={saveReply}
                      aria-label="Send reply"
                      title="Send"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2z" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button type="button" className={pillBtnClass} onClick={() => setActiveCommentId(null)}>Done</button>
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}

