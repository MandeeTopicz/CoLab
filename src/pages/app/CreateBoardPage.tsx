import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useApi } from "../../lib/api"
import { TileSection } from "../../components/createBoard/TileSection"
import { TemplateCard } from "../../components/createBoard/TemplateCard"
import { TemplateSelectionModal } from "../../components/createBoard/TemplateSelectionModal"
import { BoardNamePromptModal } from "../../components/createBoard/BoardNamePromptModal"
import { QuickViewModal } from "../../components/createBoard/QuickViewModal"

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  )
}

const RECENTLY_VIEWED_KEY = "createBoard:recentlyViewed"
const RECENTLY_VIEWED_MAX = 20

function getRecentlyViewed(): string[] {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.slice(0, RECENTLY_VIEWED_MAX) : []
  } catch {
    return []
  }
}

function addRecentlyViewed(templateId: string) {
  const list = getRecentlyViewed().filter((id) => id !== templateId)
  list.unshift(templateId)
  localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(list.slice(0, RECENTLY_VIEWED_MAX)))
}

export function CreateBoardPage() {
  const api = useApi()
  const navigate = useNavigate()

  const [workspaces, setWorkspaces] = useState<Array<{ workspaceId: string; name: string }>>([])
  const [communityTemplates, setCommunityTemplates] = useState<any[]>([])
  const [communitySearch, setCommunitySearch] = useState("")
  const [favorites, setFavorites] = useState<any[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [recentTemplates, setRecentTemplates] = useState<any[]>([])

  const [aiPrompt, setAiPrompt] = useState("")
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiResults, setAiResults] = useState<Array<{ spec: any; name: string }>>([])
  const [aiError, setAiError] = useState<string | null>(null)

  const [selectionModal, setSelectionModal] = useState<{ name: string; templateId?: string; spec?: any; isAi: boolean } | null>(null)
  const [boardNameModal, setBoardNameModal] = useState<{ open: boolean; forTemplateId?: string; forSpec?: any; forBlank?: boolean }>({ open: false })
  const [quickView, setQuickView] = useState<{ open: boolean; name: string; templateId?: string; scene?: any }>({ open: false })

  const defaultWorkspaceId = workspaces[0]?.workspaceId ?? ""

  const loadWorkspaces = useCallback(async () => {
    try {
      const res = await api.listWorkspaces()
      setWorkspaces(res.workspaces || [])
    } catch {
      setWorkspaces([])
    }
  }, [api])

  const loadCommunity = useCallback(async () => {
    try {
      const res = await api.listTemplates({ q: communitySearch.trim() || undefined })
      setCommunityTemplates(res.templates || [])
    } catch {
      setCommunityTemplates([])
    }
  }, [api, communitySearch])

  const loadFavorites = useCallback(async () => {
    try {
      const res = await api.listFavoriteTemplates()
      const list = res.templates || []
      setFavorites(list)
      setFavoriteIds(new Set(list.map((t: any) => t.templateId)))
    } catch {
      setFavorites([])
      setFavoriteIds(new Set())
    }
  }, [api])

  const loadRecent = useCallback(async () => {
    const ids = getRecentlyViewed()
    if (ids.length === 0) {
      setRecentTemplates([])
      return
    }
    const list: any[] = []
    for (const id of ids) {
      try {
        const res = await api.getTemplate(id)
        if (res.template) list.push({ ...res.template, templateId: id })
      } catch {
        // skip missing
      }
    }
    setRecentTemplates(list)
  }, [api])

  useEffect(() => {
    loadWorkspaces()
  }, [loadWorkspaces])
  useEffect(() => {
    loadCommunity()
  }, [loadCommunity])
  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])
  useEffect(() => {
    loadRecent()
  }, [loadRecent])

  const handleGenerateAi = async () => {
    const prompt = aiPrompt.trim()
    if (!prompt) return
    setAiGenerating(true)
    setAiError(null)
    try {
      const res = await api.generateTemplate({ prompt })
      if (res?.error === "llm_not_configured") {
        setAiError("AI is not configured.")
        return
      }
      const spec = res?.spec
      if (spec && typeof spec.title === "string") {
        setAiResults((prev) => [{ spec, name: spec.title }, ...prev].slice(0, 10))
      } else {
        setAiError("Could not generate a template.")
      }
    } catch (e: any) {
      setAiError(e?.message || "Generation failed")
    } finally {
      setAiGenerating(false)
    }
  }

  const openSelection = (name: string, opts: { templateId?: string; spec?: any; isAi: boolean }) => {
    setSelectionModal({ name, ...opts })
  }

  const handleCreateFromSelection = () => {
    if (!selectionModal) return
    if (selectionModal.isAi && selectionModal.spec) {
      setBoardNameModal({ open: true, forSpec: selectionModal.spec, forBlank: false })
    } else if (selectionModal.templateId) {
      setBoardNameModal({ open: true, forTemplateId: selectionModal.templateId, forBlank: false })
    }
    setSelectionModal(null)
  }

  const handleQuickViewFromSelection = async () => {
    if (!selectionModal) return
    if (selectionModal.templateId) {
      try {
        const res = await api.getTemplate(selectionModal.templateId)
        addRecentlyViewed(selectionModal.templateId)
        loadRecent()
        setQuickView({
          open: true,
          name: selectionModal.name,
          templateId: selectionModal.templateId,
          scene: res.template?.scene,
        })
      } catch {
        setQuickView({ open: true, name: selectionModal.name })
      }
    } else {
      setQuickView({ open: true, name: selectionModal.name })
    }
    setSelectionModal(null)
  }

  const handleBoardNameConfirm = async (boardName: string) => {
    if (!defaultWorkspaceId) return
    try {
      if (boardNameModal.forBlank) {
        const res = await api.createBoard({ workspaceId: defaultWorkspaceId, name: boardName })
        navigate(`/app/boards/${res.boardId}`)
      } else if (boardNameModal.forTemplateId) {
        const res = await api.createBoardFromTemplate({
          templateId: boardNameModal.forTemplateId,
          name: boardName,
          workspaceId: defaultWorkspaceId,
        })
        navigate(`/app/boards/${res.boardId}`)
      } else if (boardNameModal.forSpec) {
        const res = await api.createBoard({ workspaceId: defaultWorkspaceId, name: boardName })
        navigate(`/app/boards/${res.boardId}`, { state: { applyAiSpec: boardNameModal.forSpec, applyAiPrompt: aiPrompt } })
      }
    } catch (e: any) {
      console.error(e)
    }
    setBoardNameModal({ open: false })
  }

  const toggleFavorite = async (e: React.MouseEvent, templateId: string) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      if (favoriteIds.has(templateId)) {
        await api.removeTemplateFavorite(templateId)
      } else {
        await api.addTemplateFavorite(templateId)
      }
      loadFavorites()
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-text-primary">Create board</h1>

      {/* AI Template Generator tile */}
      <TileSection title="Need help drafting a template?" centerTitle sectionClassName="p-6">
        <div className="relative flex min-h-[180px] min-w-[min(100%,400px)] flex-1 flex-col rounded-xl border border-border bg-surface">
          <textarea
            value={aiPrompt}
            onChange={(e) => { setAiPrompt(e.target.value); setAiError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerateAi(); } }}
            placeholder="e.g. Sprint retrospective for a design team"
            className="min-h-[180px] w-full flex-1 resize-none rounded-xl border-0 bg-transparent p-4 pr-44 pb-16 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-0"
            rows={5}
          />
          {aiError && <p className="absolute bottom-14 left-4 right-44 text-sm text-danger">{aiError}</p>}
          <button
            type="button"
            onClick={handleGenerateAi}
            disabled={aiGenerating || !aiPrompt.trim()}
            className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
            aria-label="Generate with AI"
          >
            <span>Generate with AI</span>
            <SendIcon />
          </button>
        </div>
        {aiResults.map((r, i) => (
          <TemplateCard
            key={`ai-${i}`}
            templateId=""
            name={r.name}
            onSelect={() => openSelection(r.name, { spec: r.spec, isAi: true })}
            preview="default"
          />
        ))}
      </TileSection>

      {/* Favorites */}
      <TileSection title="Favorites">
        {favorites.length === 0 ? (
          <p className="py-4 text-sm text-text-muted">Star templates to see them here.</p>
        ) : (
          favorites.map((t) => (
            <TemplateCard
              key={t.templateId}
              templateId={t.templateId}
              name={t.name}
              ownerName={t.ownerName}
              aiAssisted={t.aiAssisted}
              isFavorite={true}
              onSelect={() => openSelection(t.name, { templateId: t.templateId, isAi: false })}
              onToggleFavorite={(e) => toggleFavorite(e, t.templateId)}
            />
          ))
        )}
      </TileSection>

      {/* Blank Whiteboard */}
      <TileSection title="Start from scratch">
        <TemplateCard
          templateId=""
          name="Blank Whiteboard"
          preview="blank"
          onSelect={() => {
            setBoardNameModal({ open: true, forBlank: true })
          }}
        />
      </TileSection>

      {/* Community templates */}
      <TileSection
        title="Templates created by other users"
        action={
          <input
            type="search"
            value={communitySearch}
            onChange={(e) => setCommunitySearch(e.target.value)}
            placeholder="Search templates"
            className="w-40 rounded-lg border border-border px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="Search community templates"
          />
        }
      >
        {communityTemplates.length === 0 ? (
          <p className="py-4 text-sm text-text-muted">No community templates yet. Publish one from the whiteboard editor.</p>
        ) : (
          communityTemplates.map((t) => (
            <TemplateCard
              key={t.templateId}
              templateId={t.templateId}
              name={t.name}
              ownerName={t.ownerName}
              aiAssisted={t.aiAssisted}
              isFavorite={favoriteIds.has(t.templateId)}
              onSelect={() => openSelection(t.name, { templateId: t.templateId, isAi: false })}
              onToggleFavorite={(e) => toggleFavorite(e, t.templateId)}
            />
          ))
        )}
      </TileSection>

      {/* Recently viewed */}
      <TileSection title="Recently viewed">
        {recentTemplates.length === 0 ? (
          <p className="py-4 text-sm text-text-muted">Templates you quick-view will appear here.</p>
        ) : (
          recentTemplates.map((t) => (
            <TemplateCard
              key={t.templateId}
              templateId={t.templateId}
              name={t.name}
              ownerName={t.ownerName}
              aiAssisted={t.aiAssisted}
              isFavorite={favoriteIds.has(t.templateId)}
              onSelect={() => openSelection(t.name, { templateId: t.templateId, isAi: false })}
              onToggleFavorite={(e) => toggleFavorite(e, t.templateId)}
            />
          ))
        )}
      </TileSection>

      <TemplateSelectionModal
        open={!!selectionModal}
        templateName={selectionModal?.name ?? ""}
        onClose={() => setSelectionModal(null)}
        onCreateNewBoard={handleCreateFromSelection}
        onQuickView={handleQuickViewFromSelection}
      />

      <BoardNamePromptModal
        title="Name your board"
        open={boardNameModal.open}
        onClose={() => setBoardNameModal({ open: false })}
        onConfirm={handleBoardNameConfirm}
        confirmLabel="Create"
      />

      <QuickViewModal
        open={quickView.open}
        templateName={quickView.name}
        onClose={() => setQuickView((q) => ({ ...q, open: false }))}
        scene={quickView.scene}
      />
    </div>
  )
}
