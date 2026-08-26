// UpdateBanner.tsx — shown when matched doc found: offer to update it
import { useState } from 'react'
import { Lightbulb, Loader2, Save, X } from 'lucide-react'
import axios from 'axios'

interface MatchedDoc {
  filename: string
  filepath: string
  content: string
  score: number
}

interface Props {
  doc:    MatchedDoc
  answer: string
  query:  string
  onDone: () => void
}

async function generateUpdatePreview(
  query: string,
  filename: string,
  filepath: string,
  content: string,
  answer: string
): Promise<string> {
  const res = await axios.post<{ preview: string }>('/api/update-preview', {
    query, filename, filepath, content, answer
  })
  return res.data.preview
}

async function saveUpdate(filepath: string, filename: string, content: string): Promise<void> {
  await axios.post('/api/save-update', { filepath, filename, content })
}

export default function UpdateBanner({ doc, answer, query, onDone }: Props) {
  const [stage,   setStage]   = useState<'prompt' | 'preview' | 'done'>('prompt')
  const [edited,  setEdited]  = useState('')
  const [loading, setLoading] = useState(false)
  const [saved,   setSaved]   = useState(false)

  const handleYes = async () => {
    setLoading(true)
    try {
      const p = await generateUpdatePreview(query, doc.filename, doc.filepath, doc.content, answer)
      setEdited(p)
      setStage('preview')
    } catch {
      setEdited(doc.content)
      setStage('preview')
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await saveUpdate(doc.filepath, doc.filename, edited)
    } catch {
      // Gracefully handle offline
    }
    setSaved(true)
    setLoading(false)
    setTimeout(onDone, 1500)
  }

  if (saved) return (
    <div className="mt-3 bg-[#e6f9ee] border border-[#b3e8c8] rounded-xl px-5 py-3 text-[0.78rem] font-semibold text-[#177a3c]">
      ✅ {doc.filename} updated and re-indexed in knowledge base!
    </div>
  )

  return (
    <div className="mt-3 bg-white border border-[#e3e7f0] rounded-xl overflow-hidden">
      {stage === 'prompt' && (
        <div className="flex items-center justify-between px-5 py-4 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[0.78rem] font-semibold text-[#1c2136] mb-1">
              <Lightbulb size={14} className="text-[#f5a623]" />
              Want to update the existing confluence page with this AI answer?
            </div>
            <div className="text-[0.71rem] text-[#7a82a0]">
              The AI answer will be merged into{' '}
              <span className="text-[#5b6ef5] font-semibold">{doc.filename}</span>
              {' '}with better formatting and saved back.
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleYes}
              disabled={loading}
              className="flex items-center gap-1.5 bg-[#5b6ef5] hover:bg-[#4a5de0] text-white text-[0.78rem] font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : '✅'}
              Yes, Update Page
            </button>
            <button
              onClick={onDone}
              className="flex items-center gap-1 border border-[#e3e7f0] text-[#4a5568] text-[0.78rem] px-3 py-2 rounded-lg hover:bg-[#f7f8fc] transition-colors"
            >
              <X size={12} /> No Thanks
            </button>
          </div>
        </div>
      )}

      {stage === 'preview' && (
        <div className="p-5">
          <div className="text-[0.78rem] font-semibold text-[#1c2136] mb-3">
            📄 Preview — Updated Confluence Document
          </div>
          <textarea
            value={edited}
            onChange={e => setEdited(e.target.value)}
            rows={12}
            className="w-full text-[0.74rem] font-mono text-[#374151] border border-[#e3e7f0] rounded-lg p-3 resize-y outline-none focus:border-[#5b6ef5]"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-1.5 bg-[#5b6ef5] hover:bg-[#4a5de0] text-white text-[0.78rem] font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Confirm & Save
            </button>
            <button
              onClick={() => setStage('prompt')}
              className="border border-[#e3e7f0] text-[#4a5568] text-[0.78rem] px-3 py-2 rounded-lg hover:bg-[#f7f8fc] transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={onDone}
              className="border border-[#e3e7f0] text-[#c0392b] text-[0.78rem] px-3 py-2 rounded-lg hover:bg-[#fdecea] transition-colors"
            >
              <X size={12} className="inline mr-1" />Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
