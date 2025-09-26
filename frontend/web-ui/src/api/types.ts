// API Types for BookScanner
// Centralized type definitions for all API responses and requests

export interface ScanBook {
  bbox: unknown
  original_text?: string
  title: string
  author?: string
  isbn?: string
  cover_url?: string
  publisher?: string
  year?: number
  subjects?: string[]
}

export interface ScanResult {
  success: boolean
  total_text_regions: number
  books_detected: number
  books: ScanBook[]
  model_used: 'groq' | 'gcv' | 'cached' | string
  debug_raw_vision?: Array<{
    raw_text: string
    bbox?: { x: number; y: number; w: number; h: number } | null
  }>
}

export interface EnrichedBook {
  title: string
  author?: string
  isbn?: string
  cover_url?: string
  publisher?: string
  year?: number
  subjects?: string[]
  fingerprint: string
}

export interface EnrichBooksRequest {
  books: Array<{
    title: string
    author?: string
    isbn?: string
  }>
}

export interface EnrichBooksResponse {
  books: EnrichedBook[]
}

export interface HistoryAction {
  book_id: number
  action: 'saved' | 'removed'
}

export interface HistoryResponse {
  success: boolean
}

export interface Preferences {
  genres: string[]
  authors: string[]
  languages: string[]
}

export interface UpdatePreferencesRequest {
  genres?: string[]
  authors?: string[]
  languages?: string[]
  groqEnabled?: boolean
}

export interface UpdatePreferencesResponse {
  success: boolean
}

export interface BookAnalysisRequest {
  books: Array<{
    title: string
    author?: string
    subjects?: string[]
    year?: number
    publisher?: string
    isbn?: string
  }>
  user_preferences?: {
    genres?: string[]
    authors?: string[]
    languages?: string[]
  }
}

export interface BookScore {
  title: string
  author?: string
  cover_url?: string
  score: number
  recommendation: string
  match_quality: string
  is_perfect_match: boolean
  reasoning: string
}

export interface AnalysisSummary {
  perfect_matches: number
  average_score: number
  highest_score: number
}

export interface BookAnalysisResponse {
  success: boolean
  total_books_analyzed: number
  book_scores: BookScore[]
  analysis_summary: AnalysisSummary
  cached: boolean
  cache_hit_count: number
}

// Model label mapping
export const MODEL_LABEL: Record<string, string> = {
  groq: 'Groq Vision',
  gcv: 'Google Vision + NVIDIA NIM',
  cached: 'Cached Results'
}

// Helper function to get model label
export function getModelLabel(modelUsed: string): string {
  return MODEL_LABEL[modelUsed] ?? 'AI Model'
}
