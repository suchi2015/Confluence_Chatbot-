// AIAnswer.tsx — right panel: formatted AI generated answer
import { MessageSquare } from 'lucide-react'

interface Props {
  answer: string | null
}

interface ParsedBlock {
  type:  'step' | 'heading' | 'bullet' | 'plain'
  num?:  string
  title?: string
  body:  string
}

function parseAnswer(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = []
  const lines = text.trim().split('\n')
  let i = 0

  while (i < lines.length) {
    const ln = lines[i].trim()
    if (!ln) { i++; continue }

    // numbered step: "1. **Title** body..."
    const stepMatch = ln.match(/^(\d+)\.\s+\*\*(.+?)\*\*(.*)$/)
    if (stepMatch) {
      const [, num, title, rest] = stepMatch
      const bodyParts: string[] = rest.trim() ? [rest.trim()] : []
      i++
      while (i < lines.length) {
        const nxt = lines[i].trim()
        if (!nxt || /^\d+\./.test(nxt)) break
        bodyParts.push(nxt)
        i++
      }
      blocks.push({ type: 'step', num, title, body: bodyParts.join(' ').replace(/\*\*(.+?)\*\*/g, '$1') })
      continue
    }
    // bold heading
    if (/^\*\*(.+)\*\*$/.test(ln)) {
      blocks.push({ type: 'heading', body: ln.replace(/\*\*(.+)\*\*/, '$1') })
    } else if (ln.startsWith('- ') || ln.startsWith('* ')) {
      blocks.push({ type: 'bullet', body: ln.slice(2).replace(/\*\*(.+?)\*\*/g, '$1') })
    } else {
      blocks.push({ type: 'plain', body: ln.replace(/\*\*(.+?)\*\*/g, '$1') })
    }
    i++
  }
  return blocks
}

export default function AIAnswer({ answer }: Props) {
  const blocks = answer ? parseAnswer(answer) : []

  return (
    <div className="bg-white rounded-xl border border-[#e3e7f0] overflow-hidden flex flex-col min-h-[520px]">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#eef0f8]">
        <div className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-[#7a82a0]">
          <MessageSquare size={12} className="text-[#7c3aed]" />
          AI Generated Answer
        </div>
        <span className="bg-[#f4edff] text-[#7c3aed] text-[0.6rem] font-bold rounded-full px-2 py-0.5">AI</span>
      </div>

      {/* body */}
      <div className="p-4 flex-1 overflow-y-auto">
        {blocks.length > 0 ? (
          <div className="space-y-1.5">
            {blocks.map((b, idx) => {
              if (b.type === 'step') return (
                <div key={idx} className="bg-[#f5f7ff] border-l-[3px] border-[#5b6ef5] rounded-r-lg px-3 py-2">
                  <div className="text-[0.77rem] font-semibold text-[#1c2136] mb-0.5">
                    Step {b.num}: {b.title}
                  </div>
                  <div className="text-[0.73rem] text-[#374151]">{b.body}</div>
                </div>
              )
              if (b.type === 'heading') return (
                <div key={idx} className="text-[0.78rem] font-semibold text-[#1c2136] mt-3 mb-1">{b.body}</div>
              )
              if (b.type === 'bullet') return (
                <div key={idx} className="text-[0.74rem] text-[#374151] pl-3">• {b.body}</div>
              )
              return <div key={idx} className="text-[0.76rem] text-[#374151]">{b.body}</div>
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-[#c5cce8] text-[0.73rem] leading-relaxed">
            Submit a problem above<br />to get an AI-powered solution
          </div>
        )}
      </div>
    </div>
  )
}
