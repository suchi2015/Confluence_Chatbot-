// api.ts — all backend calls in one place
import axios from 'axios'

const BASE = '/api'

export interface MatchedDoc {
  filename: string
  filepath: string
  content:  string
  score:    number
}

export interface SearchResult {
  answer:         string
  matched_docs:   MatchedDoc[]
  has_good_match: boolean
  query:          string
}

// Fast search — returns matched docs instantly (no LLM, ~1 second)
export const searchFast = (query: string) =>
  axios.post<SearchResult>(`${BASE}/search-fast`, { query }).then(r => r.data)

// Generate AI answer separately (slow — calls Ollama LLM)
export const generateAnswer = (query: string, context_docs: string[]) =>
  axios.post<{ answer: string }>(`${BASE}/generate-answer`, { query, context_docs })
    .then(r => r.data.answer)

// Full search with answer in one call (original)
export const searchQuery = (query: string) =>
  axios.post<SearchResult>(`${BASE}/search`, { query }).then(r => r.data)

export const uploadQuery = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return axios.post<SearchResult>(`${BASE}/upload-query`, fd).then(r => r.data)
}

export const generateUpdatePreview = (
  query: string, filename: string, filepath: string,
  original_content: string, ai_answer: string
) =>
  axios.post<{ preview: string }>(`${BASE}/generate-update-preview`, {
    query, filename, filepath, original_content, ai_answer
  }).then(r => r.data.preview)

export const saveUpdate = (filepath: string, filename: string, new_content: string) =>
  axios.post(`${BASE}/save-update`, { filepath, filename, new_content }).then(r => r.data)

export const generateNewPagePreview = (query: string, ai_answer: string) =>
  axios.post<{ preview: string }>(`${BASE}/generate-new-page-preview`, { query, ai_answer })
    .then(r => r.data.preview)

export const saveNewPage = (filename: string, content: string) =>
  axios.post(`${BASE}/save-new-page`, { filename, content }).then(r => r.data)
