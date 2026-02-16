import { useMemo } from "react"

/** Bounding box of elements in scene coordinates. */
function getBbox(elements: any[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (!elements?.length) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const el of elements) {
    if (!el) continue
    if (Array.isArray(el.points) && el.points.length > 0) {
      for (const p of el.points) {
        const x = el.x + (p?.[0] ?? 0), y = el.y + (p?.[1] ?? 0)
        minX = Math.min(minX, x); maxX = Math.max(maxX, x)
        minY = Math.min(minY, y); maxY = Math.max(maxY, y)
      }
    } else {
      const x = Number(el.x) || 0, y = Number(el.y) || 0
      const w = Number(el.width) || 0, h = Number(el.height) || 0
      minX = Math.min(minX, x); maxX = Math.max(maxX, x + w)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y + h)
    }
  }
  if (minX === Infinity) return null
  return { minX, minY, maxX, maxY }
}

interface ScenePreviewProps {
  /** Scene with { elements, appState? } */
  scene: { elements?: any[]; appState?: any }
  width: number
  height: number
  className?: string
}

/** Renders a minimal SVG preview of Excalidraw-style scene elements. */
export function ScenePreview({ scene, width, height, className = "" }: ScenePreviewProps) {
  const elements = Array.isArray(scene?.elements) ? scene.elements : []
  const viewBg = (scene?.appState as any)?.viewBackgroundColor ?? "#ffffff"

  const { viewBox, scale, tx, ty } = useMemo(() => {
    const bbox = getBbox(elements)
    const padding = 20
    if (!bbox) {
      return { viewBox: `0 0 ${width} ${height}`, scale: 1, tx: 0, ty: 0 }
    }
    const sceneW = bbox.maxX - bbox.minX || 1
    const sceneH = bbox.maxY - bbox.minY || 1
    const scale = Math.min((width - padding * 2) / sceneW, (height - padding * 2) / sceneH, 2)
    const tx = width / 2 - (bbox.minX + sceneW / 2) * scale
    const ty = height / 2 - (bbox.minY + sceneH / 2) * scale
    return { viewBox: `0 0 ${width} ${height}`, scale, tx, ty }
  }, [elements, width, height])

  const shapes = useMemo(() => {
    return elements.map((el: any) => {
      if (!el) return null
      const x = Number(el.x) || 0
      const y = Number(el.y) || 0
      const w = Number(el.width) || 0
      const h = Number(el.height) || 0
      const stroke = (el.strokeColor as string) ?? "#1e293b"
      const fill = (el.backgroundColor as string) ?? "transparent"
      const type = (el.type as string) || "rectangle"

      if (type === "rectangle" || type === "diamond") {
        const cx = x + w / 2
        const cy = y + h / 2
        const points =
          type === "diamond"
            ? `${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`
            : undefined
        if (points) {
          return (
            <polygon
              key={el.id}
              points={points}
              fill={fill}
              stroke={stroke}
              strokeWidth={2}
              transform={`translate(${tx}, ${ty}) scale(${scale})`}
            />
          )
        }
        return (
          <rect
            key={el.id}
            x={x}
            y={y}
            width={w}
            height={h}
            fill={fill}
            stroke={stroke}
            strokeWidth={2}
            rx={type === "rectangle" ? (el.roundness?.type === "round" ? 8 : 0) : 0}
            transform={`translate(${tx}, ${ty}) scale(${scale})`}
          />
        )
      }
      if (type === "ellipse") {
        return (
          <ellipse
            key={el.id}
            cx={x + w / 2}
            cy={y + h / 2}
            rx={w / 2}
            ry={h / 2}
            fill={fill}
            stroke={stroke}
            strokeWidth={2}
            transform={`translate(${tx}, ${ty}) scale(${scale})`}
          />
        )
      }
      if ((type === "arrow" || type === "line") && Array.isArray(el.points) && el.points.length >= 2) {
        const d = el.points
          .map((p: number[], i: number) => `${i === 0 ? "M" : "L"} ${el.x + (p[0] ?? 0)} ${el.y + (p[1] ?? 0)}`)
          .join(" ")
        return (
          <path
            key={el.id}
            d={d}
            fill="none"
            stroke={stroke}
            strokeWidth={2}
            transform={`translate(${tx}, ${ty}) scale(${scale})`}
          />
        )
      }
      if (type === "freedraw" && Array.isArray(el.points) && el.points.length >= 2) {
        const d = el.points
          .map((p: number[], i: number) => `${i === 0 ? "M" : "L"} ${el.x + (p[0] ?? 0)} ${el.y + (p[1] ?? 0)}`)
          .join(" ")
        return (
          <path
            key={el.id}
            d={d}
            fill="none"
            stroke={stroke}
            strokeWidth={2}
            transform={`translate(${tx}, ${ty}) scale(${scale})`}
          />
        )
      }
      return (
        <rect
          key={el.id}
          x={x}
          y={y}
          width={w || 10}
          height={h || 10}
          fill={fill}
          stroke={stroke}
          strokeWidth={2}
          transform={`translate(${tx}, ${ty}) scale(${scale})`}
        />
      )
    }).filter(Boolean)
  }, [elements, scale, tx, ty])

  if (elements.length === 0) {
    return (
      <div
        className={className}
        style={{ width, height, backgroundColor: viewBg, borderRadius: 8 }}
      />
    )
  }

  return (
    <svg
      viewBox={viewBox}
      width={width}
      height={height}
      className={className}
      style={{ backgroundColor: viewBg, borderRadius: 8, display: "block" }}
    >
      {shapes}
    </svg>
  )
}
