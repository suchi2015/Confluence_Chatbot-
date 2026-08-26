// ChatBot.tsx — Floating AI assistant
// Tab 1: Knowledge Base (matched confluence pages + AI answer)
// Tab 2: Web Search (DuckDuckGo instant answer)
// General conversation: Ollama LLM responds to anything

import { useState, useRef } from 'react'
import {
  Sparkles, X, Send, Loader2, FileText,
  BookOpen, Globe, ChevronRight, RotateCcw, MessageCircle
} from 'lucide-react'
import axios from 'axios'
import { CATEGORIES } from '../data/mockData'
import type { MatchedDoc } from '../api'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

type Tab = 'kb' | 'web'

interface KBResult {
  docs:       MatchedDoc[]
  kbAnswer:   string
  aiAnswer:   string
  kbError:    string
}

interface WebResult {
  answer: string
}

// ── General AI answer via Ollama (through backend) ───────────────────────────
async function fetchGeneralAnswer(query: string): Promise<string> {
  try {
    const res = await axios.post<{ answer: string }>(`${BASE}/general-answer`, { query })
    return res.data.answer
  } catch {
    // Fallback: simple rule-based responses for common queries
    const q = query.toLowerCase()
    if (q.includes('hello') || q.includes('hi') || q.includes('hey'))
      return "Hello! I'm your AI assistant for telecom support. How can I help you today?"
    if (q.includes('how are you') || q.includes('how r u'))
      return "I'm doing great, thanks for asking! I'm here to help you with any telecom support issues. What's your question?"
    if (q.includes('thank') || q.includes('thanks'))
      return "You're welcome! Feel free to ask if you have any other questions."
    if (q.includes('what can you do') || q.includes('help'))
      return "I can help you with:\n• Finding solutions in our knowledge base\n• Answering telecom support questions\n• Helping with billing, network, recharge, and device issues\n• Creating and updating confluence pages\n\nJust type your problem!"
    return `I understand you're asking about "${query}". While I couldn't find a specific answer, I recommend checking the Knowledge Base tab or using Web Search for more information. You can also try rephrasing your question.`
  }
}

// ── KB search + AI answer ─────────────────────────────────────────────────────
async function fetchKBResults(query: string): Promise<KBResult> {
  let docs: MatchedDoc[] = []
  let kbAnswer = ''
  let aiAnswer = ''
  let kbError  = ''

  try {
    // Search KB — direct call with full error visibility
    const searchRes = await axios.post(
      `${BASE}/search-fast`,
      { query },
      { timeout: 10000 }
    )
    docs = searchRes.data?.matched_docs ?? []

    // Generate KB-context answer if docs found
    if (docs.length > 0) {
      try {
        const ansRes = await axios.post(
          `${BASE}/generate-answer`,
          { query, context_docs: docs.map((d: MatchedDoc) => d.content) },
          { timeout: 60000 }
        )
        kbAnswer = ansRes.data?.answer ?? ''
      } catch {
        kbAnswer = ''
      }
    }
  } catch (e: unknown) {
    if (axios.isAxiosError(e)) {
      kbError = e.code === 'ECONNREFUSED' || e.code === 'ERR_NETWORK'
        ? 'backend-offline'
        : `API error: ${e.response?.status ?? e.message}`
    } else {
      kbError = 'Search failed'
    }
  }

  // Always get general AI answer regardless of KB result
  aiAnswer = await fetchGeneralAnswer(query)

  return { docs, kbAnswer, aiAnswer, kbError }
}

// ── Web search via DuckDuckGo ─────────────────────────────────────────────────
async function fetchWebAnswer(query: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`
    )
    const data = await res.json()
    const parts: string[] = []
    if (data.AbstractText) parts.push(data.AbstractText)
    if (data.Answer)       parts.push(data.Answer)
    if (data.RelatedTopics?.length > 0) {
      const topics = (data.RelatedTopics as { Text?: string }[])
        .filter(t => t.Text).slice(0, 4)
        .map((t, i) => `${i + 1}. ${t.Text}`)
      if (topics.length) parts.push('\nRelated:\n' + topics.join('\n'))
    }
    if (parts.length === 0)
      return `No instant answer found for "${query}". Try searching on Google or checking official documentation.`
    return parts.join('\n\n')
  } catch {
    return `Web search is unavailable right now. Please try Google for "${query}".`
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 70) return 'bg-green-100 text-green-700'
  if (score >= 50) return 'bg-yellow-100 text-yellow-700'
  return 'bg-orange-100 text-orange-700'
}

function guessCategory(filename: string) {
  const lower = filename.toLowerCase()
  return CATEGORIES.find(c =>
    lower.includes(c.id) ||
    c.name.toLowerCase().split(' ').some(w => w.length > 3 && lower.includes(w))
  )
}

function renderLines(text: string, accentColor = 'violet') {
  return text.split('\n').filter(Boolean).map((line, i) => {
    const isStep = /^\d+\./.test(line.trim()) || line.trim().startsWith('-') || line.trim().startsWith('*')
    const clean  = line.replace(/^[\d.\-*]+\s*/, '').replace(/\*\*(.+?)\*\*/g, '$1')
    return isStep ? (
      <div key={i} className="flex items-start gap-2">
        <ChevronRight size={11} className={`text-${accentColor}-400 flex-shrink-0 mt-0.5`} />
        <p className="text-xs text-gray-700 leading-relaxed">{clean}</p>
      </div>
    ) : (
      <p key={i} className="text-xs text-gray-700 leading-relaxed">{line.replace(/\*\*(.+?)\*\*/g,'$1')}</p>
    )
  })
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ChatBot() {
  const [open,       setOpen]       = useState(false)
  const [query,      setQuery]      = useState('')
  const [tab,        setTab]        = useState<Tab>('kb')
  const [loadingKB,  setLoadingKB]  = useState(false)
  const [loadingWeb, setLoadingWeb] = useState(false)
  const [kbResult,   setKbResult]   = useState<KBResult | null>(null)
  const [webResult,  setWebResult]  = useState<WebResult | null>(null)
  const [searched,   setSearched]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setQuery(''); setKbResult(null); setWebResult(null)
    setSearched(false); setTab('kb')
  }

  async function handleSearch() {
    const q = query.trim()
    if (!q) return
    setSearched(true)
    setKbResult(null)
    setWebResult(null)
    setLoadingKB(true)
    setLoadingWeb(true)

    // Both run in parallel
    fetchKBResults(q)
      .then(r  => setKbResult(r))
      .finally(() => setLoadingKB(false))

    fetchWebAnswer(q)
      .then(ans => setWebResult({ answer: ans }))
      .finally(() => setLoadingWeb(false))
  }

  const kbDone  = !loadingKB  && kbResult  !== null
  const webDone = !loadingWeb && webResult !== null
  const hasKBDocs = kbResult && kbResult.docs.length > 0

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 100) }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-violet-600 to-blue-600
                     hover:from-violet-700 hover:to-blue-700 text-white rounded-full shadow-xl
                     flex items-center justify-center z-50 group transition-all"
        >
          <Sparkles size={22} className="group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 w-[420px] bg-white rounded-2xl shadow-2xl border border-gray-200
                        flex flex-col z-50 overflow-hidden"
             style={{ maxHeight: '85vh' }}>

          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">AI Assistant</p>
                <p className="text-[0.65rem] text-violet-200">Ask anything — I'll help you</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {searched && (
                <button onClick={reset} title="New chat"
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white">
                  <RotateCcw size={13} />
                </button>
              )}
              <button onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Ask me anything or describe your issue..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white
                           focus:outline-none focus:ring-2 focus:ring-violet-400 placeholder-gray-400 text-gray-700"
              />
              <button onClick={handleSearch} disabled={!query.trim()}
                className="w-10 h-10 flex items-center justify-center bg-violet-600 hover:bg-violet-700
                           disabled:bg-gray-300 text-white rounded-xl transition-colors flex-shrink-0">
                {(loadingKB || loadingWeb) ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">

            {/* Idle */}
            {!searched && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-8 text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-blue-100 rounded-2xl flex items-center justify-center">
                  <Sparkles size={24} className="text-violet-500" />
                </div>
                <p className="text-sm font-semibold text-gray-700">How can I help you?</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Ask anything — from telecom issues to general questions.<br/>
                  I'll search the knowledge base and the web.
                </p>
                <div className="flex flex-wrap gap-2 mt-1 justify-center">
                  {['Payment not credited', 'VPN not working', 'Hello!', 'Slow internet 4G'].map(ex => (
                    <button key={ex} onClick={() => setQuery(ex)}
                      className="text-xs bg-violet-50 text-violet-600 border border-violet-200 rounded-full px-3 py-1 hover:bg-violet-100 transition-colors">
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {searched && (
              <>
                {/* Tabs */}
                <div className="flex border-b border-gray-100 bg-white flex-shrink-0">
                  <button onClick={() => setTab('kb')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-colors
                      ${tab === 'kb' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                    <BookOpen size={13} />
                    Knowledge Base
                    {kbDone && (
                      <span className={`text-[0.6rem] font-bold rounded-full px-1.5 py-0.5 ml-0.5
                        ${hasKBDocs ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {kbResult?.docs.length ?? 0}
                      </span>
                    )}
                    {loadingKB && <Loader2 size={11} className="animate-spin text-violet-400" />}
                  </button>
                  <button onClick={() => setTab('web')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-colors
                      ${tab === 'web' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                    <Globe size={13} />
                    Web Search
                    {loadingWeb && <Loader2 size={11} className="animate-spin text-blue-400" />}
                    {webDone && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 ml-0.5" />}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">

                  {/* KB Tab */}
                  {tab === 'kb' && (
                    <div className="p-4 space-y-4">
                      {loadingKB && (
                        <div className="flex flex-col items-center py-6 gap-2 text-gray-400">
                          <Loader2 size={22} className="animate-spin text-violet-500" />
                          <p className="text-xs">Searching knowledge base...</p>
                        </div>
                      )}

                      {kbDone && (
                        <>
                          {/* Backend offline warning */}
                          {kbResult!.kbError === 'backend-offline' && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700">
                              ⚠️ Backend is offline — showing AI response only. Start the FastAPI server to see matched documents.
                            </div>
                          )}

                          {/* Matched KB docs */}
                          {hasKBDocs && (
                            <div>
                              <p className="text-[0.65rem] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                Matched Confluence Pages ({kbResult!.docs.length})
                              </p>
                              <div className="space-y-2">
                                {kbResult!.docs.map((doc, i) => {
                                  const cat = guessCategory(doc.filename)
                                  return (
                                    <div key={i} className="flex items-start gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                                      <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <FileText size={13} className="text-violet-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-gray-800">
                                          {doc.filename.replace('.txt','').replace(/_/g,' ')}
                                        </p>
                                        {cat && <p className="text-[0.63rem] text-gray-400 mt-0.5">{cat.icon} {cat.name}</p>}
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
                          )}

                          {/* No KB docs but backend online */}
                          {!hasKBDocs && !kbResult!.kbError && (
                            <div className="flex flex-col items-center py-4 gap-1.5 text-gray-400">
                              <FileText size={22} />
                              <p className="text-xs text-center">No matching pages found in knowledge base.</p>
                            </div>
                          )}

                          {/* KB answer (only if docs found) */}
                          {kbResult!.kbAnswer && (
                            <div>
                              <p className="text-[0.65rem] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                Solution from Knowledge Base
                              </p>
                              <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 space-y-1.5">
                                {renderLines(kbResult!.kbAnswer, 'violet')}
                              </div>
                            </div>
                          )}

                          {/* General AI answer — always shown */}
                          <div>
                            <p className="text-[0.65rem] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <MessageCircle size={10} />
                              AI Response
                            </p>
                            <div className="bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-100 rounded-xl p-3 space-y-1.5">
                              {renderLines(kbResult!.aiAnswer, 'blue')}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Web Tab */}
                  {tab === 'web' && (
                    <div className="p-4 space-y-3">
                      {loadingWeb && (
                        <div className="flex flex-col items-center py-6 gap-2 text-gray-400">
                          <Loader2 size={22} className="animate-spin text-blue-500" />
                          <p className="text-xs">Searching the web...</p>
                        </div>
                      )}
                      {webDone && (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Globe size={12} className="text-blue-600" />
                            </div>
                            <p className="text-xs font-semibold text-gray-600">Web Search Result</p>
                          </div>
                          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-1.5">
                            {renderLines(webResult!.answer, 'blue')}
                          </div>
                          <p className="text-[0.62rem] text-gray-400 text-center">Source: DuckDuckGo Instant Answer</p>
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
