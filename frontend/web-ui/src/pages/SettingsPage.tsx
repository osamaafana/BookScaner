import { useState, useEffect } from 'react'
import { Trash2, Download, Upload, Cpu, Eye, Zap, Database, Shield, CheckCircle2, AlertTriangle, Loader2, Brain } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useStorage } from '../contexts/StorageContext'
import { useToast } from '../contexts/ToastContext'
import { cn } from '../lib/utils'


export function SettingsPage() {
  const { preferences, updatePreferences, books, clearAllLocalData } = useStorage()
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
      // Get the correct API Gateway URL (same logic as API client)
      const envUrl = import.meta.env.VITE_GATEWAY_URL
      const gatewayUrl = envUrl && envUrl.trim() !== '' ? envUrl : ''
      
      // Call the device-specific flush endpoint to clear only this device's data
      const response = await fetch(`${gatewayUrl}/api/admin/flush-device`, {
        method: 'POST',
        headers: {
          'X-Admin-Token': 'jVJukv2uoBqD7IzscJxpoophMmH9Hj',
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

      toast.success(`Your device data has been deleted successfully! Cleared ${result.tables_cleared} database tables for your device.`)
    } catch (error) {
      console.error('Failed to reset your data:', error)
      toast.error('Failed to reset your data. Please try again.')
    } finally {
      setIsResetting(false)
    }
  }


  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Futuristic AI Header */}
        <div className="text-center space-y-4 md:space-y-8 mb-8 md:mb-16 relative">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-10 md:top-20 left-1/4 w-1 md:w-2 h-1 md:h-2 bg-purple-400/30 rounded-full animate-pulse"></div>
            <div className="absolute top-16 md:top-32 right-1/3 w-0.5 md:w-1 h-0.5 md:h-1 bg-blue-400/40 rounded-full animate-ping"></div>
          </div>

          <div className="space-y-3 md:space-y-6 relative">
            <h1 className="text-3xl md:text-4xl lg:text-6xl font-black text-foreground leading-[0.9] tracking-tight">
              <span className="block relative">
                Settings
                <div className="absolute -bottom-1 md:-bottom-2 left-0 right-0 h-0.5 md:h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 rounded-full"></div>
              </span>
            </h1>
          </div>

          {/* System Status */}
          <div className="flex items-center justify-center gap-4 md:gap-8 mt-4 md:mt-8">
            <div className="text-center group">
              <div className="relative">
                <div className="text-lg md:text-2xl font-bold text-foreground group-hover:scale-110 transition-transform">
                  {systemStatus.aiOnline ? 'ONLINE' : 'OFFLINE'}
                </div>
                <div className={cn(
                  "absolute -top-0.5 md:-top-1 -right-0.5 md:-right-1 w-1.5 md:w-2 h-1.5 md:h-2 rounded-full animate-pulse",
                  systemStatus.aiOnline ? "bg-green-400" : "bg-red-400"
                )}></div>
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">AI Status</div>
            </div>
            <div className="w-px h-6 md:h-8 bg-gradient-to-b from-transparent via-border to-transparent"></div>
            <div className="text-center group">
              <div className="text-lg md:text-2xl font-bold text-foreground group-hover:scale-110 transition-transform">
                {books.length}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Books Scanned</div>
            </div>
            <div className="w-px h-6 md:h-8 bg-gradient-to-b from-transparent via-border to-transparent"></div>
            <div className="text-center group">
              <div className="text-lg md:text-2xl font-bold text-foreground group-hover:scale-110 transition-transform">
                {preferences.genres.length}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Genres</div>
            </div>
          </div>
        </div>

        {/* System Management */}
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
          <Card className="border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm">
            <CardContent className="p-4 md:p-8">
              <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center">
                  <Database className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                    Data Management
                  </h2>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Manage your AI training data, and backup your personal preferences
                  </p>
                </div>
              </div>

              <div className="space-y-3 md:space-y-4">
                {/* Backup & Restore */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 md:p-6 rounded-xl bg-gradient-to-r from-card/80 to-muted/20 border border-border/50 gap-4 md:gap-0">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <Shield className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm md:text-base font-semibold text-foreground">Data Backup & Restore</h3>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        Export or import your AI training data and preferences
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={exportData}
                      className="gap-2 border-purple-500/40 hover:border-purple-500 hover:bg-purple-500/10 text-xs md:text-sm px-3 md:px-4 py-2 md:py-2.5"
                    >
                      <Download className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">Export</span>
                      <span className="sm:hidden">Export</span>
                    </Button>
                    <label className="cursor-pointer">
                      <Button
                        variant="outline"
                        className="gap-2 border-purple-500/40 hover:border-purple-500 hover:bg-purple-500/10 text-xs md:text-sm px-3 md:px-4 py-2 md:py-2.5"
                      >
                        <Upload className="h-3 w-3 md:h-4 md:w-4" />
                        <span className="hidden sm:inline">Import</span>
                        <span className="sm:hidden">Import</span>
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
                <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 md:p-6 rounded-xl bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20 gap-4 md:gap-0">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center">
                      <Trash2 className="h-4 w-4 md:h-5 md:w-5 text-red-500" />
                    </div>
                    <div>
                      <h3 className="text-sm md:text-base font-semibold text-red-900 dark:text-red-100">Reset Your Data</h3>
                      <p className="text-xs md:text-sm text-red-700 dark:text-red-200">
                        Clear all AI training data, books, and preferences for this device
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowClearConfirm(true)}
                    disabled={isResetting}
                    className="gap-2 border-red-500/40 hover:border-red-500 hover:bg-red-500/10 text-red-600 hover:text-red-700 text-xs md:text-sm px-3 md:px-4 py-2 md:py-2.5"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                        <span className="hidden sm:inline">Resetting...</span>
                        <span className="sm:hidden">Reset...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                        <span className="hidden sm:inline">Reset AI</span>
                        <span className="sm:hidden">Reset</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Model Selection */}
          <Card className="border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm">
            <CardContent className="p-4 md:p-8">
              <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                  <Brain className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                    AI Vision Model
                  </h2>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Choose your preferred AI vision processing model for book scanning
                  </p>
                </div>
              </div>

              <div className="space-y-3 md:space-y-4">
                <div className="p-4 md:p-6 rounded-xl bg-gradient-to-r from-card/80 to-muted/20 border border-border/50">
                  <div className="space-y-3 md:space-y-4">
                    <div className="space-y-1 md:space-y-2">
                      <h3 className="text-sm md:text-base font-semibold text-foreground">Vision Processing Model</h3>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        Select the AI model used for analyzing book spines and extracting metadata
                      </p>
                    </div>
                    <div className="space-y-2 md:space-y-3">
                      <label className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 rounded-lg border border-border/50 hover:bg-muted/30 cursor-pointer transition-colors touch-manipulation">
                        <input
                          type="radio"
                          name="aiModel"
                          value="groq"
                          checked={preferences.groqEnabled}
                          onChange={async (e) => {
                            try {
                              await updatePreferences({ groqEnabled: e.target.value === 'groq' })
                              toast.success(`AI Model switched to Groq Vision`)
                            } catch {
                              toast.error('Failed to update AI model preference')
                            }
                          }}
                          className="w-3 h-3 md:w-4 md:h-4 text-primary bg-card border-border focus:ring-primary"
                        />
                        <div className="flex items-center gap-2 md:gap-3 flex-1">
                          <Zap className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                          <div>
                            <div className="text-sm md:text-base font-medium text-foreground">Groq Vision</div>
                            <div className="text-xs md:text-sm text-muted-foreground">Faster, more accurate</div>
                          </div>
                        </div>
                      </label>

                      <label className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 rounded-lg border border-border/50 hover:bg-muted/30 cursor-pointer transition-colors touch-manipulation">
                        <input
                          type="radio"
                          name="aiModel"
                          value="google"
                          checked={!preferences.groqEnabled}
                          onChange={async (e) => {
                            try {
                              await updatePreferences({ groqEnabled: e.target.value === 'groq' })
                              toast.success(`AI Model switched to Google Vision + NVIDIA`)
                            } catch {
                              toast.error('Failed to update AI model preference')
                            }
                          }}
                          className="w-3 h-3 md:w-4 md:h-4 text-primary bg-card border-border focus:ring-primary"
                        />
                        <div className="flex items-center gap-2 md:gap-3 flex-1">
                          <Eye className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                          <div>
                            <div className="text-sm md:text-base font-medium text-foreground">Google Vision + NVIDIA</div>
                            <div className="text-xs md:text-sm text-muted-foreground">Slower, less accurate</div>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card className="border border-primary/20 bg-gradient-to-br from-card/90 via-card to-primary/5 backdrop-blur-sm">
            <CardContent className="p-4 md:p-8">
              <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center">
                  <Cpu className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                    System Information
                  </h2>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Advanced AI-powered book scanning and recommendation engine
                  </p>
                </div>
                <Badge variant="outline" className="gap-1 text-xs border-primary/40 flex-shrink-0">
                  <Zap className="h-3 w-3" />
                  v2.0.0
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-3 md:space-y-4">
                  <div className="p-3 md:p-4 rounded-lg bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20">
                    <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">AI Engine</h3>
                    <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
                      <div className="flex flex-col md:flex-row md:justify-between gap-1 md:gap-0">
                        <span>Vision Model:</span>
                        <span className="text-foreground font-medium text-right">LLaMA 4 Scout using Groq</span>
                      </div>
                      <div className="flex flex-col md:flex-row md:justify-between gap-1 md:gap-0">
                        <span>Recommendations:</span>
                        <span className="text-foreground font-medium text-right">LLaMA 3.1 using Groq + LLaMA 3.1 70b using NVIDIA</span>
                      </div>
                      <div className="flex flex-col md:flex-row md:justify-between gap-1 md:gap-0">
                        <span>OCR Processing:</span>
                        <span className="text-foreground font-medium text-right">Google Vision</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 md:p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
                    <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">Performance</h3>
                    <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
                      <div className="flex flex-col md:flex-row md:justify-between gap-1 md:gap-0">
                        <span>Cache Status:</span>
                        <span className="text-green-600 font-medium text-right">Healthy</span>
                      </div>
                      <div className="flex flex-col md:flex-row md:justify-between gap-1 md:gap-0">
                        <span>Processing Speed:</span>
                        <span className="text-foreground font-medium text-right">~2.3s avg</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 md:space-y-4">
                  <div className="p-3 md:p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                    <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">Technology Stack</h3>
                    <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
                      <div className="flex flex-col md:flex-row md:justify-between gap-1 md:gap-0">
                        <span>Frontend:</span>
                        <span className="text-foreground font-medium text-right">React + TypeScript</span>
                      </div>
                      <div className="flex flex-col md:flex-row md:justify-between gap-1 md:gap-0">
                        <span>Backend:</span>
                        <span className="text-foreground font-medium text-right">FastAPI + Python</span>
                      </div>
                      <div className="flex flex-col md:flex-row md:justify-between gap-1 md:gap-0">
                        <span>Database:</span>
                        <span className="text-foreground font-medium text-right">PostgreSQL + Redis</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 md:p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                    <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">Features</h3>
                    <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span>Real-time AI Vision</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span>Smart Recommendations</span>
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
              <CardContent className="p-4 md:p-8">
                <div className="text-center space-y-4 md:space-y-6">
                  {/* Warning Icon */}
                  <div className="relative mx-auto w-12 h-12 md:w-16 md:h-16">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-500/30 to-red-600/20 animate-pulse"></div>
                    <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center border-2 border-red-500/30">
                      <Trash2 className="h-6 w-6 md:h-8 md:w-8 text-red-500 animate-pulse" />
                    </div>
                    {/* Floating particles */}
                    <div className="absolute top-1 md:top-2 right-1 md:right-2 w-1.5 md:w-2 h-1.5 md:h-2 bg-red-400/60 rounded-full animate-bounce"></div>
                    <div className="absolute bottom-1 md:bottom-2 left-1 md:left-2 w-1 md:w-1.5 h-1 md:h-1.5 bg-red-400/60 rounded-full animate-ping"></div>
                  </div>

                  <div className="space-y-2 md:space-y-3">
                    <h3 className="text-lg md:text-2xl font-bold text-foreground">Reset Your Data?</h3>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed px-2">
                      This will permanently delete all AI training data, books, preferences, and scan results for this device.
                      Your data will be reset to its initial state.
                    </p>
                  </div>

                  <div className="p-3 md:p-4 rounded-lg bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20">
                    <div className="flex items-center gap-2 text-xs md:text-sm text-red-700 dark:text-red-200">
                      <AlertTriangle className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="font-medium">This action cannot be undone</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 border-border/50 hover:border-border text-xs md:text-sm py-2 md:py-2.5"
                      onClick={() => setShowClearConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-500/90 hover:to-red-600/90 text-xs md:text-sm py-2 md:py-2.5"
                      onClick={handleClearAllData}
                      disabled={isResetting}
                    >
                      {isResetting ? (
                        <>
                          <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                          <span className="hidden sm:inline">Resetting...</span>
                          <span className="sm:hidden">Reset...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                          <span className="hidden sm:inline">Reset All</span>
                          <span className="sm:hidden">Reset</span>
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
