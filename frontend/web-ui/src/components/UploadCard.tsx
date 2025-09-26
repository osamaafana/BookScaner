import React, { memo, useState } from 'react'
import { Upload, Brain, Zap, Camera, Settings, BookOpen, Globe } from 'lucide-react'
import { Button } from './ui/Button'
import { Card, CardContent } from './ui/Card'
import { cn } from '../lib/utils'

interface UploadCardProps {
  dragOver: boolean
  isUploading: boolean
  onFileSelect: () => void
  onStartCamera: () => void
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  cameraButtonRef?: React.RefObject<HTMLButtonElement | null>
  showPreferencesMode?: boolean
  onPreferencesSubmit?: (genres: string[], languages: string[]) => void
}


export const UploadCard = memo<UploadCardProps>(({
  dragOver,
  isUploading,
  onFileSelect,
  onStartCamera,
  onDrop,
  onDragOver,
  onDragLeave,
  onKeyDown,
  cameraButtonRef,
  showPreferencesMode = false,
  onPreferencesSubmit
}) => {
  // State for preferences selection
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])

  // Don't render anything when uploading
  if (isUploading) return null

  // Expanded genres and languages for comprehensive preferences
  const availableGenres = [
    'Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Science Fiction', 'Fantasy',
    'Thriller', 'Horror', 'Biography', 'History', 'Self-Help', 'Business',
    'Technology', 'Health', 'Travel', 'Cooking', 'Art', 'Music',
    'Philosophy', 'Religion', 'Poetry', 'Drama', 'Adventure', 'Comedy'
  ]

  const availableLanguages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳' }
  ]

  // Handle genre selection
  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    )
  }

  // Handle language selection
  const toggleLanguage = (languageCode: string) => {
    setSelectedLanguages(prev =>
      prev.includes(languageCode)
        ? prev.filter(l => l !== languageCode)
        : [...prev, languageCode]
    )
  }

  // Handle preferences submission
  const handlePreferencesSubmit = () => {
    if (onPreferencesSubmit && selectedGenres.length > 0 && selectedLanguages.length > 0) {
      onPreferencesSubmit(selectedGenres, selectedLanguages)
    }
  }

  return (
    <div className="w-full mx-auto">
      <Card className={cn(
        "relative overflow-hidden transition-all duration-700",
        showPreferencesMode
          ? "bg-gradient-to-br from-card/95 via-card to-primary/5 border-primary/30"
          : "bg-gradient-to-br from-card/90 via-card to-primary/10 border-2 backdrop-blur-sm",
        dragOver
          ? "border-primary bg-gradient-to-br from-primary/20 to-blue-500/20 scale-[1.02] shadow-2xl shadow-primary/25"
          : showPreferencesMode
            ? "border-primary/30 hover:border-primary/60"
            : "border-border/50 hover:border-primary/60 hover:shadow-xl",
        isUploading && "border-primary shadow-2xl shadow-primary/30"
      )}>
        {/* Animated border effect */}
        {(dragOver || isUploading) && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary via-blue-500 to-purple-500 p-[2px]">
            <div className="w-full h-full rounded-lg bg-card"></div>
          </div>
        )}

        <CardContent className="p-6 relative z-10">
          {showPreferencesMode ? (
            // Compact Preferences Selection Mode
            <div className="space-y-6">
              {/* Compact Header */}
              <div className="text-center space-y-2">
                <div className="relative mx-auto w-16 h-16">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center border border-primary/30">
                    <Settings className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                  Setup Preferences
                </h2>
                <p className="text-sm text-muted-foreground">
                  Choose your preferences for better recommendations
                </p>
              </div>

              {/* Compact Genres Selection */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Genres
                </h3>
                <div className="flex flex-wrap gap-2">
                  {availableGenres.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={cn(
                        "px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200",
                        selectedGenres.includes(genre)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card/50 border-border hover:bg-card hover:border-primary/50"
                      )}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compact Languages Selection */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Languages
                </h3>
                <div className="flex flex-wrap gap-2">
                  {availableLanguages.map((language) => (
                    <button
                      key={language.code}
                      onClick={() => toggleLanguage(language.code)}
                      className={cn(
                        "px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200 flex items-center gap-1",
                        selectedLanguages.includes(language.code)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card/50 border-border hover:bg-card hover:border-primary/50"
                      )}
                    >
                      <span>{language.flag}</span>
                      {language.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compact Submit Button */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-center">
                  <Button
                    size="md"
                    className="gap-2 px-6 py-2 text-sm font-semibold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md hover:shadow-lg transition-all duration-300"
                    onClick={handlePreferencesSubmit}
                    disabled={selectedGenres.length === 0 || selectedLanguages.length === 0}
                  >
                    <Brain className="h-4 w-4" />
                    Continue
                  </Button>
                </div>
                {selectedGenres.length === 0 || selectedLanguages.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center">
                    Select at least one genre and one language to continue
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            // Upload Interface Mode
            <div
              className="text-center cursor-pointer group"
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={onFileSelect}
              role="button"
              tabIndex={0}
              onKeyDown={onKeyDown}
            >
              <div className="space-y-6">
                {/* Enhanced Upload Icon */}
                <div className="relative mx-auto w-24 h-24">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-blue-500/20 animate-pulse"></div>
                  <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/10 to-transparent"></div>
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center border-2 border-primary/30 group-hover:scale-110 transition-all duration-500">
                    <div className="relative">
                      <Upload className="h-12 w-12 text-primary group-hover:text-blue-400 transition-colors" />
                      <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center opacity-80">
                        <Brain className="h-2.5 w-2.5 text-white animate-pulse" />
                      </div>
                    </div>
                  </div>
                  {/* Floating particles */}
                  <div className="absolute top-8 right-4 w-2 h-2 bg-blue-400/60 rounded-full animate-bounce"></div>
                  <div className="absolute bottom-8 left-4 w-1.5 h-1.5 bg-purple-400/60 rounded-full animate-ping"></div>
                </div>

                {/* Enhanced Text */}
                <div className="space-y-3">
                  <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                    Upload Your Bookshelf Image
                  </h2>
                </div>

                {/* Enhanced Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    size="md"
                    className="gap-2 px-6 py-3 text-sm font-semibold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300"
                    onClick={(e) => { e.stopPropagation(); onFileSelect() }}
                  >
                    <Upload className="h-4 w-4" />
                    AI Scanner
                  </Button>
                  <Button
                    ref={cameraButtonRef}
                    variant="outline"
                    size="md"
                    className="gap-2 px-6 py-3 text-sm font-semibold border-2 border-primary/40 hover:border-primary hover:bg-primary/10 hover:scale-105 transition-all duration-300"
                    onClick={(e) => { e.stopPropagation(); onStartCamera() }}
                  >
                    <Camera className="h-4 w-4" />
                    Live Capture
                  </Button>
                </div>

                {/* Compact File Info */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                      <span>JPG, PNG, WebP</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-blue-400" />
                      <span>Auto-optimize</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Brain className="h-3 w-3 text-purple-400" />
                      <span>AI Powered</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
})

UploadCard.displayName = 'UploadCard'
