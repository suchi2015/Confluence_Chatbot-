// SearchBar.tsx — search input + upload + search button in one clean row
import { useRef, useState } from 'react'
import { Search, Upload, Loader2 } from 'lucide-react'

interface Props {
  onSearch: (query: string) => void
  onUpload: (file: File)   => void
  loading:  boolean
}

export default function SearchBar({ onSearch, onUpload, loading }: Props) {
  const [query, setQuery] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSearch = () => {
    if (query.trim()) onSearch(query.trim())
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUpload(file)
      e.target.value = ''
    }
  }

  return (
    <div className="bg-white border-b border-[#e3e7f0] px-5 py-3 flex items-center gap-3">
      {/* Search icon + input */}
      <div className="flex-1 flex items-center gap-2 bg-[#f7f8fc] border border-[#e3e7f0] rounded-lg px-3 py-2">
        <Search size={15} className="text-[#a0a8c0] shrink-0" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Describe your problem or paste text here..."
          className="flex-1 bg-transparent text-[0.84rem] text-[#1c2136] outline-none placeholder:text-[#a0a8c0]"
        />
      </div>

      {/* Upload button */}
      <button
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-1.5 text-[0.78rem] font-medium text-[#4a5568]
                   border border-[#e3e7f0] rounded-lg px-4 py-2 bg-white
                   hover:border-[#5b6ef5] hover:text-[#5b6ef5] hover:bg-[#f5f7ff]
                   transition-colors shrink-0"
        title="Upload a .txt problem file"
      >
        <Upload size={13} />
        Upload
      </button>
      <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={handleFile} />

      {/* Search button */}
      <button
        onClick={handleSearch}
        disabled={loading || !query.trim()}
        className="flex items-center gap-2 bg-[#5b6ef5] hover:bg-[#4a5de0] disabled:opacity-50
                   text-white text-[0.83rem] font-semibold rounded-lg px-5 py-2
                   transition-colors shrink-0"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        Search
      </button>
    </div>
  )
}
