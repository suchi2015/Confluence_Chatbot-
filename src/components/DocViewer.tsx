// DocViewer.tsx — middle panel: full content of the expanded document
import { LayoutGrid, X } from 'lucide-react'

interface MatchedDoc {
  filename: string
  filepath: string
  content: string
  score: number
}

interface Props {
  doc:      MatchedDoc
  onClose:  () => void
}

export default function DocViewer({ doc, onClose }: Props) {
  const lines = doc.content.trim().split('\n')
  const title = lines[0]?.replace('Title:', '').trim() ?? doc.filename

  return (
    <div className="bg-white rounded-xl border border-[#e3e7f0] overflow-hidden flex flex-col min-h-[520px]">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#eef0f8]">
        <div className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-[#7a82a0]">
          <LayoutGrid size={12} />
          Document
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-[#eef1ff] text-[#5b6ef5] text-[0.63rem] font-semibold px-2 py-0.5 rounded">
            {doc.filename}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded border border-[#e3e7f0] text-[#7a82a0] hover:bg-[#f7f8fc] transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* file meta */}
      <div className="px-4 py-2.5 bg-[#f7f8fc] border-b border-[#eef0f8]">
        <div className="text-[0.6rem] font-bold uppercase tracking-wider text-[#a0a8c0]">FILE</div>
        <div className="text-[0.86rem] font-semibold text-[#1c2136] mt-0.5">{title}</div>
      </div>

      {/* content */}
      <div className="p-4 flex-1 overflow-y-auto">
        <pre className="text-[0.74rem] text-[#374151] leading-relaxed whitespace-pre-wrap font-mono">
          {doc.content}
        </pre>
      </div>
    </div>
  )
}
