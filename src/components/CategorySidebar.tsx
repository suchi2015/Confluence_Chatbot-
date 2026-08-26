import type { Category } from '../types'

interface Props {
  categories:   Category[]
  selected:     string
  onSelect:     (id: string) => void
  highlightIds?: string[]   // categories that have search matches
}

export default function CategorySidebar({ categories, selected, onSelect, highlightIds }: Props) {
  const isSearchMode = !!highlightIds

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      <div className="px-3 pt-4 pb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">
          Categories
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
        {categories.map(cat => {
          const isActive    = cat.id === selected
          const isHighlight = highlightIds?.includes(cat.id)
          const isDimmed    = isSearchMode && !isHighlight

          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : isHighlight
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : isDimmed
                  ? 'text-gray-300 hover:bg-gray-50'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className={`text-base leading-none ${isDimmed ? 'opacity-40' : ''}`}>
                {cat.icon}
              </span>
              <span className="flex-1 text-sm font-medium truncate">{cat.name}</span>
              {/* show match dot for highlighted categories */}
              {isHighlight && !isActive && (
                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              )}
              {!isHighlight && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold flex-shrink-0 ${
                  isActive ? 'bg-blue-500 text-blue-100' : 'bg-gray-100 text-gray-500'
                }`}>
                  {cat.count}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
