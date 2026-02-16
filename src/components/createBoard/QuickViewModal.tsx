import { useMemo } from "react"
import { ExcalidrawCanvasThumbnail } from "./ExcalidrawCanvasThumbnail"

interface QuickViewModalProps {
  open: boolean
  templateName: string
  onClose: () => void
  /** Scene snapshot for read-only whiteboard preview */
  scene?: unknown
}

/** Read-only preview of a template. Does not create or modify anything. */
export function QuickViewModal({ open, templateName, onClose, scene }: QuickViewModalProps) {
  const hasScene = scene && typeof scene === "object" && (scene as any).elements

  const previewSize = useMemo(() => {
    if (typeof window === "undefined") return { w: 800, h: 520 }
    const maxW = Math.min(900, window.innerWidth - 48)
    const maxH = Math.min(600, window.innerHeight - 160)
    return { w: maxW, h: maxH }
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="flex h-[80vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-lg font-semibold text-text-primary">{templateName}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-text-muted hover:bg-toolbar" aria-label="Close">
            ×
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-start overflow-auto p-4">
          {hasScene ? (
            <>
              <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
                <ExcalidrawCanvasThumbnail
                  scene={scene as { elements?: any[]; appState?: any; files?: Record<string, any> }}
                  width={previewSize.w}
                  height={previewSize.h}
                  animate
                />
              </div>
              <p className="mt-3 text-sm text-text-muted">Read-only preview. Use &quot;Create New Board&quot; to make an editable copy.</p>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-border bg-toolbar/30 p-8 text-center text-text-muted">
              <p>Preview not available for this template.</p>
              <p className="mt-2">Use &quot;Create New Board&quot; to create an editable copy.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
