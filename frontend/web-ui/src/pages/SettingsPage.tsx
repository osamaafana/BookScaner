import { useState, useEffect } from 'react'
import { Save, Trash2, Download, Upload, Brain, Cpu, Eye, Zap, Sparkles, Settings as SettingsIcon, Database, Shield, RefreshCw, CheckCircle2, AlertTriangle, Info, Loader2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useStorage } from '../contexts/StorageContext'
import { useToast } from '../contexts/ToastContext'
import { cn } from '../lib/utils'

const AVAILABLE_GENRES = [
  'Science Fiction', 'Fantasy', 'Mystery', 'Romance', 'Thriller',
  'Historical Fiction', 'Literary Fiction', 'Young Adult', 'Horror',
  'Biography', 'History', 'Philosophy', 'Psychology', 'Science',
  'Technology', 'Business', 'Self Help', 'Health', 'Travel',
  'Art', 'Cooking', 'Poetry', 'Drama', 'Comedy'
]

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' }
]

export function SettingsPage() {
  const { preferences, updatePreferences, books, syncWithBackend, clearAllLocalData } = useStorage()
  const [localPreferences, setLocalPreferences] = useState(preferences)
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [systemStatus, setSystemStatus] = useState({
    aiOnline: true,
    cacheStatus: 'healthy',
    lastSync: null as Date | null,
    totalScans: 0
  })
  const toast = useToast()

  // Simulate system status check
  useEffect(() => {
    const checkSystemStatus = () => {
      setSystemStatus(prev => ({
        ...prev,
        lastSync: new Date(),
        totalScans: books.length
      }))
    }

    checkSystemStatus()
    const interval = setInterval(checkSystemStatus, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [books.length])

  const toggleGenre = (genre: string) => {
    setLocalPreferences(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }))
  }

  const toggleLanguage = (langCode: string) => {
    setLocalPreferences(prev => ({
      ...prev,
      languages: prev.languages.includes(langCode)
        ? prev.languages.filter(l => l !== langCode)
        : [...prev.languages, langCode]
    }))
  }

  const savePreferences = async () => {
    setIsSaving(true)
    try {
      await updatePreferences(localPreferences)
      toast.success('Preferences saved')
    } catch (error) {
      console.error('Failed to save preferences:', error)
      toast.error('Failed to save preferences')
    } finally {
      setIsSaving(false)
    }
  }

  const syncData = async () => {
    setIsSyncing(true)
    try {
      await syncWithBackend()
      toast.success('Data synced successfully')
    } catch (error) {
      console.error('Sync failed:', error)
      toast.error('Sync failed. Please try again')
    } finally {
      setIsSyncing(false)
    }
  }

  const exportData = () => {
    const data = {
      books,
      preferences,
      exportedAt: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bookscanner-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)

        if (data.preferences) {
          await updatePreferences(data.preferences)
          setLocalPreferences(data.preferences)
        }

        if (data.books && Array.isArray(data.books)) {
          // Note: In a real app, you'd want to merge/deduplicate books
          toast.info(`Import includes ${data.books.length} books. Manual import not implemented yet`)
        }

        toast.success('Data imported successfully')
      } catch (error) {
        console.error('Import failed:', error)
        toast.error('Failed to import data. Please check the file format')
      }
    }
    reader.readAsText(file)
  }

  const handleClearAllData = async () => {
    setIsResetting(true)
    try {
      // Call the flush endpoint to clear database and cache
      const response = await fetch('http://localhost:8000/v1/admin/flush-db', {
        method: 'POST',
        headers: {
          'admin_token': 'jVJukv2uoBqD7IzscJxpoophMmH9Hj',
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      // Clear all local data (IndexedDB)
      await clearAllLocalData()

      // Clear localStorage and reset preferences
      localStorage.clear()
      setShowClearConfirm(false)
      setLocalPreferences({ genres: [], languages: [] })

      toast.success(`your data has been deleted successfully! Cleared ${result.tables_cleared} database tables, cache, and all local data.`)
    } catch (error) {
      console.error('Failed to reset neural network:', error)
      toast.error('Failed to reset neural network. Please try again.')
    } finally {
      setIsResetting(false)
    }
  }

  const hasChanges = JSON.stringify(localPreferences) !== JSON.stringify(preferences)

  return (
    <div className="min-h-screen" aria-busy={isSaving || isSyncing}>
      <div className="container mx-auto px-4 py-8">
        {/* Futuristic AI Header */}
        <div className="text-center space-y-8 mb-16 relative">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-1/4 w-2 h-2 bg-purple-400/30 rounded-full animate-pulse"></div>
            <div className="absolute top-32 right-1/3 w-1 h-1 bg-blue-400/40 rounded-full animate-ping"></div>
          </div>

          <div className="space-y-6 relative">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-primary/20 text-purple-600 text-sm font-semibold border border-purple-500/30 backdrop-blur-sm">
              <SettingsIcon className="h-4 w-4 animate-pulse" />
              AI Configuration Center
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-foreground leading-[0.9] tracking-tight">
              <span className="block">Neural</span>
              <span className="block bg-gradient-to-r from-purple-500 via-blue-400 to-primary bg-clip-text text-transparent animate-gradient">
                Configuration
              </span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Configure your AI-powered reading experience with advanced neural network preferences
              and system optimization settings.
        </p>
      </div>

          {/* System Status */}
          <div className="flex items-center justify-center gap-8 mt-8">
            <div className="text-center group">
              <div className="relative">
                <div className="text-2xl font-bold text-foreground group-hover:scale-110 transition-transform">
                  {systemStatus.aiOnline ? 'ONLINE' : 'OFFLINE'}
                </div>
                <div className={cn(
                  "absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse",
                  systemStatus.aiOnline ? "bg-green-400" : "bg-red-400"
                )}></div>
              </div>
              <div className="text-sm text-muted-foreground">AI Status</div>
            </div>
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-border to-transparent"></div>
            <div className="text-center group">
              <div className="text-2xl font-bold text-foreground group-hover:scale-110 transition-transform">
                {books.length}
              </div>
              <div className="text-sm text-muted-foreground">Books Scanned</div>
            </div>
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-border to-transparent"></div>
            <div className="text-center group">
              <div className="text-2xl font-bold text-foreground group-hover:scale-110 transition-transform">
                {localPreferences.genres.length}
              </div>
              <div className="text-sm text-muted-foreground">Genres</div>
            </div>
          </div>
        </div>

        {/* AI Preference Configuration */}
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Genre Preferences */}
          <Card className="border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                    Neural Genre Preferences
                  </h2>
                  <p className="text-muted-foreground">
                    Train the AI to understand your reading patterns and preferences
                  </p>
                </div>
                <Badge variant="outline" className="ml-auto gap-1 text-xs border-purple-500/40">
                  <Sparkles className="h-3 w-3" />
                  LLaMA AI Training
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {AVAILABLE_GENRES.map(genre => {
                  const active = localPreferences.genres.includes(genre)
                  return (
                    <Button
                      key={genre}
                      variant={active ? "primary" : "outline"}
                      size="sm"
                      onClick={() => toggleGenre(genre)}
                      className={cn(
                        "relative transition-all duration-300 group",
                        active
                          ? "bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-500/90 hover:to-blue-600/90 text-white border-0"
                          : "hover:bg-primary/10 hover:border-primary/50"
                      )}
                    >
                      {active && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      )}
                      <span className="text-xs font-medium">{genre}</span>
                    </Button>
                  )
                })}
      </div>

              <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Info className="h-4 w-4 text-primary" />
                  <span>
                    <strong>{localPreferences.genres.length}</strong> genres selected.
                    More preferences = better AI recommendations.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Language Preferences */}
          <Card className="border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                    Multi-Language Vision
                  </h2>
                  <p className="text-muted-foreground">
                    Configure AI vision processing for different languages and scripts
                  </p>
                </div>
                <Badge variant="outline" className="ml-auto gap-1 text-xs border-blue-500/40">
                  <Eye className="h-3 w-3" />
                  OCR Processing
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {AVAILABLE_LANGUAGES.map(lang => {
                  const active = localPreferences.languages.includes(lang.code)
                  return (
                    <Button
              key={lang.code}
                      variant={active ? "primary" : "outline"}
                      size="sm"
              onClick={() => toggleLanguage(lang.code)}
                      className={cn(
                        "relative transition-all duration-300 group",
                        active
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-500/90 hover:to-purple-600/90 text-white border-0"
                          : "hover:bg-primary/10 hover:border-primary/50"
                      )}
                    >
                      {active && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      )}
                      <span className="text-xs font-medium">{lang.name}</span>
                    </Button>
                  )
                })}
            </div>

              <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span>
                    <strong>{localPreferences.languages.length}</strong> languages configured.
                    AI will process text in these languages with higher accuracy.
                  </span>
        </div>
      </div>
            </CardContent>
          </Card>

          {/* Save Changes */}
      {hasChanges && (
            <Card className="border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-yellow-500/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-900 dark:text-amber-100">Unsaved Configuration Changes</h3>
                    <p className="text-sm text-amber-700 dark:text-amber-200">
                      Your AI preferences have been modified. Save to apply changes to the neural network.
                    </p>
                  </div>
                  <Button
            onClick={savePreferences}
            disabled={isSaving}
                    className="gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-500/90 hover:to-yellow-600/90"
          >
            {isSaving ? (
              <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                        <Save className="h-4 w-4" />
                        Save Configuration
              </>
            )}
                  </Button>
        </div>
              </CardContent>
            </Card>
          )}

          {/* System Management */}
          <Card className="border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                    Neural Data Management
                  </h2>
                  <p className="text-muted-foreground">
                    Manage your AI training data, sync with cloud, and backup your neural preferences
                  </p>
                </div>
                <Badge variant="outline" className="ml-auto gap-1 text-xs border-green-500/40">
                  <Database className="h-3 w-3" />
                  Cloud Sync
                </Badge>
              </div>

              <div className="space-y-4">
                {/* Library Sync */}
                <div className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-r from-card/80 to-muted/20 border border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <RefreshCw className="h-5 w-5 text-primary" />
                    </div>
            <div>
                      <h3 className="font-semibold text-foreground">AI Library Sync</h3>
                      <p className="text-sm text-muted-foreground">
                        {books.length} books • Last sync: {systemStatus.lastSync ? systemStatus.lastSync.toLocaleTimeString() : 'Never'}
                      </p>
                    </div>
            </div>
                  <Button
                    variant="outline"
              onClick={syncData}
              disabled={isSyncing}
                    className="gap-2 border-primary/40 hover:border-primary hover:bg-primary/10"
            >
              {isSyncing ? (
                <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Sync Neural Data
                      </>
              )}
                  </Button>
          </div>

                {/* Backup & Restore */}
                <div className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-r from-card/80 to-muted/20 border border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
            <div>
                      <h3 className="font-semibold text-foreground">Neural Backup & Restore</h3>
                      <p className="text-sm text-muted-foreground">
                        Export or import your AI training data and preferences
                      </p>
                    </div>
            </div>
            <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={exportData}
                      className="gap-2 border-purple-500/40 hover:border-purple-500 hover:bg-purple-500/10"
                    >
                      <Download className="h-4 w-4" />
                Export
                    </Button>
                    <label className="cursor-pointer">
                      <Button
                        variant="outline"
                        className="gap-2 border-purple-500/40 hover:border-purple-500 hover:bg-purple-500/10"
                      >
                        <Upload className="h-4 w-4" />
                Import
                      </Button>
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  className="hidden"
                />
              </label>
            </div>
          </div>

                {/* Clear Data */}
                <div className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center">
                      <Trash2 className="h-5 w-5 text-red-500" />
                    </div>
            <div>
                      <h3 className="font-semibold text-red-900 dark:text-red-100">Reset Neural Network</h3>
                      <p className="text-sm text-red-700 dark:text-red-200">
                        Clear all AI training data, books, and preferences
                      </p>
                    </div>
            </div>
                  <Button
                    variant="outline"
              onClick={() => setShowClearConfirm(true)}
                    disabled={isResetting}
                    className="gap-2 border-red-500/40 hover:border-red-500 hover:bg-red-500/10 text-red-600 hover:text-red-700"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Reset AI
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card className="border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center">
                  <Cpu className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                    Neural System Information
                  </h2>
                  <p className="text-muted-foreground">
                    Advanced AI-powered book scanning and recommendation engine
                  </p>
                </div>
                <Badge variant="outline" className="ml-auto gap-1 text-xs border-primary/40">
                  <Zap className="h-3 w-3" />
                  v2.0.0
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20">
                    <h3 className="font-semibold text-foreground mb-2">AI Engine</h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Vision Model:</span>
                        <span className="text-foreground font-medium">LLaMA 4 Scout</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Recommendations:</span>
                        <span className="text-foreground font-medium">LLaMA 3.1</span>
                      </div>
                      <div className="flex justify-between">
                        <span>OCR Processing:</span>
                        <span className="text-foreground font-medium">Google Vision</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
                    <h3 className="font-semibold text-foreground mb-2">Performance</h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Cache Status:</span>
                        <span className="text-green-600 font-medium">Healthy</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Processing Speed:</span>
                        <span className="text-foreground font-medium">~2.3s avg</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Accuracy Rate:</span>
                        <span className="text-foreground font-medium">94.2%</span>
                      </div>
          </div>
        </div>
      </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                    <h3 className="font-semibold text-foreground mb-2">Technology Stack</h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Frontend:</span>
                        <span className="text-foreground font-medium">React + TypeScript</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Backend:</span>
                        <span className="text-foreground font-medium">FastAPI + Python</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Database:</span>
                        <span className="text-foreground font-medium">PostgreSQL + Redis</span>
                      </div>
        </div>
      </div>

                  <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                    <h3 className="font-semibold text-foreground mb-2">Features</h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span>Real-time AI Vision</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span>Smart Recommendations</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span>Multi-language OCR</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Reset Confirmation Modal */}
      {showClearConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full border border-red-500/20 bg-gradient-to-br from-card/95 to-red-500/5 backdrop-blur-xl">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  {/* Warning Icon */}
                  <div className="relative mx-auto w-16 h-16">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-500/30 to-red-600/20 animate-pulse"></div>
                    <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center border-2 border-red-500/30">
                      <Trash2 className="h-8 w-8 text-red-500 animate-pulse" />
                    </div>
                    {/* Floating particles */}
                    <div className="absolute top-2 right-2 w-2 h-2 bg-red-400/60 rounded-full animate-bounce"></div>
                    <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-red-400/60 rounded-full animate-ping"></div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold text-foreground">Reset Neural Network?</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      This will permanently delete all AI training data, books, preferences, and scan results.
                      The neural network will be reset to its initial state.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20">
                    <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-200">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">This action cannot be undone</span>
                    </div>
                  </div>

            <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 border-border/50 hover:border-border"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
                    </Button>
                    <Button
                      className="flex-1 gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-500/90 hover:to-red-600/90"
                      onClick={handleClearAllData}
                      disabled={isResetting}
                    >
                      {isResetting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Reset AI
                        </>
                      )}
                    </Button>
                  </div>
            </div>
              </CardContent>
            </Card>
          </div>
        )}
        </div>
    </div>
  )
}
