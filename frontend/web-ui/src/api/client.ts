// API Client for BookScanner
// Centralized API calls with consistent error handling and configuration

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || ''

interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export class APIError extends Error {
  public status: number
  public response?: Response
  public retryAfter?: number

  constructor(
    message: string,
    status: number,
    response?: Response,
    retryAfter?: number
  ) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.response = response
    this.retryAfter = retryAfter
  }
}

// Base fetch wrapper with common configuration
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
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
      const errorText = await response.text().catch(() => 'Unknown error')

      // Special handling for rate limits
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after')
        const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : undefined
        throw new APIError(
          `Rate limit exceeded - ${errorText}`,
          response.status,
          response,
          retrySeconds
        )
      }

      throw new APIError(
        `API request failed: ${response.status} ${response.statusText} - ${errorText}`,
        response.status,
        response
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

// Specialized fetch for file uploads
async function apiUpload<T>(
  endpoint: string,
  formData: FormData
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
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new APIError(
        `Upload failed: ${response.status} ${response.statusText} - ${errorText}`,
        response.status,
        response
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
  async scan(imageFile: File) {
    const formData = new FormData()
    formData.append('image', imageFile)

    return apiUpload<{
      success: boolean
      total_text_regions: number
      books_detected: number
      books: Array<{
        title: string
        author?: string
        cover_url?: string
        year?: number
        publisher?: string
        subjects?: string[]
        isbn?: string
        original_text: string
        bbox?: { x: number; y: number; w: number; h: number } | null
      }>
      debug_raw_vision?: Array<{
        raw_text: string
        bbox?: { x: number; y: number; w: number; h: number } | null
      }>
    }>('/scan', formData)
  },

  // Books enrichment - get metadata for books
  async enrichBooks(books: Array<{
    title: string
    author?: string
    isbn?: string
  }>) {
    return apiFetch<{
      books: Array<{
        title: string
        author?: string
        isbn?: string
        cover_url?: string
        publisher?: string
        year?: number
        subjects?: string[]
        fingerprint: string
      }>
    }>('/books/enrich', {
      method: 'POST',
      body: JSON.stringify(books)
    })
  },

  // History - record book actions
  async addHistory(action: {
    book_id: number
    action: 'saved' | 'removed'
  }) {
    return apiFetch<{ success: boolean }>('/history', {
      method: 'POST',
      body: JSON.stringify(action)
    })
  },

  // Preferences - get/set user preferences
  async getPreferences() {
    return apiFetch<{
      genres: string[]
      authors: string[]
      languages: string[]
    }>('/preferences')
  },

  async updatePreferences(preferences: {
    genres?: string[]
    authors?: string[]
    languages?: string[]
    groqEnabled?: boolean
  }) {
    return apiFetch<{ success: boolean }>('/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences)
    })
  },

  // Book Analysis - analyze books against user preferences
  async analyzeBooks(payload: {
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
  }) {
    return apiFetch<{
      success: boolean
      total_books_analyzed: number
      book_scores: Array<{
        title: string
        author?: string
        score: number
        recommendation: string
        match_quality: string
        is_perfect_match: boolean
        reasoning: string
      }>
      analysis_summary: {
        perfect_matches: number
        average_score: number
        highest_score: number
      }
      cached: boolean
      cache_hit_count: number
    }>('/recommend', {
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
        cover_url: undefined, // We'll need to get this from metadata
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
