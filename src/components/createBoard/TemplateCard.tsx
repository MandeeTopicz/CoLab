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
}

const CARD_WIDTH = 160
const CARD_PREVIEW_HEIGHT = 100

export function TemplateCard({
  name,
  ownerName,
  aiAssisted,
  isFavorite,
  onSelect,
  onToggleFavorite,
  preview = "default",
}: TemplateCardProps) {
  return (
    <div
      className="flex shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-shadow hover:shadow-md"
      style={{ width: CARD_WIDTH }}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-col text-left focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-inset"
      >
        <div
          className="flex items-center justify-center border-b border-border bg-toolbar/40 text-text-muted"
          style={{ height: CARD_PREVIEW_HEIGHT }}
        >
          {preview === "blank" ? (
            <span className="text-4xl font-light text-text-muted">+</span>
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
                onClick={onToggleFavorite}
                className="rounded p-1 text-text-muted hover:bg-toolbar hover:text-primary"
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                {isFavorite ? "★" : "☆"}
              </button>
            )}
          </div>
        </div>
      </button>
    </div>
  )
}
