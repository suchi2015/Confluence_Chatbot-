export interface Category {
  id: string
  name: string
  icon: string
  count: number
}

export interface ConfluencePage {
  id: string
  title: string
  category: string
  author: string
  date: string
  tags: string[]
  content: string
  status: 'Live' | 'Draft'
  filename: string
  filepath: string
}

export interface SearchResult {
  answer: string
  matched_docs: Array<{
    filename: string
    filepath: string
    content: string
    score: number
  }>
  has_good_match: boolean
  query: string
}
