import { useEffect, useState } from "react"

/** Renders a canvas snapshot of Excalidraw scene (real whiteboard content). Uses exportToCanvas for fidelity. */
interface ExcalidrawCanvasThumbnailProps {
  scene: { elements?: any[]; appState?: any; files?: Record<string, any> } | null
  width: number
  height: number
  className?: string
  /** Optional: subtle scale animation when loaded */
  animate?: boolean
}

export function ExcalidrawCanvasThumbnail({
  scene,
  width,
  height,
  className = "",
  animate = false,
}: ExcalidrawCanvasThumbnailProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!scene || !Array.isArray(scene.elements) || scene.elements.length === 0) {
      setDataUrl(null)
      setError(false)
      return
    }
    let cancelled = false
    setError(false)
    setDataUrl(null)

    const run = async () => {
      try {
        const { exportToCanvas } = await import("@excalidraw/excalidraw")
        const elements = scene.elements!.filter((el: any) => !el.isDeleted)
        if (elements.length === 0 || cancelled) return

        const appState = {
          viewBackgroundColor: (scene.appState as any)?.viewBackgroundColor ?? "#ffffff",
          exportBackground: true,
          exportWithDarkMode: false,
          ...(scene.appState || {}),
        }
        const files = scene.files ?? null

        // Export full whiteboard zoomed out: getDimensions receives scene content size.
        // Return dimensions that fit inside the tile while preserving aspect ratio, plus scale for renderer.
        const canvas = await exportToCanvas({
          elements,
          appState,
          files,
          getDimensions: (sceneWidth: number, sceneHeight: number) => {
            const scale = Math.min(width / sceneWidth, height / sceneHeight, 2)
            return {
              width: Math.round(sceneWidth * scale),
              height: Math.round(sceneHeight * scale),
              scale,
            }
          },
          exportPadding: 16,
        })
        if (cancelled) return
        const url = canvas.toDataURL("image/png")
        setDataUrl(url)
      } catch (e) {
        if (!cancelled) setError(true)
      }
    }
    run()
    return () => { cancelled = true }
  }, [scene, width, height])

  if (error || (!scene?.elements?.length && !dataUrl)) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg ${className}`.trim()}
        style={{
          width,
          height,
          backgroundColor: "#f1f5f9",
          fontSize: 10,
          color: "#64748b",
        }}
      >
        No preview
      </div>
    )
  }

  if (!dataUrl) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg ${className}`.trim()}
        style={{
          width,
          height,
          backgroundColor: "#f1f5f9",
        }}
      >
        <span className="animate-pulse text-xs text-text-muted">…</span>
      </div>
    )
  }

  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-lg ${className}`.trim()}
      style={{
        width,
        height,
        backgroundColor: (scene?.appState as any)?.viewBackgroundColor ?? "#fff",
      }}
    >
      <img
        src={dataUrl}
        alt=""
        className={`max-w-full max-h-full w-auto h-auto object-contain ${animate ? "animate-in fade-in duration-300" : ""}`.trim()}
        style={{ maxWidth: width, maxHeight: height }}
      />
    </div>
  )
}
