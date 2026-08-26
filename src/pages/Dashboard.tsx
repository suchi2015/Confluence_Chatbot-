// Dashboard.tsx
import { useState } from 'react'
import Navbar from '../components/Navbar'
import CategorySidebar from '../components/CategorySidebar'
import PagesList from '../components/PagesList'
import PageViewer from '../components/PageViewer'
import ChatBot from '../components/ChatBot'
import { CATEGORIES, PAGES } from '../data/mockData'
import { getPublishedPages } from '../store'
import type { ConfluencePage } from '../types'
import type { MatchedDoc } from '../api'

export default function Dashboard() {
  const [selectedCategory,  setSelectedCategory]  = useState<string>(CATEGORIES[0].id)
  const [selectedPage,      setSelectedPage]      = useState<ConfluencePage | null>(
    () => PAGES.find(p => p.category === CATEGORIES[0].id) ?? null
  )
  const [searchDocs,        setSearchDocs]        = useState<MatchedDoc[] | null>(null)
  const [isSearchActive,    setIsSearchActive]    = useState(false)

  // ── Navigation ───────────────────────────────────────────────────────────
  function handleCategorySelect(id: string) {
    setSelectedCategory(id)
    const allPages = [...PAGES, ...getPublishedPages()]
    setSelectedPage(allPages.find(p => p.category === id) ?? null)
    clearSearch()
  }

  // ── Search ───────────────────────────────────────────────────────────────
  function handleSearchResults(docs: MatchedDoc[], _query: string) {
    setSearchDocs(docs)
    setIsSearchActive(true)
    if (docs.length > 0) {
      const allPages  = [...PAGES, ...getPublishedPages()]
      const matched   = allPages.find(p => p.filename === docs[0].filename)
      if (matched) { setSelectedPage(matched); setSelectedCategory(matched.category) }
    }
  }

  function clearSearch() {
    setSearchDocs(null)
    setIsSearchActive(false)
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const allPages           = [...PAGES, ...getPublishedPages()]
  const matchedFilenames   = searchDocs ? new Set(searchDocs.map(d => d.filename)) : null
  const searchMatchedPages = searchDocs ? allPages.filter(p => matchedFilenames!.has(p.filename)) : null
  const activeCategories   = searchMatchedPages ? [...new Set(searchMatchedPages.map(p => p.category))] : null
  const pagesInPanel       = isSearchActive && searchMatchedPages
    ? searchMatchedPages
    : allPages.filter(p => p.category === selectedCategory)
  const category           = CATEGORIES.find(c => c.id === selectedCategory)

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <Navbar
        onSearchResults={handleSearchResults}
        onClearSearch={clearSearch}
        isSearchActive={isSearchActive}
      />

      {/* Search banner */}
      {isSearchActive && searchMatchedPages && (
        <div className="bg-blue-600 text-white text-xs px-4 py-1.5 flex items-center justify-between flex-shrink-0">
          <span>
            🔍 Showing <strong>{searchMatchedPages.length}</strong> matched{' '}
            {searchMatchedPages.length === 1 ? 'page' : 'pages'} across{' '}
            {activeCategories?.length} {activeCategories?.length === 1 ? 'category' : 'categories'}
          </span>
          <button onClick={clearSearch} className="text-blue-200 hover:text-white underline text-xs">
            Clear search
          </button>
        </div>
      )}

      <main className="flex-1 flex overflow-hidden">
        <CategorySidebar
          categories={CATEGORIES}
          selected={selectedCategory}
          onSelect={handleCategorySelect}
          highlightIds={activeCategories ?? undefined}
        />
        <PagesList
          pages={pagesInPanel}
          selectedPage={selectedPage?.id ?? null}
          category={isSearchActive ? undefined : category}
          onSelect={p => { setSelectedPage(p); if (!isSearchActive) setSelectedCategory(p.category) }}
          searchActive={isSearchActive}
        />
        <PageViewer page={selectedPage} />
      </main>

      <ChatBot />
    </div>
  )
}
