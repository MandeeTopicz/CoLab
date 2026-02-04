import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useParams } from "react-router-dom"
import { Excalidraw } from "@excalidraw/excalidraw"
import "@excalidraw/excalidraw/index.css"

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null
}

function sanitizeInitialData(raw: unknown) {
  if (!isRecord(raw)) return null

  const elements = Array.isArray(raw.elements) ? raw.elements : []
  const files = (isRecord(raw.files) ? raw.files : {}) as any

  const appStateRaw = isRecord(raw.appState) ? raw.appState : {}

  // IMPORTANT:
  // Excalidraw's appState contains non-serializable fields (e.g. collaborators: Map).
  // Persisting and restoring the full appState can crash the app on load.
  // Only keep a safe, minimal subset here.
  const viewBackgroundColor =
    typeof appStateRaw.viewBackgroundColor === "string"
      ? appStateRaw.viewBackgroundColor
      : "#1f1f1f"

  const gridModeEnabled = Boolean(appStateRaw.gridModeEnabled)
  const zenModeEnabled = Boolean(appStateRaw.zenModeEnabled)
  const theme =
    typeof appStateRaw.theme === "string" ? appStateRaw.theme : undefined

  const appState = {
    viewBackgroundColor,
    gridModeEnabled,
    zenModeEnabled,
    ...(theme ? { theme } : {}),
  }

  return { elements, files, appState }
}

export function BoardPage() {
  const { boardId } = useParams()
  const containerRef = useRef<HTMLDivElement | null>(null)

  const persistenceKey = useMemo(() => {
    // Local persistence per board (MVP). We’ll switch to server-backed persistence + realtime next.
    return `board:${boardId || "unknown"}`
  }, [boardId])

  const [initialData] = useState(() => {
    try {
      const raw = localStorage.getItem(persistenceKey)
      if (!raw) return null
      return sanitizeInitialData(JSON.parse(raw))
    } catch {
      return null
    }
  })

  const [gridModeEnabled, setGridModeEnabled] = useState<boolean>(() => {
    return Boolean(initialData?.appState?.gridModeEnabled)
  })

  const apiRef = useRef<any>(null)
  const [mountBeforeDraw, setMountBeforeDraw] = useState<HTMLElement | null>(null)
  const [mountAfterEraser, setMountAfterEraser] = useState<HTMLElement | null>(null)

  const latestRef = useRef<any>(
    initialData || {
      elements: [],
      files: {},
      appState: {
        viewBackgroundColor: "#1f1f1f",
        // Keep the full toolbar visible (easier UX + matches your request for tool buttons)
        zenModeEnabled: false,
        gridModeEnabled: false,
      },
    }
  )

  const toSerializableAppState = useCallback(
    (appState: any) => {
      return {
        viewBackgroundColor: appState?.viewBackgroundColor ?? "#1f1f1f",
        zenModeEnabled: Boolean(appState?.zenModeEnabled),
        gridModeEnabled: Boolean(gridModeEnabled),
        ...(typeof appState?.theme === "string" ? { theme: appState.theme } : {}),
      }
    },
    [gridModeEnabled]
  )

  const persist = useCallback(
    (next: any) => {
      latestRef.current = next
      try {
        localStorage.setItem(persistenceKey, JSON.stringify(next))
      } catch {
        // ignore
      }
    },
    [persistenceKey]
  )

  const initialDataForExcalidraw = initialData || {
    elements: [],
    files: {},
    appState: {
      viewBackgroundColor: "#1f1f1f",
      zenModeEnabled: false,
      gridModeEnabled: false,
    },
  }

  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    const ensureMount = (id: string) => {
      const existing = root.querySelector<HTMLElement>(`[data-board-mount="${id}"]`)
      if (existing) return existing
      const el = document.createElement("div")
      el.dataset.boardMount = id
      el.style.display = "inline-flex"
      el.style.alignItems = "center"
      el.style.marginInline = "6px"
      return el
    }

    const findToolbarButtons = () => {
      const eraser =
        root.querySelector<HTMLElement>('button[data-testid*="eraser" i]') ||
        root.querySelector<HTMLElement>('button[aria-label*="Eraser" i]') ||
        root.querySelector<HTMLElement>('button[title*="Eraser" i]')

      const draw =
        root.querySelector<HTMLElement>('button[data-testid*="freedraw" i]') ||
        root.querySelector<HTMLElement>('button[aria-label*="draw" i]') ||
        root.querySelector<HTMLElement>('button[title*="draw" i]')

      if (eraser && !mountAfterEraser) {
        const mount = ensureMount("after-eraser")
        eraser.insertAdjacentElement("afterend", mount)
        setMountAfterEraser(mount)
      }

      if (draw && !mountBeforeDraw) {
        const mount = ensureMount("before-draw")
        draw.insertAdjacentElement("beforebegin", mount)
        setMountBeforeDraw(mount)
      }
    }

    const obs = new MutationObserver(() => findToolbarButtons())
    obs.observe(root, { subtree: true, childList: true })
    findToolbarButtons()

    return () => {
      obs.disconnect()
      setMountAfterEraser(null)
      setMountBeforeDraw(null)
    }
    // Intentionally only re-run when board changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId])

  const toolBtnStyle: React.CSSProperties = {
    height: 32,
    minWidth: 32,
    padding: "0 10px",
    borderRadius: 10,
    border: "1px solid rgba(255, 255, 255, 0.14)",
    background: "rgba(255, 255, 255, 0.06)",
    color: "inherit",
    cursor: "pointer",
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  }

  const sendUndo = () => {
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "z",
        ...(isMac ? { metaKey: true } : { ctrlKey: true }),
      })
    )
  }

  const sendRedo = () => {
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
    // Prefer Cmd/Ctrl+Shift+Z
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "z",
        shiftKey: true,
        ...(isMac ? { metaKey: true } : { ctrlKey: true }),
      })
    )
    // Also support Ctrl+Y on non-mac
    if (!isMac) {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "y", ctrlKey: true }))
    }
  }

  return (
    <div ref={containerRef} style={{ position: "absolute", inset: 0 }}>
      <Excalidraw
        excalidrawAPI={(api) => {
          apiRef.current = api
        }}
        // Cast because we intentionally sanitize persisted data and keep a minimal appState subset.
        initialData={initialDataForExcalidraw as any}
        gridModeEnabled={gridModeEnabled}
        onChange={(elements, appState, files) => {
          // Save locally so refresh preserves the board
          persist({
            elements,
            appState: toSerializableAppState(appState),
            files,
          })
        }}
        renderTopRightUI={() => (
          <button
            type="button"
            onClick={() => {
              setGridModeEnabled((prev) => {
                const next = !prev
                const snap = latestRef.current
                persist({
                  ...snap,
                  appState: { ...(snap?.appState || {}), gridModeEnabled: next },
                })
                return next
              })
            }}
            style={toolBtnStyle}
            aria-pressed={gridModeEnabled}
            title="Toggle light grid"
          >
            Grid: {gridModeEnabled ? "On" : "Off"}
          </button>
        )}
        UIOptions={{
          welcomeScreen: false,
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            clearCanvas: true,
            changeViewBackgroundColor: true,
            toggleTheme: true,
          },
        }}
      />

      {mountAfterEraser &&
        createPortal(
          <>
            <button type="button" style={toolBtnStyle} onClick={sendUndo} title="Undo (Ctrl/Cmd+Z)">
              ↶
            </button>
            <button type="button" style={toolBtnStyle} onClick={sendRedo} title="Redo (Ctrl/Cmd+Shift+Z)">
              ↷
            </button>
          </>,
          mountAfterEraser
        )}

      {mountBeforeDraw &&
        createPortal(
          <button
            type="button"
            style={toolBtnStyle}
            onClick={() => apiRef.current?.setActiveTool?.({ type: "text" })}
            title="Text tool"
          >
            T
          </button>,
          mountBeforeDraw
        )}
    </div>
  )
}

