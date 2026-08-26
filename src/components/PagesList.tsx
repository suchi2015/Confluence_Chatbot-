import type { ConfluencePage, Category } from '../types'
import { CATEGORIES } from '../data/mockData'

interface Props {
  pages:        ConfluencePage[]
  selectedPage: string | null
  category:     Category | undefined
  onSelect:     (page: ConfluencePage) => void
  searchActive?: boolean
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
}
function tagColor(tag: string) {
  return TAG_COLORS[tag] ?? 'bg-gray-100 text-gray-600'
}

export default function PagesList({ pages, selectedPage, category, onSelect, searchActive }: Props) {
  return (
    <div className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">{searchActive ? '🔍' : (category?.icon ?? '📄')}</span>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 leading-tight">
              {searchActive ? 'Search Results' : (category?.name ?? 'All Pages')}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{pages.length} articles</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {pages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center mt-10 px-4">No articles found.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {pages.map(page => {
              const isActive   = page.id === selectedPage
              const pageCat    = searchActive
                ? CATEGORIES.find(c => c.id === page.category)
                : undefined
              return (
                <li key={page.id}>
                  <button
                    onClick={() => onSelect(page)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* category badge in search mode */}
                    {pageCat && (
                      <span className="inline-flex items-center gap-1 text-[0.65rem] text-gray-400 mb-1">
                        {pageCat.icon} {pageCat.name}
                      </span>
                    )}
                    <p className={`text-sm font-medium leading-snug mb-1 ${isActive ? 'text-blue-700' : 'text-blue-600'}`}>
                      {page.title}
                    </p>
                    <p className="text-xs text-gray-400 mb-2">
                      {page.author} · {new Date(page.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {page.tags.slice(0, 3).map(tag => (
                        <span key={tag} className={`text-xs px-1.5 py-0.5 rounded font-medium ${tagColor(tag)}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
