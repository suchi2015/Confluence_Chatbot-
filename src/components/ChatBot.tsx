// ChatBot.tsx — Floating AI assistant with 2-tab answers
// Tab 1: From Knowledge Base (matched confluence pages)
// Tab 2: Web Search (AI generated from web)

import { useState, useRef } from 'react'
import {
  Sparkles, X, Send, Loader2, FileText,
  BookOpen, Globe, ChevronRight, AlertCircle, RotateCcw
} from 'lucide-react'
import { searchFast, generateAnswer } from '../api'
import type { MatchedDoc } from '../api'
import { CATEGORIES } from '../data/mockData'

type Tab = 'kb' | 'web'

interface KBResult {
  docs:   MatchedDoc[]
  answer: string
}

interface WebResult {
  answer: string
}

// ── Web search via a free public API (DuckDuckGo instant answer) ──────────────
async function fetchWebAnswer(query: string): Promise<string> {
  try {
    // Use DuckDuckGo Instant Answer API (no key needed, CORS-friendly via proxy)
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`
    )
    const data = await res.json()

    const parts: string[] = []

    if (data.AbstractText) parts.push(data.AbstractText)
    if (data.Answer)       parts.push(data.Answer)

    // Related topics
    if (data.RelatedTopics?.length > 0) {
      const topics = data.RelatedTopics
        .filter((t: { Text?: string }) => t.Text)
        .slice(0, 4)
        .map((t: { Text: string }, i: number) => `${i + 1}. ${t.Text}`)
      if (topics.length > 0) {
        parts.push('\nRelated information:\n' + topics.join('\n'))
      }
    }

    if (parts.length === 0) {
      return `Here's what I found for "${query}":\n\nNo specific instant answer was available from the web. Please check:\n• Google: https://www.google.com/search?q=${encodeURIComponent(query)}\n• Stack Overflow or official documentation for technical issues.`
    }

    return parts.join('\n\n')
  } catch {
    return `Web search encountered an issue. For "${query}", please try:\n• Searching on Google\n• Checking official documentation\n• Visiting support forums`
  }
}

// ── Score color ───────────────────────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 70) return 'bg-green-100 text-green-700'
  if (score >= 50) return 'bg-yellow-100 text-yellow-700'
  return 'bg-orange-100 text-orange-700'
}

// ── Guess category from filename ──────────────────────────────────────────────
function guessCategory(filename: string) {
  const lower = filename.toLowerCase()
  return CATEGORIES.find(c =>
    lower.includes(c.id) ||
    c.name.toLowerCase().split(' ').some(w => w.length > 3 && lower.includes(w))
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ChatBot() {
  const [open,       setOpen]       = useState(false)
  const [query,      setQuery]      = useState('')
  const [tab,        setTab]        = useState<Tab>('kb')
  const [loadingKB,  setLoadingKB]  = useState(false)
  const [loadingWeb, setLoadingWeb] = useState(false)
  const [kbResult,   setKbResult]   = useState<KBResult | null>(null)
  const [webResult,  setWebResult]  = useState<WebResult | null>(null)
  const [error,      setError]      = useState<string | null>(null)
  const [searched,   setSearched]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setQuery(''); setKbResult(null); setWebResult(null)
    setError(null); setSearched(false); setTab('kb')
  }

  async function handleSearch() {
    const q = query.trim()
    if (!q) return

    setSearched(true)
    setError(null)
    setKbResult(null)
    setWebResult(null)

    // Run both searches in parallel
    setLoadingKB(true)
    setLoadingWeb(true)

    // KB search
    searchFast(q)
      .then(async data => {
        const docs = data.matched_docs
        let answer = ''
        if (docs.length > 0) {
          try {
            answer = await generateAnswer(q, docs.map(d => d.content))
          } catch {
            answer = 'Could not generate AI answer — backend may be offline.'
          }
        }
        setKbResult({ docs, answer })
      })
      .catch(() => {
        setKbResult({ docs: [], answer: '' })
        setError('Knowledge base search failed — backend may be offline.')
      })
      .finally(() => setLoadingKB(false))

    // Web search
    fetchWebAnswer(q)
      .then(answer => setWebResult({ answer }))
      .finally(() => setLoadingWeb(false))
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

  const hasKB  = kbResult && kbResult.docs.length > 0
  const kbDone = !loadingKB && kbResult !== null
  const webDone= !loadingWeb && webResult !== null

  return (
    <>
      {/* ── Floating Button ── */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 100) }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-violet-600 to-blue-600
                     hover:from-violet-700 hover:to-blue-700 text-white rounded-full shadow-xl
                     flex items-center justify-center transition-all z-50 group"
          aria-label="Open AI Assistant"
        >
          <Sparkles size={22} className="group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* ── Chat Panel ── */}
      {open && (
        <div
          className="fixed bottom-6 right-6 w-[420px] bg-white rounded-2xl shadow-2xl border border-gray-200
                     flex flex-col z-50 overflow-hidden"
          style={{ maxHeight: '85vh' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">AI Assistant</p>
                <p className="text-[0.65rem] text-violet-200">Explain your problem — I'll suggest a solution</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {searched && (
                <button onClick={reset} title="New search"
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                  <RotateCcw size={13} />
                </button>
              )}
              <button onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0 bg-gray-50">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Explain your problem, I'll suggest a solution..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white
                           focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent
                           placeholder-gray-400 text-gray-700"
              />
              <button
                onClick={handleSearch}
                disabled={!query.trim() || (loadingKB && loadingWeb)}
                className="w-10 h-10 flex items-center justify-center bg-violet-600 hover:bg-violet-700
                           disabled:bg-gray-300 text-white rounded-xl transition-colors flex-shrink-0"
              >
                {(loadingKB || loadingWeb)
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Send size={15} />
                }
              </button>
            </div>
          </div>

          {/* Tabs + Results */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">

            {/* Idle state */}
            {!searched && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-blue-100 rounded-2xl
                                flex items-center justify-center">
                  <Sparkles size={24} className="text-violet-500" />
                </div>
                <p className="text-sm font-semibold text-gray-700">How can I help you?</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Type any telecom support issue above.<br />
                  I'll search the knowledge base and the web for solutions.
                </p>
                <div className="flex gap-2 mt-1 flex-wrap justify-center">
                  {['Payment not credited', 'VPN not working', 'SIM no service', 'Slow internet'].map(ex => (
                    <button key={ex} onClick={() => { setQuery(ex) }}
                      className="text-xs bg-violet-50 text-violet-600 border border-violet-200 rounded-full px-3 py-1 hover:bg-violet-100 transition-colors">
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* After search */}
            {searched && (
              <>
                {/* Tab bar */}
                <div className="flex border-b border-gray-100 flex-shrink-0 bg-white">
                  <button
                    onClick={() => setTab('kb')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-colors
                      ${tab === 'kb'
                        ? 'border-violet-600 text-violet-600'
                        : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    <BookOpen size={13} />
                    From Knowledge Base
                    {kbDone && (
                      <span className={`text-[0.6rem] font-bold rounded-full px-1.5 py-0.5 ml-0.5
                        ${hasKB ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {kbResult?.docs.length ?? 0}
                      </span>
                    )}
                    {loadingKB && <Loader2 size={11} className="animate-spin text-violet-400" />}
                  </button>
                  <button
                    onClick={() => setTab('web')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-colors
                      ${tab === 'web'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    <Globe size={13} />
                    Web Search
                    {loadingWeb && <Loader2 size={11} className="animate-spin text-blue-400" />}
                    {webDone && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 ml-0.5" />}
                  </button>
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto">

                  {/* ── KB Tab ── */}
                  {tab === 'kb' && (
                    <div className="p-4 space-y-4">
                      {/* Loading */}
                      {loadingKB && (
                        <div className="flex flex-col items-center py-8 gap-2 text-gray-400">
                          <Loader2 size={22} className="animate-spin text-violet-500" />
                          <p className="text-xs">Searching knowledge base...</p>
                        </div>
                      )}

                      {/* Error */}
                      {error && !loadingKB && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                          <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-red-700">{error}</p>
                        </div>
                      )}

                      {/* No results */}
                      {kbDone && !loadingKB && kbResult.docs.length === 0 && !error && (
                        <div className="flex flex-col items-center py-8 gap-2 text-gray-400">
                          <FileText size={28} />
                          <p className="text-xs text-center">No matching pages found in the knowledge base.<br/>Try the Web Search tab.</p>
                        </div>
                      )}

                      {/* Matched docs */}
                      {kbDone && hasKB && (
                        <>
                          <div>
                            <p className="text-[0.65rem] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                              Matched Confluence Pages
                            </p>
                            <div className="space-y-2">
                              {kbResult!.docs.map((doc, i) => {
                                const cat = guessCategory(doc.filename)
                                return (
                                  <div key={i}
                                    className="flex items-start gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                                    <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <FileText size={13} className="text-violet-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-gray-800 leading-snug">
                                        {doc.filename.replace('.txt','').replace(/_/g,' ')}
                                      </p>
                                      {cat && (
                                        <p className="text-[0.63rem] text-gray-400 mt-0.5">{cat.icon} {cat.name}</p>
                                      )}
                                      <p className="text-[0.65rem] text-gray-500 mt-1 line-clamp-2">
                                        {doc.content.replace(/<[^>]+>/g,'').slice(0,90)}...
                                      </p>
                                    </div>
                                    <span className={`text-[0.62rem] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${scoreColor(doc.score)}`}>
                                      {doc.score}%
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* AI Answer from KB */}
                          {kbResult!.answer && (
                            <div>
                              <p className="text-[0.65rem] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                AI Solution (from knowledge base)
                              </p>
                              <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 space-y-1.5">
                                {kbResult!.answer.split('\n').filter(Boolean).map((line, i) => {
                                  const isStep = /^\d+\./.test(line.trim()) || line.trim().startsWith('-') || line.trim().startsWith('*')
                                  return isStep ? (
                                    <div key={i} className="flex items-start gap-2">
                                      <ChevronRight size={11} className="text-violet-400 flex-shrink-0 mt-0.5" />
                                      <p className="text-xs text-gray-700 leading-relaxed">
                                        {line.replace(/^[\d.\-*]+\s*/, '').replace(/\*\*(.+?)\*\*/g, '$1')}
                                      </p>
                                    </div>
                                  ) : (
                                    <p key={i} className="text-xs text-gray-700 leading-relaxed">
                                      {line.replace(/\*\*(.+?)\*\*/g, '$1')}
                                    </p>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* ── Web Tab ── */}
                  {tab === 'web' && (
                    <div className="p-4 space-y-3">
                      {/* Loading */}
                      {loadingWeb && (
                        <div className="flex flex-col items-center py-8 gap-2 text-gray-400">
                          <Loader2 size={22} className="animate-spin text-blue-500" />
                          <p className="text-xs">Searching the web...</p>
                        </div>
                      )}

                      {/* Web result */}
                      {webDone && !loadingWeb && (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Globe size={12} className="text-blue-600" />
                            </div>
                            <p className="text-xs font-semibold text-gray-600">Web Search Result</p>
                          </div>
                          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-1.5">
                            {webResult!.answer.split('\n').filter(Boolean).map((line, i) => {
                              const isStep = /^\d+\./.test(line.trim()) || line.trim().startsWith('-')
                              return isStep ? (
                                <div key={i} className="flex items-start gap-2">
                                  <ChevronRight size={11} className="text-blue-400 flex-shrink-0 mt-0.5" />
                                  <p className="text-xs text-gray-700 leading-relaxed">
                                    {line.replace(/^[\d.\-*]+\s*/, '')}
                                  </p>
                                </div>
                              ) : (
                                <p key={i} className="text-xs text-gray-700 leading-relaxed">{line}</p>
                              )
                            })}
                          </div>
                          <p className="text-[0.62rem] text-gray-400 text-center mt-2">
                            Source: DuckDuckGo Instant Answer API
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
