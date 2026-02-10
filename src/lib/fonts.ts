/** Font category for grouping in the font picker. */
export type FontCategory = "Sans" | "Serif" | "Mono" | "Display"

export interface FontEntry {
  id: number
  displayName: string
  fontFamily: string
  category: FontCategory
}

/** Centralized font registry. Single source of truth for all text elements. */
export const FONT_REGISTRY: FontEntry[] = [
  { id: 1, displayName: "Inter", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", category: "Sans" },
  { id: 2, displayName: "Noto Sans", fontFamily: "Noto Sans, ui-sans-serif, system-ui, sans-serif", category: "Sans" },
  { id: 3, displayName: "Roboto", fontFamily: "Roboto, ui-sans-serif, system-ui, sans-serif", category: "Sans" },
  { id: 4, displayName: "Open Sans", fontFamily: '"Open Sans", ui-sans-serif, system-ui, sans-serif', category: "Sans" },
  { id: 5, displayName: "Lato", fontFamily: "Lato, ui-sans-serif, system-ui, sans-serif", category: "Sans" },
  { id: 6, displayName: "Montserrat", fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif", category: "Sans" },
  { id: 7, displayName: "Poppins", fontFamily: "Poppins, ui-sans-serif, system-ui, sans-serif", category: "Sans" },
  { id: 8, displayName: "Source Sans 3", fontFamily: '"Source Sans 3", ui-sans-serif, system-ui, sans-serif', category: "Sans" },
  { id: 9, displayName: "Merriweather", fontFamily: "Merriweather, ui-serif, Georgia, serif", category: "Serif" },
  { id: 10, displayName: "Playfair Display", fontFamily: '"Playfair Display", ui-serif, Georgia, serif', category: "Display" },
  { id: 11, displayName: "JetBrains Mono", fontFamily: '"JetBrains Mono", ui-monospace, monospace', category: "Mono" },
]

/** Default font ID for new text elements. */
export const DEFAULT_FONT_ID = 1

/** Get font entry by ID. */
export function getFontById(id: number): FontEntry | undefined {
  return FONT_REGISTRY.find((f) => f.id === id)
}

/** Get fonts grouped by category. */
export function getFontsByCategory(): Record<FontCategory, FontEntry[]> {
  const byCategory: Record<FontCategory, FontEntry[]> = {
    Sans: [],
    Serif: [],
    Mono: [],
    Display: [],
  }
  for (const font of FONT_REGISTRY) {
    byCategory[font.category].push(font)
  }
  return byCategory
}
