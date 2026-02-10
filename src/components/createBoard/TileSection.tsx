import type { ReactNode } from "react"

interface TileSectionProps {
  title: string
  children: ReactNode
  /** Optional right-side content (e.g. search input) */
  action?: ReactNode
  /** Center the title (use when there is no action) */
  centerTitle?: boolean
  /** Extra padding around the section (e.g. "p-6" or "py-6 px-6") */
  sectionClassName?: string
}

/** Stacked tile container with optional horizontal scroll area inside. */
export function TileSection({ title, children, action, centerTitle, sectionClassName = "" }: TileSectionProps) {
  return (
    <section className={`rounded-xl border border-border bg-surface p-4 shadow-sm ${sectionClassName}`.trim()}>
      <div className={`flex items-center gap-4 ${centerTitle ? "justify-center py-2" : "mb-3 justify-between"}`}>
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        {action}
      </div>
      <div className={`overflow-x-auto overflow-y-hidden pb-2 ${centerTitle ? "mt-3" : ""}`}>
        <div className="flex gap-4" style={{ minHeight: 0 }}>
          {children}
        </div>
      </div>
    </section>
  )
}
