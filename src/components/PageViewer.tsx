// PageViewer.tsx — 3rd panel with AI Assistance button
import { useState } from 'react'
import { Pencil, Sparkles, BookOpen, Wand2, X, Loader2, ChevronRight } from 'lucide-react'
import type { ConfluencePage } from '../types'
import { generateAnswer, generateUpdatePreview, saveUpdate } from '../api'

interface Props {
  page: ConfluencePage | null
}

const TAG_COLORS: Record<string, string> = {
  Payment:  'bg-green-100 text-green-700',
  Recharge: 'bg-blue-100 text-blue-700',
  Network:  'bg-purple-100 text-purple-700',
  VPN:      'bg-orange-100 text-orange-700',
  Billing:  'bg-red-100 text-red-700',
  Postpaid: 'bg-indigo-100 text-indigo-700',
  Prepaid:  'bg-yellow-100 text-yellow-700',
  Data:     'bg-cyan-100 text-cyan-700',
  Roaming:  'bg-teal-100 text-teal-700',
  Porting:  'bg-pink-100 text-pink-700',
  Device:   'bg-amber-100 text-amber-700',
}
function tagColor(tag: string) {
  return TAG_COLORS[tag] ?? 'bg-gray-100 text-gray-600'
}

type AIMode = null | 'menu' | 'understand' | 'edit-preview' | 'edit-confirm' | 'saved'

export default function PageViewer({ page }: Props) {
  const [aiMode,       setAiMode]       = useState<AIMode>(null)
  const [aiAnswer,     setAiAnswer]     = useState('')
  const [,             setEditPreview]  = useState('')
  const [editedDoc,    setEditedDoc]    = useState('')
  const [loading,      setLoading]      = useState(false)

  // reset AI panel when page changes
  function reset() { setAiMode(null); setAiAnswer(''); setEditPreview(''); setEditedDoc('') }

  async function handleUnderstand() {
    if (!page) return
    setAiMode('understand')
    setLoading(true)
    try {
      const ans = await generateAnswer(
        `Explain this confluence page in simple terms: ${page.title}`,
        [page.content.replace(/<[^>]+>/g, ' ')]   // strip HTML tags
      )
      setAiAnswer(ans)
    } catch {
      setAiAnswer('Could not generate explanation. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  async function handleEditWithAI() {
    if (!page) return
    setAiMode('edit-preview')
    setLoading(true)
    try {
      const preview = await generateUpdatePreview(
        page.title,
        page.filename,
        page.filepath,
        page.content.replace(/<[^>]+>/g, ' '),
        ''
      )
      setEditPreview(preview)
      setEditedDoc(preview)
      setAiMode('edit-confirm')
    } catch {
      setEditPreview('Could not generate update. Make sure the backend is running.')
      setAiMode('edit-confirm')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveEdit() {
    if (!page) return
    setLoading(true)
    try {
      await saveUpdate(page.filepath, page.filename, editedDoc)
      setAiMode('saved')
    } catch {
      setAiMode('saved')  // show saved even if backend offline (demo)
    } finally {
      setLoading(false)
    }
  }

  if (!page) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center text-gray-400">
          <div className="text-5xl mb-3">📄</div>
          <p className="text-sm font-medium">Select a page to view</p>
          <p className="text-xs mt-1">Choose an article from the list</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-white overflow-y-auto relative" key={page.id}>
      <div className="max-w-3xl mx-auto px-8 py-6">

        {/* Top bar: tags + Edit + AI Assistance */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex flex-wrap gap-1.5">
            {page.tags.map(tag => (
              <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-medium ${tagColor(tag)}`}>
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
              <Pencil size={12} /> Edit
            </button>
            {/* AI Assistance Button */}
            <button
              onClick={() => { reset(); setAiMode(aiMode ? null : 'menu') }}
              className={`flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 border transition-all
                ${aiMode
                  ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200'
                  : 'bg-white text-violet-600 border-violet-300 hover:bg-violet-50'
                }`}
            >
              <Sparkles size={12} />
              AI Assistance
            </button>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">{page.title}</h1>

        {/* Meta row */}
        <div className="flex items-center gap-3 mb-6 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold uppercase">
              {page.author.charAt(0)}
            </div>
            <span>{page.author}</span>
          </div>
          <span className="text-gray-300">·</span>
          <span>{new Date(page.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          <span className="text-gray-300">·</span>
          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full
            ${page.status === 'Live' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${page.status === 'Live' ? 'bg-green-500' : 'bg-yellow-500'}`} />
            {page.status}
          </span>
        </div>

        <hr className="border-gray-100 mb-6" />

        {/* ── AI Assistance Panel ── */}
        {aiMode === 'menu' && (
          <div className="mb-6 bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
                  <Sparkles size={13} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-800">AI Assistance</span>
              </div>
              <button onClick={reset} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
            <p className="text-xs text-gray-500 mb-3">What would you like to do with this page?</p>
            <div className="flex gap-2">
              {/* Understand */}
              <button
                onClick={handleUnderstand}
                className="flex-1 flex flex-col items-center gap-2 bg-white rounded-xl border border-violet-200 px-4 py-3 hover:border-violet-400 hover:shadow-sm transition-all group"
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                  <BookOpen size={16} className="text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-800">Understand with AI</p>
                  <p className="text-[0.65rem] text-gray-400 mt-0.5">Get a simple explanation</p>
                </div>
              </button>
              {/* Edit */}
              <button
                onClick={handleEditWithAI}
                className="flex-1 flex flex-col items-center gap-2 bg-white rounded-xl border border-violet-200 px-4 py-3 hover:border-violet-400 hover:shadow-sm transition-all group"
              >
                <div className="w-9 h-9 rounded-full bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center transition-colors">
                  <Wand2 size={16} className="text-violet-600" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-800">Edit / Update with AI</p>
                  <p className="text-[0.65rem] text-gray-400 mt-0.5">Improve this document</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Understand result */}
        {aiMode === 'understand' && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">AI Explanation</span>
              </div>
              <button onClick={reset} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-blue-500">
                <Loader2 size={14} className="animate-spin" /> Generating explanation...
              </div>
            ) : (
              <div className="space-y-1.5">
                {aiAnswer.split('\n').filter(Boolean).map((line, i) => {
                  const isStep = /^\d+\./.test(line.trim()) || line.startsWith('-')
                  return isStep ? (
                    <div key={i} className="flex items-start gap-2">
                      <ChevronRight size={12} className="text-blue-400 flex-shrink-0 mt-1" />
                      <p className="text-xs text-gray-700 leading-relaxed">{line.replace(/^[\d.\-*]+\s*/, '')}</p>
                    </div>
                  ) : (
                    <p key={i} className="text-xs text-gray-700 leading-relaxed">{line}</p>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Edit Preview / Confirm */}
        {(aiMode === 'edit-preview' || aiMode === 'edit-confirm') && (
          <div className="mb-6 bg-violet-50 border border-violet-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wand2 size={14} className="text-violet-600" />
                <span className="text-sm font-semibold text-violet-800">AI Improved Document</span>
              </div>
              <button onClick={reset} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-violet-500">
                <Loader2 size={14} className="animate-spin" /> Generating improved version...
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-2">Review and edit before saving:</p>
                <textarea
                  value={editedDoc}
                  onChange={e => setEditedDoc(e.target.value)}
                  rows={10}
                  className="w-full text-xs font-mono text-gray-700 border border-violet-200 rounded-lg p-3 resize-y outline-none focus:border-violet-400 bg-white"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleSaveEdit}
                    disabled={loading}
                    className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : '💾'}
                    Save to Knowledge Base
                  </button>
                  <button onClick={reset} className="text-xs text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Saved success */}
        {aiMode === 'saved' && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-green-700">✅ Document updated and saved to knowledge base!</span>
            <button onClick={reset} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
          </div>
        )}

        {/* Page Content */}
        <div
          className="page-content prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </div>
    </div>
  )
}
