import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload,
  Brain,
  Eye,
  Sparkles,
  BookOpen,
  Loader2,
  CheckCircle2,
  Settings,
  Heart,
  Star,
  ArrowRight,
  Plus,
  Camera,
  Image as ImageIcon,
  Globe
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useToast } from '../contexts/ToastContext'
import { api } from '../api/client'

type FlowStep = 'start' | 'preferences' | 'upload' | 'detected-books' | 'recommendations'

interface DetectedBook {
  title: string
  author?: string
  cover_url?: string
  year?: number
  publisher?: string
  subjects?: string[]
  isbn?: string
  relevance_score: number
  reasons: string[]
}

interface AIRecommendation {
  title: string
  author?: string
  cover_url?: string
  year?: number
  publisher?: string
  subjects?: string[]
  reason?: string
  relevance_score?: number
  match_quality?: 'perfect' | 'good' | 'fair' | 'poor'
  is_perfect_match?: boolean
}

interface UserPreferences {
  genres: string[]
  authors: string[]
  languages: string[]
}

export function ImageRecommendPage() {
  const [currentStep, setCurrentStep] = useState<FlowStep>('start')
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{
    stage: string
    progress: number
    message: string
  } | null>(null)
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    genres: [],
    authors: [],
    languages: []
  })
  const [detectedBooks, setDetectedBooks] = useState<DetectedBook[]>([])
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [newAuthor, setNewAuthor] = useState('')
  const navigate = useNavigate()
  const toast = useToast()

  // Load saved preferences when component mounts
  useEffect(() => {
    const loadSavedPreferences = async () => {
      try {
        const savedPrefs = await api.getPreferences()
        if (savedPrefs.genres.length > 0 || savedPrefs.authors.length > 0 || savedPrefs.languages.length > 0) {
          setUserPreferences({
            genres: savedPrefs.genres || [],
            authors: savedPrefs.authors || [],
            languages: savedPrefs.languages || []
          })
        }
      } catch (error) {
        console.log('No saved preferences found or error loading:', error)
      }
    }

    loadSavedPreferences()
  }, [])

  // Load preferences when entering preferences step
  const handleStartPreferences = useCallback(async () => {
    try {
      const savedPrefs = await api.getPreferences()
      setUserPreferences({
        genres: savedPrefs.genres || [],
        authors: savedPrefs.authors || [],
        languages: savedPrefs.languages || []
      })
    } catch (error) {
      console.log('No saved preferences found:', error)
    }
    setCurrentStep('preferences')
  }, [])

  const availableGenres = [
    'Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Science Fiction',
    'Fantasy', 'Biography', 'History', 'Self-Help', 'Business',
    'Mathematics', 'Science', 'Philosophy', 'Literature', 'Poetry'
  ]

  // Step 2: Save preferences to database
  const savePreferences = useCallback(async () => {
    if (userPreferences.genres.length === 0) {
      toast.error('Please select at least one genre')
      return
    }

    try {
      await api.updatePreferences({
        genres: userPreferences.genres,
        authors: userPreferences.authors,
        languages: userPreferences.languages
      })
      toast.success('Preferences saved!')
      setCurrentStep('upload')
    } catch (error) {
      console.error('Failed to save preferences:', error)
      toast.error('Failed to save preferences. Please try again.')
    }
  }, [userPreferences, toast])

  // Step 3: Handle image upload and book detection
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select a valid image file')
      return
    }

    setIsUploading(true)

    try {
      // Show image preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      setUploadProgress({
        stage: 'upload',
        progress: 0,
        message: 'Uploading image for book detection...'
      })

      // Simulate upload progress
      for (let i = 0; i <= 100; i += 20) {
        setUploadProgress(prev => prev ? { ...prev, progress: i } : null)
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      setUploadProgress({
        stage: 'analyze',
        progress: 0,
        message: 'AI identifying books in your image...'
      })

      // Call the comprehensive scan API directly (Step 3)
      const result = await api.scan(file)

      // Transform detected books to match our interface
      const transformedBooks: DetectedBook[] = result.books.map(book => ({
        title: book.title,
        author: book.author,
        cover_url: book.cover_url,
        year: book.year,
        publisher: book.publisher,
        subjects: book.subjects,
        isbn: book.isbn,
        relevance_score: 1, // Will be calculated in recommendation step
        reasons: ["Detected in your image"]
      }))

      setDetectedBooks(transformedBooks)
      setCurrentStep('detected-books')

      toast.success(`Found ${result.books_detected} books in your image!`)

    } catch (error) {
      console.error('Book detection failed:', error)
      toast.error('Failed to detect books. Please try again.')
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }, [toast])

  // Step 5: Generate recommendations based on detected books and preferences
  const generateRecommendations = useCallback(async () => {
    setIsAnalyzing(true)

    try {
      setUploadProgress({
        stage: 'recommend',
        progress: 0,
        message: 'AI analyzing your taste and detected books...'
      })

      // Simulate recommendation generation
      for (let i = 0; i <= 100; i += 33) {
        setUploadProgress(prev => prev ? { ...prev, progress: i } : null)
        await new Promise(resolve => setTimeout(resolve, 250))
      }

      // Call the new API to generate smart recommendations (Step 5)
      const result = await api.generateSmartRecommendations({
        detected_books: detectedBooks.map(book => ({
          title: book.title,
          author: book.author,
          cover_url: book.cover_url,
          year: book.year,
          publisher: book.publisher,
          subjects: book.subjects || [],
          isbn: book.isbn
        })),
        user_genres: userPreferences.genres,
        user_authors: userPreferences.authors,
        user_languages: userPreferences.languages
      })

      // Transform API recommendations to our interface
      const transformedRecommendations: AIRecommendation[] = result.recommendations.map(rec => ({
        title: rec.title,
        author: rec.author,
        cover_url: rec.cover_url,
        year: rec.year,
        publisher: rec.publisher,
        subjects: rec.subjects,
        reason: rec.reason,
        relevance_score: rec.relevance_score,
        match_quality: rec.match_quality,
        is_perfect_match: rec.is_perfect_match
      }))

      setRecommendations(transformedRecommendations)
      setCurrentStep('recommendations')
      toast.success('Recommendations generated!')

    } catch (error) {
      console.error('Recommendation generation failed:', error)
      toast.error('Failed to generate recommendations. Please try again.')
    } finally {
      setIsAnalyzing(false)
      setUploadProgress(null)
    }
  }, [detectedBooks, userPreferences, toast])

  const addGenre = (genre: string) => {
    if (!userPreferences.genres.includes(genre)) {
      setUserPreferences(prev => ({
        ...prev,
        genres: [...prev.genres, genre]
      }))
    }
  }

  const removeGenre = (genre: string) => {
    setUserPreferences(prev => ({
      ...prev,
      genres: prev.genres.filter(g => g !== genre)
    }))
  }

  const addAuthor = () => {
    if (newAuthor.trim() && !userPreferences.authors.includes(newAuthor.trim())) {
      setUserPreferences(prev => ({
        ...prev,
        authors: [...prev.authors, newAuthor.trim()]
      }))
      setNewAuthor('')
    }
  }

  const removeAuthor = (author: string) => {
    setUserPreferences(prev => ({
      ...prev,
      authors: prev.authors.filter(a => a !== author)
    }))
  }

  const toggleLanguage = (language: string) => {
    setUserPreferences(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }))
  }

  // Step 1: Start Screen
  if (currentStep === 'start') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Smart Book Discovery</span>
            </div>

            <h1 className="text-5xl font-bold bg-gradient-to-r from-foreground via-primary to-blue-600 bg-clip-text text-transparent mb-6">
              Discover Your Perfect Books
            </h1>

            <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
              Upload a photo of your bookshelf and get AI-powered recommendations based on your personal reading preferences
            </p>

            <Button
              size="lg"
              className="gap-3 px-12 py-6 text-lg font-semibold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                onClick={handleStartPreferences}
            >
              <ArrowRight className="h-6 w-6" />
              Start Discovery Process
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Set Preferences
  if (currentStep === 'preferences') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Settings className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Step 2 of 6</span>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-blue-600 bg-clip-text text-transparent mb-4">
                Set Preferences
              </h1>
              <p className="text-lg text-muted-foreground">
                Tell us about your reading interests and preferences to improve recommendations.
              </p>
            </div>

            <Card className="border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm mb-8">
              <CardContent className="p-8">
                {/* Genres Selection */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    Favorite Genres
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                    {availableGenres.map((genre) => (
                      <Button
                        key={genre}
                        variant={userPreferences.genres.includes(genre) ? "primary" : "outline"}
                        size="sm"
                        className="justify-start"
                        onClick={() => userPreferences.genres.includes(genre) ? removeGenre(genre) : addGenre(genre)}
                      >
                        {genre}
                      </Button>
                    ))}
                  </div>
                  {userPreferences.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm text-muted-foreground">Selected:</span>
                      {userPreferences.genres.map((genre) => (
                        <Badge key={genre} variant="secondary" className="gap-1">
                          {genre}
                          <button
                            onClick={() => removeGenre(genre)}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Authors Selection */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Favorite Authors
                  </h3>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Enter author name..."
                      value={newAuthor}
                      onChange={(e) => setNewAuthor(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addAuthor()}
                      className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    />
                    <Button onClick={addAuthor} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {userPreferences.authors.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm text-muted-foreground">Your authors:</span>
                      {userPreferences.authors.map((author) => (
                        <Badge key={author} variant="secondary" className="gap-1">
                          {author}
                          <button
                            onClick={() => removeAuthor(author)}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Languages Selection */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-500" />
                    Preferred Languages
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Chinese', 'Japanese', 'Arabic'].map((language) => (
                      <Button
                        key={language}
                        variant={userPreferences.languages.includes(language) ? "primary" : "outline"}
                        size="sm"
                        className="justify-start"
                        onClick={() => toggleLanguage(language)}
                      >
                        {language}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button
                    size="lg"
                    className="gap-3 px-8 py-4"
                    onClick={savePreferences}
                    disabled={userPreferences.genres.length === 0}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Save Preferences & Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Step 3: Upload Photo
  if (currentStep === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Camera className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Step 3 of 6</span>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-blue-600 bg-clip-text text-transparent mb-4">
                Upload Photo
              </h1>
              <p className="text-lg text-muted-foreground">
                Take a photo of an entire bookshelf and our AI will identify each book.
              </p>
            </div>

            <Card className="border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm">
              <CardContent className="p-12">
                {isUploading ? (
                  <div className="text-center space-y-6">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center">
                      <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-2">
                        {uploadProgress?.stage === 'upload' && 'Uploading Image...'}
                        {uploadProgress?.stage === 'analyze' && 'AI Identifying Books...'}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {uploadProgress?.message}
                      </p>

                      <div className="w-full bg-muted/30 rounded-full h-2 mb-4">
                        <div
                          className="bg-gradient-to-r from-primary to-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress?.progress || 0}%` }}
                        />
                      </div>

                      <div className="text-sm text-muted-foreground">
                        {uploadProgress?.progress || 0}% Complete
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5"
                    onDrop={(e) => {
                      e.preventDefault()
                      const files = Array.from(e.dataTransfer.files)
                      if (files.length > 0) handleFileSelect(files[0])
                    }}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <div className="space-y-6">
                      <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center">
                        <ImageIcon className="h-10 w-10 text-primary" />
                      </div>

                      <div>
                        <h3 className="text-2xl font-bold text-foreground mb-2">
                          Upload Bookshelf Photo
                        </h3>
                        <p className="text-muted-foreground mb-6">
                          Drag and drop an image of your bookshelf, or click to browse
                        </p>

                        <Button
                          size="lg"
                          className="gap-3"
                          onClick={() => {
                            const input = document.createElement('input')
                            input.type = 'file'
                            input.accept = 'image/*'
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0]
                              if (file) handleFileSelect(file)
                            }
                            input.click()
                          }}
                        >
                          <Upload className="h-5 w-5" />
                          Choose Image
                        </Button>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        Supports JPG, PNG, and other image formats
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Step 4: Show Detected Books
  if (currentStep === 'detected-books') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Eye className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Step 4 of 6</span>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-blue-600 bg-clip-text text-transparent mb-4">
                Detected Books
              </h1>
              <p className="text-lg text-muted-foreground">
                Here are the books our AI identified in your image. Ready to get personalized recommendations?
              </p>
            </div>

            {/* Show uploaded image */}
            {selectedImage && (
              <Card className="border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm mb-8">
                <CardContent className="p-6">
                  <div className="text-center">
                    <img src={selectedImage} alt="Your bookshelf" className="max-h-60 mx-auto rounded-lg border border-border" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detected books grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {detectedBooks.map((book, index) => (
                <Card key={index} className="group border border-border/50 hover:border-primary/50 bg-gradient-to-br from-card/80 to-muted/20 hover:scale-105 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="w-16 h-22 rounded-lg overflow-hidden bg-gradient-to-br from-muted/30 to-primary/10 flex-shrink-0">
                        {book.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt={book.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base text-foreground line-clamp-2 mb-1">
                          {book.title}
                        </h3>
                        {book.author && (
                          <p className="text-sm text-muted-foreground mb-2">
                            by {book.author}
                          </p>
                        )}

                        {book.year && (
                          <Badge variant="outline" className="text-xs">
                            {book.year}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Button
                size="lg"
                className="gap-3 px-8 py-4 text-lg font-semibold bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-500/90 hover:to-pink-600/90 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                onClick={generateRecommendations}
                disabled={detectedBooks.length === 0}
              >
                <Sparkles className="h-5 w-5" />
                Get Recommendations
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step 6: Show Recommendations
  if (currentStep === 'recommendations') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Step 6 of 6 - Complete!</span>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-blue-600 bg-clip-text text-transparent mb-4">
                Your Personalized Recommendations
              </h1>
              <p className="text-lg text-muted-foreground">
                Discover which books from your image best match your taste with our AI-powered recommendations.
              </p>
            </div>

            {isAnalyzing && (
              <Card className="border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm mb-8">
                <CardContent className="p-8">
                  <div className="text-center space-y-6">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center">
                      <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-2">
                        Generating Recommendations...
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {uploadProgress?.message}
                      </p>

                      <div className="w-full bg-muted/30 rounded-full h-2 mb-4">
                        <div
                          className="bg-gradient-to-r from-primary to-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress?.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isAnalyzing && recommendations.length > 0 && (
              <>
                <Card className="border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm mb-8">
                  <CardContent className="p-8">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Brain className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-foreground mb-2">AI Analysis Complete</h2>
                        <p className="text-muted-foreground leading-relaxed">
                          Based on your preferences for <strong>{userPreferences.genres.join(', ')}</strong>,
                          here are the books from your image that best match your taste:
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Enhanced Recommendations with Smart Highlighting */}
                <div className="space-y-4 mb-8">
                  {recommendations.map((rec, index) => {
                    const isPerfectMatch = rec.is_perfect_match || rec.match_quality === 'perfect'
                    const isGoodMatch = rec.match_quality === 'good'

                    return (
                      <Card
                        key={index}
                        className={`group transition-all duration-300 hover:scale-[1.02] ${
                          isPerfectMatch
                            ? 'border-2 border-green-500/60 bg-gradient-to-r from-green-50/50 via-card to-green-50/30 dark:from-green-900/20 dark:via-card dark:to-green-900/10 shadow-green-200/20 shadow-lg'
                            : isGoodMatch
                            ? 'border border-blue-300/50 bg-gradient-to-r from-blue-50/30 via-card to-blue-50/20 dark:from-blue-900/10 dark:via-card dark:to-blue-900/5'
                            : 'border border-border/50 hover:border-primary/50 bg-gradient-to-br from-card/80 to-muted/20'
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {/* Compact Book Cover */}
                            <div className="flex-shrink-0 w-20 h-28 relative rounded-lg overflow-hidden bg-gradient-to-br from-purple-100 via-blue-100 to-primary/10 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-primary/10">
                              {rec.cover_url ? (
                                <img
                                  src={rec.cover_url}
                                  alt={rec.title}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <BookOpen className="h-6 w-6 text-muted-foreground/50" />
                                </div>
                              )}

                              {/* Perfect Match Badge */}
                              {isPerfectMatch && (
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                  <span className="text-white text-xs font-bold">✓</span>
                                </div>
                              )}
                            </div>

                            {/* Book Info */}
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-bold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                    {rec.title}
                                  </h3>
                                  {rec.author && (
                                    <p className="text-sm text-muted-foreground font-medium mt-1">
                                      by {rec.author}
                                    </p>
                                  )}

                                  {/* Match Quality & Score */}
                                  <div className="flex items-center gap-2 mt-2">
                                    {isPerfectMatch && (
                                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">
                                        🎯 Perfect Match
                                      </Badge>
                                    )}
                                    {isGoodMatch && !isPerfectMatch && (
                                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs">
                                        📖 Great Fit
                                      </Badge>
                                    )}
                                    {rec.relevance_score !== undefined && (
                                      <span className="text-xs text-muted-foreground">
                                        Score: {rec.relevance_score}/10
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {rec.year && (
                                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                    {rec.year}
                                  </span>
                                )}
                              </div>

                              {/* AI Recommendation Reason */}
                              {rec.reason && (
                                <div className={`rounded-lg p-3 border ${
                                  isPerfectMatch
                                    ? 'bg-green-50/50 border-green-200/50 dark:bg-green-900/10 dark:border-green-800/30'
                                    : isGoodMatch
                                    ? 'bg-blue-50/50 border-blue-200/50 dark:bg-blue-900/10 dark:border-blue-800/30'
                                    : 'bg-muted/50 border-border/30'
                                }`}>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    {rec.reason}
                                  </p>
                                </div>
                              )}

                              {/* Subjects/Genres */}
                              {rec.subjects && rec.subjects.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {rec.subjects.slice(0, 3).map((subject, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {subject}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="gap-3"
                onClick={() => {
                  setCurrentStep('start')
                  setDetectedBooks([])
                  setRecommendations([])
                  setSelectedImage(null)
                  setUserPreferences({ genres: [], authors: [], languages: [] })
                }}
              >
                <Camera className="h-5 w-5" />
                Analyze Another Bookshelf
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-3"
                onClick={() => navigate('/recommendations')}
              >
                <Sparkles className="h-5 w-5" />
                View All Recommendations
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
