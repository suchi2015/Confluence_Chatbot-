// TopBar.tsx — dark navy header matching reference design
export default function TopBar() {
  return (
    <header className="flex items-center gap-3 px-5 h-12 bg-[#1c2136] shrink-0">
      <div className="w-7 h-7 rounded-md bg-[#5b6ef5] flex items-center justify-content text-white font-bold text-sm flex-shrink-0 flex items-center justify-center">
        ★
      </div>
      <span className="text-white font-semibold text-[0.9rem]">Knowledge Base</span>
      <span className="text-[#5a6480] text-[0.7rem]">AI-powered document search</span>
    </header>
  )
}
