// store.ts — simple in-memory store for dynamically published pages
// In a real app this would be a backend DB call
import type { ConfluencePage } from './types'

const _published: ConfluencePage[] = []

export function getPublishedPages(): ConfluencePage[] {
  return _published
}

export function publishPage(page: ConfluencePage): void {
  _published.unshift(page)   // newest first
}
