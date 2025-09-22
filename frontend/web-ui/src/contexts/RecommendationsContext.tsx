// Recommendations Context for managing short-lived navigation data
// Replaces localStorage usage for better data flow and performance

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { BookAnalysisResponse } from '../api/types'

interface RecommendationsData {
  book_scores: BookAnalysisResponse['book_scores']
  analysis_summary: BookAnalysisResponse['analysis_summary']
  total_books_analyzed: number
  cached: boolean
  cache_hit_count: number
}

interface RecommendationsContextType {
  recommendationsData: RecommendationsData | null
  setRecommendationsData: (data: RecommendationsData) => void
  clearRecommendationsData: () => void
  hasRecommendations: boolean
}

const RecommendationsContext = createContext<RecommendationsContextType | undefined>(undefined)

interface RecommendationsProviderProps {
  children: ReactNode
}

export function RecommendationsProvider({ children }: RecommendationsProviderProps) {
  const [recommendationsData, setRecommendationsDataState] = useState<RecommendationsData | null>(null)

  const setRecommendationsData = useCallback((data: RecommendationsData) => {
    if (import.meta.env.DEV) {
      console.log('Recommendations data set in context:', data)
    }
    setRecommendationsDataState(data)
  }, [])

  const clearRecommendationsData = useCallback(() => {
    if (import.meta.env.DEV) {
      console.log('Recommendations data cleared from context')
    }
    setRecommendationsDataState(null)
  }, [])

  const hasRecommendations = recommendationsData !== null

  const value: RecommendationsContextType = {
    recommendationsData,
    setRecommendationsData,
    clearRecommendationsData,
    hasRecommendations
  }

  return (
    <RecommendationsContext.Provider value={value}>
      {children}
    </RecommendationsContext.Provider>
  )
}

export function useRecommendations(): RecommendationsContextType {
  const context = useContext(RecommendationsContext)
  if (context === undefined) {
    throw new Error('useRecommendations must be used within a RecommendationsProvider')
  }
  return context
}

// Hook for easy access to recommendations data
export function useRecommendationsData() {
  const { recommendationsData, hasRecommendations } = useRecommendations()

  return {
    data: recommendationsData,
    hasData: hasRecommendations,
    bookScores: recommendationsData?.book_scores || [],
    analysisSummary: recommendationsData?.analysis_summary,
    totalBooksAnalyzed: recommendationsData?.total_books_analyzed || 0,
    isCached: recommendationsData?.cached || false,
    cacheHitCount: recommendationsData?.cache_hit_count || 0
  }
}
