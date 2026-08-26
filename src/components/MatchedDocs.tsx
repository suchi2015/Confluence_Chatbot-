// MatchedDocs.tsx — left panel: list of matched documents with expand button
import { FileText, Maximize2, Minimize2 } from 'lucide-react'

interface MatchedDoc {
  filename: string
  filepath: string
  content: string
  score: number
}

interface Props {
  docs:          MatchedDoc[]
  activeIndex:   number | null
  onToggle:      (i: number) => void
  hasSearched:   boolean
}

function ScorePill({ score }: { score: number }) {
  if (score >= 80)
    return <span className="inline-block bg-[#e6f9ee] text-[#177a3c] text-[0.62rem] font-bold px-2 py-0.5 rounded-full">● {score}% match</span>
  return   <span className="inline-block bg-[#fff4e0] text-[#9a6400] text-[0.62rem] font-bold px-2 py-0.5 rounded-full">● {score}% match</span>
}

export default function MatchedDocs({ docs, activeIndex, onToggle, hasSearched }: Props) {
  const visible = docs.filter(d => d.score >= 65)

  return (
    <div className="bg-white rounded-xl border border-[#e3e7f0] overflow-hidden flex flex-col min-h-[520px]">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#eef0f8]">
        <div className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-[#7a82a0]">
          <FileText size={12} />
          Matched Documents
        </div>
        {visible.length > 0 && (
          <span className="bg-[#eef1ff] text-[#5b6ef5] text-[0.6rem] font-bold rounded-full px-2 py-0.5">
            {visible.length}
          </span>
        )}
      </div>

      {/* body */}
      <div className="p-3 flex-1 overflow-y-auto">
        {visible.length > 0 ? (
          visible.map((doc) => {
            const realIdx = docs.indexOf(doc)
            const isActive = activeIndex === realIdx
            return (
              <div
                key={doc.filename}
                className={`flex items-center gap-2 p-2.5 rounded-lg border mb-1.5 transition-all
                  ${isActive
                    ? 'border-[#b3bdff] bg-[#f7f9ff]'
                    : 'border-[#eef0f8] bg-white hover:border-[#c5cce8]'
                  }`}
              >
                {/* doc info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileText size={11} className="text-[#5b6ef5] shrink-0" />
                    <span className="text-[0.76rem] font-semibold text-[#1c2136] truncate">
                      {doc.filename}
                    </span>
                  </div>
                  <ScorePill score={doc.score} />
                  <div className="text-[0.61rem] text-[#a0a8c0] font-mono mt-1">
                    ./data/{doc.filename}
                  </div>
                </div>

                {/* expand / collapse */}
                <button
                  onClick={() => onToggle(realIdx)}
                  title={isActive ? 'Collapse' : 'Expand'}
                  className={`p-1.5 rounded-md border transition-colors shrink-0
                    ${isActive
                      ? 'bg-[#eef1ff] border-[#b3bdff] text-[#5b6ef5]'
                      : 'bg-[#f5f7ff] border-[#dde3f5] text-[#7a82a0] hover:bg-[#eef1ff] hover:text-[#5b6ef5]'
                    }`}
                >
                  {isActive ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                </button>
              </div>
            )
          })
        ) : hasSearched ? (
          <div className="text-center py-16 text-[#c5cce8] text-[0.73rem] leading-relaxed">
            No documents matched<br />above 65% relevance
          </div>
        ) : (
          <div className="text-center py-16 text-[#c5cce8] text-[0.73rem] leading-relaxed">
            Matched documents<br />will appear here
          </div>
        )}
      </div>
    </div>
  )
}
