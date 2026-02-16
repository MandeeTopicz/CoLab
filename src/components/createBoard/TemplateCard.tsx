import { useEffect, useState } from "react"
import { useApi } from "../../lib/api"
import { ExcalidrawCanvasThumbnail } from "./ExcalidrawCanvasThumbnail"

interface TemplateCardProps {
  templateId: string
  name: string
  ownerName?: string
  aiAssisted?: boolean
  isFavorite?: boolean
  onSelect: () => void
  onToggleFavorite?: (e: React.MouseEvent) => void
  /** Optional: use a custom preview (e.g. blank tile uses + icon) */
  preview?: "default" | "blank"
  /** Optional: pre-loaded scene for preview (otherwise fetched when templateId is set) */
  scene?: { elements?: any[]; appState?: any } | null
}

const CARD_WIDTH = 160
const CARD_PREVIEW_HEIGHT = 100

export function TemplateCard({
  templateId,
  name,
  ownerName,
  aiAssisted,
  isFavorite,
  onSelect,
  onToggleFavorite,
  preview = "default",
  scene: sceneProp,
}: TemplateCardProps) {
  const api = useApi()
  const [fetchedScene, setFetchedScene] = useState<{ elements?: any[]; appState?: any } | null>(null)

  const hasScene = sceneProp !== undefined ? sceneProp : fetchedScene
  const shouldFetch = preview === "default" && templateId && sceneProp === undefined

  useEffect(() => {
    if (!shouldFetch) return
    let cancelled = false
    api.getTemplate(templateId).then((res) => {
      if (!cancelled && res?.template?.scene) setFetchedScene(res.template.scene)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [api, templateId, shouldFetch])

  return (
    <div
      className="flex shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-shadow hover:shadow-md"
      style={{ width: CARD_WIDTH }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
        className="flex flex-col text-left focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-inset"
        aria-label={`Use template: ${name}`}
      >
        <div
          className="flex items-center justify-center overflow-hidden border-b border-border bg-toolbar/40 text-text-muted"
          style={{ height: CARD_PREVIEW_HEIGHT }}
        >
          {preview === "blank" ? (
            <span className="text-4xl font-light text-text-muted">+</span>
          ) : hasScene && hasScene.elements?.length ? (
            <ExcalidrawCanvasThumbnail scene={hasScene} width={CARD_WIDTH} height={CARD_PREVIEW_HEIGHT} className="shrink-0" animate />
          ) : (
            <div className="h-12 w-16 rounded border border-border bg-surface" aria-hidden />
          )}
        </div>
        <div className="relative p-3">
          <div className="pr-6">
            <span className="line-clamp-2 text-sm font-medium text-text-primary">{name}</span>
            {ownerName && (
              <p className="mt-0.5 text-xs text-text-muted">
                by {ownerName}
              </p>
            )}
          </div>
          <div className="absolute right-2 top-2 flex items-center gap-1">
            {aiAssisted && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">AI</span>
            )}
            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(e); }}
                className="rounded p-1 text-text-muted hover:bg-toolbar hover:text-primary"
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                {isFavorite ? "★" : "☆"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
