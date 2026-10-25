import React, { memo, useState } from 'react'
import { Camera, BookOpen, Globe, ScanLine, ImageUp, ArrowRight } from 'lucide-react'
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
  cardRef?: React.RefObject<HTMLDivElement | null>
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
  onPreferencesSubmit,
  cardRef
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

  const chipClass = (selected: boolean) =>
    cn(
      'min-h-[40px] px-3.5 rounded-full border text-sm font-medium transition-colors',
      selected
        ? 'bg-primary text-primary-foreground border-primary'
        : 'bg-card border-border text-foreground hover:border-primary/60 hover:bg-accent'
    )

  return (
    <div className="w-full mx-auto">
      <Card
        ref={cardRef}
        className={cn(
          'relative overflow-hidden transition-colors',
          !showPreferencesMode && 'border-2 border-dashed',
          dragOver ? 'border-primary bg-accent' : 'border-border'
        )}
      >
        <CardContent className="p-6 md:p-8">
          {showPreferencesMode ? (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-foreground">What do you like to read?</h2>
                <p className="text-sm text-muted-foreground">
                  Pick a few genres and languages so your picks match your taste. You can change this later.
                </p>
              </div>

              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
                  Genres
                </legend>
                <div className="flex flex-wrap gap-2">
                  {availableGenres.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      aria-pressed={selectedGenres.includes(genre)}
                      onClick={() => toggleGenre(genre)}
                      className={chipClass(selectedGenres.includes(genre))}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <Globe className="h-4 w-4 text-primary" aria-hidden="true" />
                  Languages
                </legend>
                <div className="flex flex-wrap gap-2">
                  {availableLanguages.map((language) => (
                    <button
                      key={language.code}
                      type="button"
                      aria-pressed={selectedLanguages.includes(language.code)}
                      onClick={() => toggleLanguage(language.code)}
                      className={chipClass(selectedLanguages.includes(language.code))}
                    >
                      {language.name}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                <Button
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={handlePreferencesSubmit}
                  disabled={selectedGenres.length === 0 || selectedLanguages.length === 0}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
                {(selectedGenres.length === 0 || selectedLanguages.length === 0) && (
                  <p className="text-sm text-muted-foreground">Choose at least one genre and one language.</p>
                )}
              </div>
            </div>
          ) : (
            <div
              className="text-center cursor-pointer rounded-xl"
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={onFileSelect}
              role="button"
              tabIndex={0}
              aria-label="Choose a photo of a bookshelf"
              onKeyDown={onKeyDown}
            >
              <div className="flex flex-col items-center gap-5 py-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  <ScanLine className="h-8 w-8" aria-hidden="true" />
                </span>

                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-foreground">Photograph a shelf</h2>
                  <p className="text-sm text-muted-foreground">
                    Get the spines in frame, straight on, in good light.
                    <span className="hidden md:inline"> Or drop an image here.</span>
                  </p>
                </div>

                <div className="flex w-full flex-col sm:w-auto sm:flex-row items-stretch justify-center gap-3">
                  <Button
                    ref={cameraButtonRef}
                    size="lg"
                    className="w-full sm:w-auto"
                    onClick={(e) => { e.stopPropagation(); onStartCamera() }}
                  >
                    <Camera className="h-5 w-5" aria-hidden="true" />
                    Take photo
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                    onClick={(e) => { e.stopPropagation(); onFileSelect() }}
                  >
                    <ImageUp className="h-5 w-5" aria-hidden="true" />
                    Upload image
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">JPG, PNG, WebP or HEIC. Large photos are resized on your device.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
})

UploadCard.displayName = 'UploadCard'
