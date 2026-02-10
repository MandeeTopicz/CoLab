import { useState } from "react"

interface BoardNamePromptModalProps {
  title: string
  open: boolean
  onClose: () => void
  onConfirm: (name: string) => void
  confirmLabel?: string
}

export function BoardNamePromptModal({
  title,
  open,
  onClose,
  onConfirm,
  confirmLabel = "Create",
}: BoardNamePromptModalProps) {
  const [name, setName] = useState("")

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onConfirm(trimmed)
    setName("")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <form onSubmit={handleSubmit} className="mt-4">
          <label className="block text-sm font-medium text-text-secondary">Board name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter board name"
            className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus
            maxLength={120}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:bg-toolbar">
              Cancel
            </button>
            <button type="submit" disabled={!name.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
