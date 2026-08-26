// Navbar.tsx — with AI-powered search that filters the dashboard
import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, Loader2, FileText, X } from 'lucide-react'
import { searchFast } from '../api'
import type { MatchedDoc } from '../api'
import { CATEGORIES } from '../data/mockData'

interface Props {
  onSearchResults: (docs: MatchedDoc[], query: string) => void
  onClearSearch:   () => void
  isSearchActive:  boolean
}

export default function Navbar({ onSearchResults, onClearSearch, isSearchActive }: Props) {
  const [query,    setQuery]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [preview,  setPreview]  = useState<MatchedDoc[]>([])
  const [showDrop, setShowDrop] = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const wrapRef   = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowDrop(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ⌘K / Ctrl+K opens search
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setShowDrop(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  async function handleSearch(q: string) {
    if (!q.trim()) { handleClear(); return }
    setLoading(true)
    try {
      const data = await searchFast(q.trim())
      setPreview(data.matched_docs.slice(0, 5))
      setShowDrop(true)
    } catch {
      setPreview([])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && query.trim()) {
      setShowDrop(false)
      onSearchResults(preview, query.trim())
    }
    if (e.key === 'Escape') { setShowDrop(false); handleClear() }
  }

  function handleClear() {
    setQuery('')
    setPreview([])
    setShowDrop(false)
    onClearSearch()
  }

  function applyResult(doc: MatchedDoc) {
    setShowDrop(false)
    onSearchResults([doc], query)
  }

  function applyAll() {
    setShowDrop(false)
    onSearchResults(preview, query.trim())
  }

  // map filename to category
  function guessCategory(filename: string) {
    const lower = filename.toLowerCase()
    return CATEGORIES.find(c =>
      lower.includes(c.id) ||
      c.name.toLowerCase().split(' ').some(w => w.length > 3 && lower.includes(w.toLowerCase()))
    )
  }

  return (
    <header className="bg-white border-b border-gray-200 h-12 flex items-center px-4 gap-4 flex-shrink-0 relative z-30">

      {/* Logo + Brand */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="bg-blue-600 rounded w-7 h-7 flex items-center justify-center text-white font-bold text-sm select-none">
          K
        </div>
        <span className="font-bold text-gray-900 text-sm">KnowledgeBase</span>
        <span className="text-gray-300 text-sm">/</span>
        <span className="text-gray-500 text-sm">Telecom Support</span>
      </div>

      {/* AI Search */}
      <div className="flex-1 flex justify-center" ref={wrapRef}>
        <div className="relative w-full max-w-md">
          {/* Input */}
          <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm border transition-all
            ${showDrop || query ? 'bg-white border-blue-400 shadow-sm' : 'bg-gray-100 border-transparent'}`}>
            {loading
              ? <Loader2 size={14} className="text-blue-500 animate-spin flex-shrink-0" />
              : <Search size={14} className="text-gray-400 flex-shrink-0" />
            }
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); handleSearch(e.target.value) }}
              onKeyDown={handleKeyDown}
              onFocus={() => { if (query) setShowDrop(true) }}
              placeholder="Search pages or ask a question..."
              className="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-400 text-sm"
            />
            {query
              ? <button onClick={handleClear} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
              : <span className="text-xs bg-gray-200 rounded px-1 py-0.5 font-mono leading-none text-gray-400">⌘K</span>
            }
          </div>

          {/* Search Active Badge */}
          {isSearchActive && !showDrop && (
            <div className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
          )}

          {/* Dropdown Results */}
          {showDrop && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
              {loading && (
                <div className="px-4 py-3 text-xs text-gray-400 flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" /> Searching...
                </div>
              )}

              {!loading && preview.length === 0 && query && (
                <div className="px-4 py-3 text-xs text-gray-400">No results found</div>
              )}

              {!loading && preview.length > 0 && (
                <>
                  <div className="px-3 pt-2.5 pb-1 text-[0.65rem] font-semibold text-gray-400 uppercase tracking-wider">
                    Matched Documents
                  </div>
                  {preview.map((doc, i) => {
                    const cat = guessCategory(doc.filename)
                    return (
                      <button
                        key={i}
                        onClick={() => applyResult(doc)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <FileText size={13} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">
                            {doc.filename.replace('.txt','').replace(/_/g,' ')}
                          </p>
                          {cat && (
                            <p className="text-[0.65rem] text-gray-400 mt-0.5">{cat.icon} {cat.name}</p>
                          )}
                        </div>
                        <span className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded flex-shrink-0
                          ${doc.score >= 70 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {doc.score}%
                        </span>
                      </button>
                    )
                  })}
                  <div className="border-t border-gray-100 px-3 py-2">
                    <button
                      onClick={applyAll}
                      className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium text-left flex items-center gap-1.5"
                    >
                      <Search size={11} />
                      Show all {preview.length} results in dashboard
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link
          to="/create"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-1.5 text-sm font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Plus size={14} />
          Create New
        </Link>
        <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold select-none flex-shrink-0">
          RK
        </div>
      </div>
    </header>
  )
}
