import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Bold, Italic, Underline, Strikethrough,
  List, ListOrdered, Table2, Code2, AlignRight, AlignJustify,
  AlertTriangle, CheckCircle2, Sparkles, X, Loader2,
  ChevronRight, Send,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { CATEGORIES } from '../data/mockData'
import { publishPage } from '../store'
import type { ConfluencePage } from '../types'

// ── execCommand helpers ───────────────────────────────────────────────────────
function cmd(command: string, value?: string) {
  document.execCommand(command, false, value)
}

const HIGHLIGHTS = [
  { color: '#FEF08A', label: 'Yellow' },
  { color: '#BBF7D0', label: 'Green' },
  { color: '#BFDBFE', label: 'Blue'   },
  { color: '#FBCFE8', label: 'Pink'   },
]

function insertTable(rows = 3, cols = 3) {
  const th  = (i: number) =>
    `<th style="border:1px solid #dde3f0;padding:6px 10px;background:#f3f4f9;font-weight:600;text-align:left;">Header ${i + 1}</th>`
  const td  = () =>
    `<td style="border:1px solid #dde3f0;padding:6px 10px;">&nbsp;</td>`
  const head = Array.from({ length: cols }, (_, i) => th(i)).join('')
  const row  = Array.from({ length: cols }, td).join('')
  const body = Array.from({ length: rows - 1 }, () => `<tr>${row}</tr>`).join('')
  const table = `<table style="border-collapse:collapse;width:100%;margin:0.75rem 0;font-size:0.875rem;">
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>`
  document.execCommand('insertHTML', false, table)
}

// ── Validation errors type ────────────────────────────────────────────────────
interface ValidationError {
  category?: string
  title?:    string
  content?:  string
}

// ── AI panel state ────────────────────────────────────────────────────────────
type AIState = 'idle' | 'loading' | 'done' | 'error'

// ── Component ─────────────────────────────────────────────────────────────────
export default function CreatePage() {
  const navigate   = useNavigate()
  const editorRef  = useRef<HTMLDivElement>(null)
  const titleRef   = useRef<HTMLDivElement>(null)

  const [category,      setCategory]      = useState('')
  const [headingValue,  setHeadingValue]  = useState('Normal')
  const [errors,        setErrors]        = useState<ValidationError>({})
  const [showConfirm,   setShowConfirm]   = useState(false)
  const [publishing,    setPublishing]    = useState(false)
  const [published,     setPublished]     = useState(false)

  // AI assistance panel
  const [aiOpen,        setAiOpen]        = useState(false)
  const [aiPrompt,      setAiPrompt]      = useState('')
  const [aiState,       setAiState]       = useState<AIState>('idle')
  const [aiGenerated,   setAiGenerated]   = useState('')

  // ── Editor focus helper ───────────────────────────────────────────────────
  function focusEditor() { editorRef.current?.focus() }

  // ── Formatting ────────────────────────────────────────────────────────────
  function applyFormat(c: string)        { focusEditor(); cmd(c) }
  function applyHighlight(color: string) { focusEditor(); cmd('hiliteColor', color) }
  function applyTextColor(color: string) { focusEditor(); cmd('foreColor', color) }
  function handleList(t: 'insertUnorderedList' | 'insertOrderedList') { focusEditor(); cmd(t) }
  function handleTable() { focusEditor(); insertTable(3, 3) }
  function handleCode()  {
    focusEditor()
    const sel = window.getSelection()
    if (sel?.toString()) {
      cmd('insertHTML', `<code style="background:#f3f4f9;border-radius:3px;padding:1px 4px;font-size:0.85rem;">${sel.toString()}</code>`)
    } else {
      cmd('insertHTML', `<pre style="background:#f3f4f9;border-radius:6px;padding:12px 16px;font-size:0.85rem;"><code>// your code here</code></pre>`)
    }
  }

  function applyHeading(val: string) {
    setHeadingValue(val)
    focusEditor()
    const map: Record<string, string> = { Normal:'<p>', H1:'<h1>', H2:'<h2>', H3:'<h3>' }
    cmd('formatBlock', map[val] ?? '<p>')
  }

  // ── Validation ────────────────────────────────────────────────────────────
  function validate(): ValidationError {
    const e: ValidationError = {}
    if (!category)
      e.category = 'Please select a category before publishing.'
    const title   = titleRef.current?.innerText.trim() ?? ''
    const content = editorRef.current?.innerText.trim() ?? ''
    if (!title)   e.title   = 'Page title is required.'
    if (!content) e.content = 'Page content cannot be empty.'
    return e
  }

  // ── Click Publish ─────────────────────────────────────────────────────────
  function handlePublishClick() {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length > 0) return
    setShowConfirm(true)   // show confirm popup
  }

  // ── Confirm publish ───────────────────────────────────────────────────────
  async function handleConfirmPublish() {
    setPublishing(true)

    const title   = titleRef.current?.innerText.trim()  ?? 'Untitled'
    const content = editorRef.current?.innerHTML        ?? ''
    const cat     = CATEGORIES.find(c => c.id === category)

    // Build a ConfluencePage and add to in-memory store
    const newPage: ConfluencePage = {
      id:       `user-${Date.now()}`,
      title,
      category,
      author:   'You',
      date:     new Date().toISOString().slice(0, 10),
      tags:     cat ? [cat.name.split(' ')[0]] : [],
      content,
      status:   'Live',
      filename: `${title.toLowerCase().replace(/\s+/g,'_').slice(0,40)}.txt`,
      filepath: `./data/${title.toLowerCase().replace(/\s+/g,'_').slice(0,40)}.txt`,
    }
    publishPage(newPage)

    // Also save to backend (graceful if offline)
    try {
      await fetch('/api/save-new-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: newPage.filename,
          content:  content.replace(/<[^>]+>/g, ' '),
        }),
      })
    } catch { /* backend offline — page still lives in frontend store */ }

    setPublishing(false)
    setPublished(true)
    setShowConfirm(false)

    // Navigate to dashboard after 1.5 s
    setTimeout(() => navigate('/'), 1500)
  }

  // ── AI assistance — generate document content ─────────────────────────────
  async function handleAIGenerate() {
    const q = aiPrompt.trim()
    if (!q) return
    setAiState('loading')
    try {
      const res = await fetch('/api/generate-new-page-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, ai_answer: '' }),
      })
      const data = await res.json()
      setAiGenerated(data.preview ?? '')
      setAiState('done')
    } catch {
      // Fallback: build a basic template from the prompt
      setAiGenerated(buildTemplate(q))
      setAiState('done')
    }
  }

  function buildTemplate(topic: string): string {
    return `Title: ${topic}

Problem:
Describe the issue here.

Root Cause:
Explain why this happens.

Solution Steps:
1. Step one
2. Step two
3. Step three

Additional Notes:
Any warnings, tips, or escalation contacts.

Tags: ${topic.split(' ').slice(0, 3).join(', ')}`
  }

  // Insert AI generated text into editor
  function handleInsertAI() {
    if (!editorRef.current) return
    editorRef.current.focus()
    // Convert plain text to basic HTML paragraphs
    const html = aiGenerated
      .split('\n')
      .map(line => {
        if (!line.trim()) return '<br/>'
        if (/^Title:/i.test(line)) {
          // Put title in the title box
          if (titleRef.current && !titleRef.current.innerText.trim()) {
            titleRef.current.innerText = line.replace(/^Title:\s*/i, '')
          }
          return ''
        }
        if (/^\d+\./.test(line.trim()))
          return `<li>${line.replace(/^\d+\.\s*/, '')}</li>`
        if (/^#{1,3}\s/.test(line) || /^[A-Z][^a-z]*:$/.test(line.trim()))
          return `<h2 style="font-weight:600;margin-top:1rem;">${line.replace(/^#+\s*/, '')}</h2>`
        return `<p>${line}</p>`
      })
      .join('')
    document.execCommand('insertHTML', false, html)
    setAiOpen(false)
    setAiPrompt('')
    setAiGenerated('')
    setAiState('idle')
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <Navbar onSearchResults={() => {}} onClearSearch={() => {}} isSearchActive={false} />

      {/* ── Published success flash ── */}
      {published && (
        <div className="flex-shrink-0 bg-green-600 text-white text-sm font-semibold px-6 py-2 flex items-center gap-2">
          <CheckCircle2 size={15} />
          Page published successfully! Redirecting...
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-1 flex-wrap z-10">

        {/* Category selector */}
        <div className="flex items-center gap-1.5 mr-2">
          <span className="text-xs text-gray-500">Category:</span>
          <select
            value={category}
            onChange={e => { setCategory(e.target.value); setErrors(p => ({ ...p, category: undefined })) }}
            className={`border rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white
              ${errors.category ? 'border-red-400' : 'border-gray-200'}`}
          >
            <option value="">— Select —</option>
            {CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
            ))}
          </select>
        </div>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Heading */}
        <select value={headingValue} onChange={e => applyHeading(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
          <option value="Normal">Normal</option>
          <option value="H1">Heading 1</option>
          <option value="H2">Heading 2</option>
          <option value="H3">Heading 3</option>
        </select>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Inline format buttons */}
        {[
          { icon: <Bold size={13}/>,          c: 'bold',          title: 'Bold'          },
          { icon: <Italic size={13}/>,        c: 'italic',        title: 'Italic'        },
          { icon: <Underline size={13}/>,     c: 'underline',     title: 'Underline'     },
          { icon: <Strikethrough size={13}/>, c: 'strikeThrough', title: 'Strikethrough' },
        ].map(b => (
          <button key={b.c} title={b.title}
            onMouseDown={e => { e.preventDefault(); applyFormat(b.c) }}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 transition-colors">
            {b.icon}
          </button>
        ))}

        {/* Text color picker */}
        <div className="relative group">
          <button className="w-7 h-7 flex flex-col items-center justify-center rounded hover:bg-gray-100 gap-0.5">
            <span className="text-xs font-bold text-gray-700">A</span>
            <span className="w-4 h-1 rounded-full bg-gray-900" />
          </button>
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1.5 hidden group-hover:flex gap-1 z-20">
            {['#111827','#ef4444','#3b82f6','#16a34a','#f59e0b','#8b5cf6'].map(color => (
              <button key={color}
                onMouseDown={e => { e.preventDefault(); applyTextColor(color) }}
                className="w-5 h-5 rounded-full border-2 border-white ring-1 ring-gray-200 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Alignment */}
        <button title="Align Right" onMouseDown={e=>{ e.preventDefault(); focusEditor(); cmd('justifyRight') }}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600">
          <AlignRight size={13}/>
        </button>
        <button title="Justify" onMouseDown={e=>{ e.preventDefault(); focusEditor(); cmd('justifyFull') }}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600">
          <AlignJustify size={13}/>
        </button>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Lists */}
        <button title="Bullet List" onMouseDown={e=>{ e.preventDefault(); handleList('insertUnorderedList') }}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600">
          <List size={13}/>
        </button>
        <button title="Numbered List" onMouseDown={e=>{ e.preventDefault(); handleList('insertOrderedList') }}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600">
          <ListOrdered size={13}/>
        </button>

        {/* Table */}
        <button title="Insert Table (3×3)" onMouseDown={e=>{ e.preventDefault(); handleTable() }}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600">
          <Table2 size={13}/>
        </button>

        {/* Code */}
        <button title="Code" onMouseDown={e=>{ e.preventDefault(); handleCode() }}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600">
          <Code2 size={13}/>
        </button>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Highlights */}
        {HIGHLIGHTS.map(h => (
          <button key={h.color} title={`Highlight ${h.label}`}
            onMouseDown={e=>{ e.preventDefault(); applyHighlight(h.color) }}
            className="w-4 h-4 rounded border border-gray-300 hover:scale-110 transition-transform"
            style={{ backgroundColor: h.color }} />
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* AI Assistance button */}
        <button
          onClick={() => setAiOpen(o => !o)}
          className={`flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 border transition-all mr-1
            ${aiOpen
              ? 'bg-violet-600 text-white border-violet-600'
              : 'text-violet-600 border-violet-300 hover:bg-violet-50'}`}
        >
          <Sparkles size={12} />
          AI Assistance
        </button>

        {/* Back */}
        <button onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
          <ArrowLeft size={12}/> Back
        </button>

        {/* Publish */}
        <button
          onClick={handlePublishClick}
          disabled={publishing || published}
          className="flex items-center gap-1.5 text-xs font-semibold rounded-lg px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors"
        >
          {published ? <><CheckCircle2 size={12}/>Published!</> : 'Publish'}
        </button>
      </div>

      {/* ── Validation errors ── */}
      {Object.keys(errors).length > 0 && (
        <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-6 py-2 flex flex-wrap gap-4">
          {errors.category && (
            <div className="flex items-center gap-1.5 text-xs text-amber-800">
              <AlertTriangle size={12} className="text-amber-500" /> {errors.category}
            </div>
          )}
          {errors.title && (
            <div className="flex items-center gap-1.5 text-xs text-amber-800">
              <AlertTriangle size={12} className="text-amber-500" /> {errors.title}
            </div>
          )}
          {errors.content && (
            <div className="flex items-center gap-1.5 text-xs text-amber-800">
              <AlertTriangle size={12} className="text-amber-500" /> {errors.content}
            </div>
          )}
        </div>
      )}

      {/* ── AI Assistance Sliding Panel ── */}
      {aiOpen && (
        <div className="flex-shrink-0 bg-gradient-to-r from-violet-50 to-blue-50 border-b border-violet-200 px-6 py-4">
          <div className="flex items-start justify-between gap-4 max-w-3xl mx-auto">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-violet-600 rounded-lg flex items-center justify-center">
                  <Sparkles size={12} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-800">AI Assistance</span>
                <span className="text-xs text-gray-400">— Explain your design and concept, I'll create a document for you</span>
              </div>

              {/* Input row */}
              <div className="flex gap-2">
                <input
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAIGenerate() }}
                  placeholder="e.g. I fixed a recharge not credited issue using manual reconciliation, need a table structure with steps and root cause..."
                  className="flex-1 border border-violet-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 placeholder-gray-400"
                />
                <button
                  onClick={handleAIGenerate}
                  disabled={!aiPrompt.trim() || aiState === 'loading'}
                  className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  {aiState === 'loading'
                    ? <><Loader2 size={13} className="animate-spin"/>Generating...</>
                    : <><Send size={12}/>Generate</>}
                </button>
              </div>

              {/* Quick prompts */}
              {aiState === 'idle' && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    'Create a troubleshooting guide with steps table',
                    'Document a billing issue resolution with root cause',
                    'Write a network issue fix with escalation path',
                  ].map(p => (
                    <button key={p} onClick={() => setAiPrompt(p)}
                      className="text-xs bg-white text-violet-600 border border-violet-200 rounded-full px-2.5 py-1 hover:bg-violet-100 transition-colors">
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {/* Generated preview */}
              {aiState === 'done' && aiGenerated && (
                <div className="mt-3 bg-white rounded-xl border border-violet-200 p-3 max-h-48 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600">Generated Document Preview</span>
                    <button
                      onClick={handleInsertAI}
                      className="flex items-center gap-1 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <ChevronRight size={11}/>
                      Insert into Editor
                    </button>
                  </div>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {aiGenerated}
                  </pre>
                </div>
              )}

              {aiState === 'error' && (
                <p className="text-xs text-red-600 mt-2">Generation failed. Make sure the backend is running.</p>
              )}
            </div>

            <button onClick={() => { setAiOpen(false); setAiState('idle'); setAiGenerated('') }}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-1">
              <X size={16}/>
            </button>
          </div>
        </div>
      )}

      {/* ── Editor ── */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-3xl mx-auto px-8 py-8 min-h-full flex flex-col">

          {/* Title */}
          <div
            ref={titleRef}
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Page title..."
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); editorRef.current?.focus() } }}
            onInput={() => setErrors(p => ({ ...p, title: undefined }))}
            className="text-3xl font-bold text-gray-900 mb-4 focus:outline-none
                       empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300"
            style={{ minHeight: '2.5rem' }}
          />

          <hr className="border-gray-100 mb-6" />

          {/* Body */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Start writing your confluence page... Use the toolbar above for formatting, tables, and highlights. Or click AI Assistance to auto-generate content."
            onInput={() => setErrors(p => ({ ...p, content: undefined }))}
            className="editor-body flex-1 focus:outline-none text-gray-700 leading-relaxed text-sm
                       empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400
                       empty:before:text-sm"
            style={{ minHeight: '400px' }}
          />
        </div>
      </div>

      {/* ── Confirm Publish Modal ── */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                  <CheckCircle2 size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Confirm Publish</h3>
                  <p className="text-xs text-blue-200">Review before publishing</p>
                </div>
              </div>
              <button onClick={() => setShowConfirm(false)} className="text-blue-200 hover:text-white">
                <X size={16}/>
              </button>
            </div>

            {/* Summary */}
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-gray-600">You are about to publish the following page to the knowledge base:</p>

              <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-100">
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Title</span>
                  <span className="text-xs font-semibold text-gray-800 max-w-xs truncate text-right">
                    {titleRef.current?.innerText.trim() || '—'}
                  </span>
                </div>
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Category</span>
                  <span className="text-xs font-semibold text-gray-800">
                    {CATEGORIES.find(c => c.id === category)?.icon}{' '}
                    {CATEGORIES.find(c => c.id === category)?.name}
                  </span>
                </div>
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Status</span>
                  <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Live</span>
                </div>
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Author</span>
                  <span className="text-xs font-semibold text-gray-800">You</span>
                </div>
              </div>

              <p className="text-xs text-gray-400">
                This page will be added to <strong>{CATEGORIES.find(c=>c.id===category)?.name}</strong> and will be visible to all team members.
              </p>
            </div>

            {/* Actions */}
            <div className="px-6 pb-5 flex gap-2">
              <button
                onClick={handleConfirmPublish}
                disabled={publishing}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors disabled:opacity-60"
              >
                {publishing
                  ? <><Loader2 size={14} className="animate-spin"/>Publishing...</>
                  : <><CheckCircle2 size={14}/>Yes, Publish</>}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl py-2.5 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
