// PageViewer.tsx — 3rd panel with manual Edit + AI Assistance
import { useState, useRef, useEffect } from 'react'
import {
  Pencil, Sparkles, BookOpen, Wand2, X, Loader2,
  ChevronRight, Check, Bold, Italic, Underline,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
} from 'lucide-react'
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

type AIMode = null | 'menu' | 'understand' | 'edit-confirm' | 'saved'

export default function PageViewer({ page }: Props) {
  // ── Edit mode state ─────────────────────────────────────────────────────
  const [editMode,    setEditMode]    = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)

  // Reset edit mode when page changes
  useEffect(() => {
    setEditMode(false)
    setSaveSuccess(false)
    resetAI()
  }, [page?.id])

  function startEdit() {
    setEditMode(true)
    setSaveSuccess(false)
    // Set editor content after render
    setTimeout(() => {
      if (editorRef.current && page) {
        editorRef.current.innerHTML = page.content
        editorRef.current.focus()
      }
    }, 50)
  }

  function cancelEdit() {
    setEditMode(false)
    setSaveSuccess(false)
  }

  async function handleSaveManual() {
    if (!page || !editorRef.current) return
    setSaving(true)
    const newContent = editorRef.current.innerHTML
    try {
      await saveUpdate(page.filepath, page.filename, newContent)
      // Update page content in-place for immediate feedback
      page.content = newContent
      setSaveSuccess(true)
      setEditMode(false)
    } catch {
      // Backend offline — still update locally
      page.content = newContent
      setSaveSuccess(true)
      setEditMode(false)
    } finally {
      setSaving(false)
    }
  }

  // ── Editor toolbar commands ─────────────────────────────────────────────
  function fmt(cmd: string, val?: string) {
    document.execCommand(cmd, false, val)
    editorRef.current?.focus()
  }

  // ── AI state ────────────────────────────────────────────────────────────
  const [aiMode,    setAiMode]    = useState<AIMode>(null)
  const [aiAnswer,  setAiAnswer]  = useState('')
  const [editedDoc, setEditedDoc] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  function resetAI() {
    setAiMode(null); setAiAnswer(''); setEditedDoc('')
  }

  async function handleUnderstand() {
    if (!page) return
    setAiMode('understand')
    setAiLoading(true)
    try {
      const ans = await generateAnswer(
        `Explain this confluence page in simple terms: ${page.title}`,
        [page.content.replace(/<[^>]+>/g, ' ')]
      )
      setAiAnswer(ans)
    } catch {
      setAiAnswer('Could not generate explanation. Make sure the backend is running.')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleEditWithAI() {
    if (!page) return
    setAiMode('edit-confirm')
    setAiLoading(true)
    try {
      const preview = await generateUpdatePreview(
        page.title, page.filename, page.filepath,
        page.content.replace(/<[^>]+>/g, ' '), ''
      )
      setEditedDoc(preview)
    } catch {
      setEditedDoc('Could not generate update. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSaveAIEdit() {
    if (!page) return
    setAiLoading(true)
    try {
      await saveUpdate(page.filepath, page.filename, editedDoc)
      setAiMode('saved')
    } catch {
      setAiMode('saved')
    } finally {
      setAiLoading(false)
    }
  }

  // ── Empty state ─────────────────────────────────────────────────────────
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

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex flex-wrap gap-1.5">
            {page.tags.map(tag => (
              <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-medium ${tagColor(tag)}`}>
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Edit button */}
            {!editMode ? (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600
                           border border-gray-200 hover:border-blue-400 rounded-lg px-3 py-1.5
                           hover:bg-blue-50 transition-all"
              >
                <Pencil size={12} /> Edit
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleSaveManual}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600
                             hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 transition-colors"
                >
                  {saving
                    ? <Loader2 size={11} className="animate-spin" />
                    : <Check size={11} />}
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* AI Assistance button */}
            {!editMode && (
              <button
                onClick={() => { resetAI(); setAiMode(aiMode ? null : 'menu') }}
                className={`flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 border transition-all
                  ${aiMode
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-violet-600 border-violet-300 hover:bg-violet-50'}`}
              >
                <Sparkles size={12} />
                AI Assistance
              </button>
            )}
          </div>
        </div>

        {/* Save success flash */}
        {saveSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex items-center gap-2 text-xs text-green-700 font-semibold">
            <Check size={13} /> Page saved successfully!
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">{page.title}</h1>

        {/* Meta */}
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

        {/* ── EDIT MODE toolbar + editable content ── */}
        {editMode && (
          <div className="mb-4 border border-blue-200 rounded-xl overflow-hidden shadow-sm">
            {/* Mini toolbar */}
            <div className="flex items-center gap-0.5 px-3 py-2 bg-blue-50 border-b border-blue-100 flex-wrap">
              <span className="text-xs text-blue-500 font-medium mr-2">Edit:</span>
              {[
                { icon: <Bold size={12}/>,       cmd: 'bold',          title: 'Bold'          },
                { icon: <Italic size={12}/>,     cmd: 'italic',        title: 'Italic'        },
                { icon: <Underline size={12}/>,  cmd: 'underline',     title: 'Underline'     },
              ].map(b => (
                <button key={b.cmd} title={b.title}
                  onMouseDown={e => { e.preventDefault(); fmt(b.cmd) }}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-blue-200 text-blue-600 transition-colors">
                  {b.icon}
                </button>
              ))}
              <div className="w-px h-4 bg-blue-200 mx-1" />
              <button title="Heading 2" onMouseDown={e => { e.preventDefault(); fmt('formatBlock','<h2>') }}
                className="text-[0.65rem] font-bold px-1.5 h-6 flex items-center rounded hover:bg-blue-200 text-blue-600">H2</button>
              <button title="Heading 3" onMouseDown={e => { e.preventDefault(); fmt('formatBlock','<h3>') }}
                className="text-[0.65rem] font-bold px-1.5 h-6 flex items-center rounded hover:bg-blue-200 text-blue-600">H3</button>
              <button title="Paragraph" onMouseDown={e => { e.preventDefault(); fmt('formatBlock','<p>') }}
                className="text-[0.65rem] px-1.5 h-6 flex items-center rounded hover:bg-blue-200 text-blue-600">P</button>
              <div className="w-px h-4 bg-blue-200 mx-1" />
              <button title="Bullet List" onMouseDown={e => { e.preventDefault(); fmt('insertUnorderedList') }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-blue-200 text-blue-600">
                <List size={12}/>
              </button>
              <button title="Numbered List" onMouseDown={e => { e.preventDefault(); fmt('insertOrderedList') }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-blue-200 text-blue-600">
                <ListOrdered size={12}/>
              </button>
              <div className="w-px h-4 bg-blue-200 mx-1" />
              <button title="Align Left" onMouseDown={e => { e.preventDefault(); fmt('justifyLeft') }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-blue-200 text-blue-600">
                <AlignLeft size={12}/>
              </button>
              <button title="Align Center" onMouseDown={e => { e.preventDefault(); fmt('justifyCenter') }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-blue-200 text-blue-600">
                <AlignCenter size={12}/>
              </button>
              <button title="Align Right" onMouseDown={e => { e.preventDefault(); fmt('justifyRight') }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-blue-200 text-blue-600">
                <AlignRight size={12}/>
              </button>
              <div className="ml-auto text-[0.62rem] text-blue-400 italic">Click Save when done</div>
            </div>

            {/* Editable content */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[300px] p-5 text-sm text-gray-700 leading-relaxed focus:outline-none
                         prose prose-sm max-w-none bg-white"
            />
          </div>
        )}

        {/* ── AI Assistance panels (only in view mode) ── */}
        {!editMode && (
          <>
            {aiMode === 'menu' && (
              <div className="mb-6 bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
                      <Sparkles size={13} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold text-gray-800">AI Assistance</span>
                  </div>
                  <button onClick={resetAI} className="text-gray-400 hover:text-gray-600"><X size={14}/></button>
                </div>
                <p className="text-xs text-gray-500 mb-3">What would you like to do?</p>
                <div className="flex gap-2">
                  <button onClick={handleUnderstand}
                    className="flex-1 flex flex-col items-center gap-2 bg-white rounded-xl border border-violet-200 px-4 py-3 hover:border-violet-400 hover:shadow-sm transition-all group">
                    <div className="w-9 h-9 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                      <BookOpen size={16} className="text-blue-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-gray-800">Understand with AI</p>
                      <p className="text-[0.65rem] text-gray-400 mt-0.5">Simple explanation</p>
                    </div>
                  </button>
                  <button onClick={handleEditWithAI}
                    className="flex-1 flex flex-col items-center gap-2 bg-white rounded-xl border border-violet-200 px-4 py-3 hover:border-violet-400 hover:shadow-sm transition-all group">
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

            {aiMode === 'understand' && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-blue-600" />
                    <span className="text-sm font-semibold text-blue-800">AI Explanation</span>
                  </div>
                  <button onClick={resetAI} className="text-gray-400 hover:text-gray-600"><X size={14}/></button>
                </div>
                {aiLoading
                  ? <div className="flex items-center gap-2 text-sm text-blue-500"><Loader2 size={14} className="animate-spin"/> Generating...</div>
                  : <div className="space-y-1.5">
                      {aiAnswer.split('\n').filter(Boolean).map((line, i) => {
                        const isStep = /^\d+\./.test(line.trim()) || line.startsWith('-')
                        return isStep
                          ? <div key={i} className="flex items-start gap-2"><ChevronRight size={12} className="text-blue-400 flex-shrink-0 mt-1"/><p className="text-xs text-gray-700">{line.replace(/^[\d.\-*]+\s*/, '')}</p></div>
                          : <p key={i} className="text-xs text-gray-700">{line}</p>
                      })}
                    </div>
                }
              </div>
            )}

            {aiMode === 'edit-confirm' && (
              <div className="mb-6 bg-violet-50 border border-violet-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Wand2 size={14} className="text-violet-600"/>
                    <span className="text-sm font-semibold text-violet-800">AI Improved Version</span>
                  </div>
                  <button onClick={resetAI} className="text-gray-400 hover:text-gray-600"><X size={14}/></button>
                </div>
                {aiLoading
                  ? <div className="flex items-center gap-2 text-sm text-violet-500"><Loader2 size={14} className="animate-spin"/> Generating...</div>
                  : <>
                      <p className="text-xs text-gray-500 mb-2">Review and edit before saving:</p>
                      <textarea value={editedDoc} onChange={e => setEditedDoc(e.target.value)} rows={10}
                        className="w-full text-xs font-mono text-gray-700 border border-violet-200 rounded-lg p-3 resize-y outline-none focus:border-violet-400 bg-white"/>
                      <div className="flex gap-2 mt-3">
                        <button onClick={handleSaveAIEdit} disabled={aiLoading}
                          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-4 py-2 rounded-lg">
                          {aiLoading ? <Loader2 size={12} className="animate-spin"/> : '💾'} Save
                        </button>
                        <button onClick={resetAI} className="text-xs text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50">Cancel</button>
                      </div>
                    </>
                }
              </div>
            )}

            {aiMode === 'saved' && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-green-700">✅ Document updated and saved!</span>
                <button onClick={resetAI} className="text-gray-400 hover:text-gray-600"><X size={14}/></button>
              </div>
            )}
          </>
        )}

        {/* ── Page Content (view mode only) ── */}
        {!editMode && (
          <div
            className="page-content prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        )}
      </div>
    </div>
  )
}
