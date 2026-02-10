interface QuickViewModalProps {
  open: boolean
  templateName: string
  onClose: () => void
  /** Optional: scene snapshot for future read-only render */
  scene?: unknown
}

/** Read-only preview of a template. Does not create or modify anything. */
export function QuickViewModal({ open, templateName, onClose, scene }: QuickViewModalProps) {
  if (!open) return null

  const hasScene = scene && typeof scene === "object" && (scene as any).elements

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="flex h-[80vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-lg font-semibold text-text-primary">{templateName}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-text-muted hover:bg-toolbar" aria-label="Close">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {hasScene ? (
            <div className="rounded-lg border border-border bg-white p-6 text-sm text-text-muted">
              <p>Template preview (read-only). Elements: {(scene as any).elements?.length ?? 0}.</p>
              <p className="mt-2">Use &quot;Create New Board&quot; to make an editable copy.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-toolbar/30 p-8 text-center text-text-muted">
              <p>Preview not available for this template.</p>
              <p className="mt-2">Use &quot;Create New Board&quot; to create an editable copy.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
