// API Client for BookScanner
// Centralized API calls with consistent error handling and configuration

import type {
  ScanResult,
  EnrichBooksRequest,
  EnrichBooksResponse,
  HistoryAction,
  HistoryResponse,
  Preferences,
  UpdatePreferencesRequest,
  UpdatePreferencesResponse,
  BookAnalysisRequest,
  BookAnalysisResponse
} from './types'

// Validate and sanitize gateway URL with fallback to same origin
function getGatewayUrl(): string {
  const envUrl = import.meta.env.VITE_GATEWAY_URL

  // If no URL provided, use same origin
  if (!envUrl || envUrl.trim() === '') {
    return ''
  }

  // Validate URL format
  try {
    const url = new URL(envUrl)

    // Only allow http/https protocols for security
    if (!['http:', 'https:'].includes(url.protocol)) {
      if (import.meta.env.DEV) {
        console.warn('Invalid VITE_GATEWAY_URL protocol, falling back to same origin:', url.protocol)
      }
      return ''
    }

    return url.origin
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Invalid VITE_GATEWAY_URL format, falling back to same origin:', envUrl, error)
    }
    return ''
  }
}

const GATEWAY_URL = getGatewayUrl()

// Log the gateway URL being used for debugging
if (import.meta.env.DEV) {
  console.log('API Gateway URL:', GATEWAY_URL || 'same origin (/api)')
}

interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export class APIError extends Error {
  public status: number
  public response?: Response
  public retryAfter?: number
  public serverMessage?: string
  public details?: unknown

  constructor(
    message: string,
    status: number,
    response?: Response,
    retryAfter?: number,
    serverMessage?: string,
    details?: unknown
  ) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.response = response
    this.retryAfter = retryAfter
    this.serverMessage = serverMessage
    this.details = details
  }
}

// Exponential backoff with jitter for retries
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function calculateBackoffDelay(attempt: number, baseDelay: number = 1000, maxDelay: number = 30000): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt)

  // Add jitter: random value between 0.5 and 1.5 of the exponential delay
  const jitter = 0.5 + Math.random() // 0.5 to 1.5

  // Cap at maxDelay
  return Math.min(exponentialDelay * jitter, maxDelay)
}

// Parse error response to extract server messages
async function parseErrorResponse(response: Response): Promise<{ message: string; details?: unknown }> {
  try {
    const contentType = response.headers.get('content-type')

    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json()

      // Try to extract meaningful error message from common error response formats
      if (errorData.message) {
        return { message: errorData.message, details: errorData }
      }
      if (errorData.error) {
        return { message: errorData.error, details: errorData }
      }
      if (errorData.detail) {
        return { message: errorData.detail, details: errorData }
      }
      if (errorData.errors && Array.isArray(errorData.errors)) {
        const errorMessages = errorData.errors.map((e: unknown) => (e as { message?: string })?.message || String(e)).join(', ')
        return { message: errorMessages, details: errorData }
      }

      // If it's a structured error object, stringify it
      return { message: JSON.stringify(errorData), details: errorData }
    }

    // Fallback to text response
    const errorText = await response.text()
    return { message: errorText || 'Unknown error', details: null }
  } catch {
    return { message: 'Failed to parse error response', details: null }
  }
}

// Base fetch wrapper with common configuration and retry logic
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retryAttempt: number = 0
): Promise<T> {
  const url = `${GATEWAY_URL}/api${endpoint}`

  const config: RequestInit = {
    credentials: 'include', // Include cookies for device_id
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, config)

    if (!response.ok) {
      const { message: serverMessage, details } = await parseErrorResponse(response)

      // Special handling for rate limits with exponential backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after')
        const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : undefined

        // Retry with exponential backoff (max 3 attempts)
        if (retryAttempt < 3) {
          const backoffDelay = retrySeconds ? retrySeconds * 1000 : calculateBackoffDelay(retryAttempt)

          if (import.meta.env.DEV) {
            console.warn(`Rate limit hit, retrying in ${Math.round(backoffDelay / 1000)}s (attempt ${retryAttempt + 1}/3)`)
          }
          await delay(backoffDelay)

          return apiFetch<T>(endpoint, options, retryAttempt + 1)
        }

        throw new APIError(
          `Rate limit exceeded after ${retryAttempt + 1} attempts: ${serverMessage}`,
          response.status,
          response,
          retrySeconds,
          serverMessage,
          details
        )
      }

      // For other errors, include server message if available
      const errorMessage = serverMessage
        ? `API request failed: ${response.status} ${response.statusText} - ${serverMessage}`
        : `API request failed: ${response.status} ${response.statusText}`

      throw new APIError(
        errorMessage,
        response.status,
        response,
        undefined,
        serverMessage,
        details
      )
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return response.text() as unknown as T
    }

    return await response.json()
  } catch (error) {
    if (error instanceof APIError) {
      throw error
    }

    // Network or other errors
    throw new APIError(
      `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0
    )
  }
}

// Specialized fetch for file uploads with retry logic
async function apiUpload<T>(
  endpoint: string,
  formData: FormData,
  retryAttempt: number = 0
): Promise<T> {
  const url = `${GATEWAY_URL}/api${endpoint}`

  const config: RequestInit = {
    method: 'POST',
    credentials: 'include',
    body: formData,
    // Don't set Content-Type for FormData - let browser set it with boundary
  }

  try {
    const response = await fetch(url, config)

    if (!response.ok) {
      const { message: serverMessage, details } = await parseErrorResponse(response)

      // Special handling for rate limits with exponential backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after')
        const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : undefined

        // Retry with exponential backoff (max 3 attempts)
        if (retryAttempt < 3) {
          const backoffDelay = retrySeconds ? retrySeconds * 1000 : calculateBackoffDelay(retryAttempt)

          if (import.meta.env.DEV) {
            console.warn(`Upload rate limit hit, retrying in ${Math.round(backoffDelay / 1000)}s (attempt ${retryAttempt + 1}/3)`)
          }
          await delay(backoffDelay)

          return apiUpload<T>(endpoint, formData, retryAttempt + 1)
        }

        throw new APIError(
          `Upload rate limit exceeded after ${retryAttempt + 1} attempts: ${serverMessage}`,
          response.status,
          response,
          retrySeconds,
          serverMessage,
          details
        )
      }

      // For other errors, include server message if available
      const errorMessage = serverMessage
        ? `Upload failed: ${response.status} ${response.statusText} - ${serverMessage}`
        : `Upload failed: ${response.status} ${response.statusText}`

      throw new APIError(
        errorMessage,
        response.status,
        response,
        undefined,
        serverMessage,
        details
      )
    }

    return await response.json()
  } catch (error) {
    if (error instanceof APIError) {
      throw error
    }

    throw new APIError(
      `Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0
    )
  }
}

// API Methods
export const api = {
  // Comprehensive Scan endpoint - upload image and get all detected books with metadata
  async scan(imageFile: File): Promise<ScanResult> {
    const formData = new FormData()
    formData.append('image', imageFile)

    return apiUpload<ScanResult>('/scan', formData)
  },

  // Books enrichment - get metadata for books
  async enrichBooks(books: EnrichBooksRequest['books']): Promise<EnrichBooksResponse> {
    return apiFetch<EnrichBooksResponse>('/books/enrich', {
      method: 'POST',
      body: JSON.stringify(books)
    })
  },

  // History - record book actions
  async addHistory(action: HistoryAction): Promise<HistoryResponse> {
    return apiFetch<HistoryResponse>('/history', {
      method: 'POST',
      body: JSON.stringify(action)
    })
  },

  // Preferences - get/set user preferences
  async getPreferences(): Promise<Preferences> {
    return apiFetch<Preferences>('/preferences')
  },

  async updatePreferences(preferences: UpdatePreferencesRequest): Promise<UpdatePreferencesResponse> {
    return apiFetch<UpdatePreferencesResponse>('/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences)
    })
  },

  // Book Analysis - analyze books against user preferences
  async analyzeBooks(payload: BookAnalysisRequest): Promise<BookAnalysisResponse> {
    return apiFetch<BookAnalysisResponse>('/recommend', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  // Legacy method - now uses the comprehensive scan endpoint
  async getImageRecommendations(imageFile: File) {
    // Use the comprehensive scan endpoint instead
    const scanResult = await this.scan(imageFile)

    // Transform to match the old interface for backward compatibility
    return {
      success: scanResult.success,
      image_analysis: {
        books_detected: scanResult.total_text_regions,
        books_analyzed: scanResult.books_detected,
        recommendations_generated: scanResult.books_detected
      },
      recommendation_message: `Found ${scanResult.books_detected} books in your image!`,
      relevant_books: scanResult.books.map(book => ({
        title: book.title,
        author: book.author,
        cover_url: book.cover_url,
        year: book.year,
        publisher: book.publisher,
        relevance_score: 1,
        reasons: ["Detected in your image"]
      })),
      ai_recommendations: scanResult.books.map(book => ({
        title: book.title,
        author: book.author,
        cover_url: book.cover_url,
        year: book.year,
        publisher: book.publisher,
        reason: `Based on your reading preferences, this book looks interesting.`
      }))
    }
  },

  // Legacy method - now uses the comprehensive scan endpoint
  async detectBooksFromImage(imageFile: File) {
    // Use the comprehensive scan endpoint instead
    const scanResult = await this.scan(imageFile)

    // Transform to match the old interface for backward compatibility
    return {
      success: scanResult.success,
      books_detected: scanResult.total_text_regions,
      books_enriched: scanResult.books_detected,
      detected_books: scanResult.books.map(book => ({
        title: book.title,
        author: book.author,
        cover_url: book.cover_url,
        year: book.year,
        publisher: book.publisher,
        subjects: book.subjects,
        isbn: book.isbn
      }))
    }
  },

  // Smart Recommendations - Step 5: Generate recommendations using the unified /recommend endpoint
  async generateSmartRecommendations(payload: {
    detected_books: Array<{
      title: string
      author?: string
      cover_url?: string
      year?: number
      publisher?: string
      subjects?: string[]
      isbn?: string
    }>
    user_genres: string[]
    user_authors: string[]
    user_languages: string[]
  }) {
    // Use the unified analyzeBooks method instead of the separate endpoint
    const result = await this.analyzeBooks({
      books: payload.detected_books.map(book => ({
        title: book.title,
        author: book.author,
        subjects: book.subjects || [],
        year: book.year,
        publisher: book.publisher,
        isbn: book.isbn
      })),
      user_preferences: {
        genres: payload.user_genres,
        authors: payload.user_authors,
        languages: payload.user_languages
      }
    })

    // Transform the response to match the expected interface
    return {
      success: result.success,
      total_books_analyzed: result.total_books_analyzed,
      recommendations_generated: result.book_scores.length,
      recommendation_message: `Analyzed ${result.total_books_analyzed} books with ${result.analysis_summary.perfect_matches} perfect matches`,
      recommendations: result.book_scores.map(score => ({
        title: score.title,
        author: score.author,
        cover_url: score.cover_url,
        year: undefined,
        publisher: undefined,
        subjects: [],
        reason: score.recommendation,
        relevance_score: score.score,
        match_quality: score.match_quality as 'perfect' | 'good' | 'fair' | 'poor',
        is_perfect_match: score.is_perfect_match
      })),
      user_preferences: {
        genres: payload.user_genres,
        authors: payload.user_authors,
        languages: payload.user_languages
      }
    }
  }
}

// Export error class for error handling

// Type exports
export type {
  APIResponse
}
