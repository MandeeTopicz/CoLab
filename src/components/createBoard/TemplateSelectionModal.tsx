interface TemplateSelectionModalProps {
  open: boolean
  templateName: string
  onClose: () => void
  onCreateNewBoard: () => void
  onQuickView: () => void
}

/** After selecting a template: choose Create New Board or Quick View. No auto-apply. */
export function TemplateSelectionModal({
  open,
  templateName,
  onClose,
  onCreateNewBoard,
  onQuickView,
}: TemplateSelectionModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-text-primary">Use template</h3>
        <p className="mt-1 text-sm text-text-muted">{templateName}</p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => { onCreateNewBoard(); onClose(); }}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white"
          >
            Create New Board
          </button>
          <button
            type="button"
            onClick={() => { onQuickView(); onClose(); }}
            className="w-full rounded-lg border border-border py-2.5 text-sm font-semibold text-text-primary hover:bg-toolbar"
          >
            Quick View
          </button>
        </div>
        <button type="button" onClick={onClose} className="mt-3 w-full rounded-lg py-2 text-sm text-text-muted hover:bg-toolbar">
          Cancel
        </button>
      </div>
    </div>
  )
}
