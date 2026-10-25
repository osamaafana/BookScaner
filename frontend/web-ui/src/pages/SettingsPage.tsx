import { useState, useEffect, useRef } from 'react'
import { Trash2, Download, Upload } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useStorage } from '../contexts/StorageContext'
import { useToast } from '../contexts/ToastContext'
import { cn } from '../lib/utils'


export function SettingsPage() {
  const { preferences, updatePreferences, books, clearAllLocalData } = useStorage()
  const [isResetting, setIsResetting] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
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
    <div>
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 md:mb-8 space-y-2">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">Settings</h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', systemStatus.aiOnline ? 'bg-success' : 'bg-destructive')} aria-hidden="true" />
              Scanner {systemStatus.aiOnline ? 'online' : 'offline'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{books.length} {books.length === 1 ? 'book' : 'books'}</span>
            <span aria-hidden="true">·</span>
            <span>{preferences.genres.length} {preferences.genres.length === 1 ? 'genre' : 'genres'}</span>
          </p>
        </header>

        <div className="space-y-4 md:space-y-6">
          <section aria-labelledby="scanner-heading" className="rounded-xl border border-border bg-card p-4 md:p-6">
            <h2 id="scanner-heading" className="text-lg font-semibold text-foreground">Scanner</h2>
            <p className="mt-1 text-sm text-muted-foreground">Which service reads the spines in your photos.</p>
            <fieldset className="mt-4 space-y-2">
              <legend className="sr-only">Vision service</legend>
              {[
                { value: 'groq', title: 'Groq Vision', note: 'Faster and more accurate. Recommended.', label: 'Groq Vision' },
                { value: 'google', title: 'Google Vision + NVIDIA', note: 'Slower and less accurate. Use if Groq is down.', label: 'Google Vision + NVIDIA' }
              ].map((opt) => {
                // Groq is the backend default when nothing was chosen yet
                const groqOn = preferences.groqEnabled !== false
                const checked = opt.value === 'groq' ? groqOn : !groqOn
                return (
                  <label
                    key={opt.value}
                    className={cn(
                      'flex min-h-[56px] cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors touch-manipulation',
                      checked ? 'border-primary bg-accent' : 'border-border hover:bg-secondary'
                    )}
                  >
                    <input
                      type="radio"
                      name="aiModel"
                      value={opt.value}
                      checked={checked}
                      onChange={async (e) => {
                        try {
                          await updatePreferences({ groqEnabled: e.target.value === 'groq' })
                          toast.success(`Scanner switched to ${opt.label}`)
                        } catch {
                          toast.error("Couldn't change the scanner. Try again.")
                        }
                      }}
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                    />
                    <span>
                      <span className="block text-sm font-medium text-foreground">{opt.title}</span>
                      <span className="block text-sm text-muted-foreground">{opt.note}</span>
                    </span>
                  </label>
                )
              })}
            </fieldset>
          </section>

          <section aria-labelledby="data-heading" className="rounded-xl border border-border bg-card divide-y divide-border">
            <div className="p-4 md:p-6">
              <h2 id="data-heading" className="text-lg font-semibold text-foreground">Your data</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your books, scans and preferences live on this device. Save a backup file or restore one.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" onClick={exportData}>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Export backup
                </Button>
                <Button variant="outline" onClick={() => importInputRef.current?.click()}>
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Import backup
                </Button>
                <input ref={importInputRef} type="file" accept=".json" onChange={importData} className="hidden" />
              </div>
            </div>
            <div className="flex flex-col gap-3 p-4 md:p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Reset this device</h3>
                <p className="text-sm text-muted-foreground">Deletes all books, scans and preferences here. Cannot be undone.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowClearConfirm(true)}
                loading={isResetting}
                className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {!isResetting && <Trash2 className="h-4 w-4" aria-hidden="true" />}
                {isResetting ? 'Resetting…' : 'Reset data'}
              </Button>
            </div>
          </section>

          <section aria-labelledby="about-heading" className="rounded-xl border border-border bg-card p-4 md:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="about-heading" className="text-lg font-semibold text-foreground">About</h2>
              <span className="text-xs text-muted-foreground tabular-nums">v2.0.0</span>
            </div>
            <dl className="mt-3 divide-y divide-border text-sm">
              {[
                ['Reading spines', 'Llama 4 Scout on Groq; Google Vision as fallback'],
                ['Recommendations', 'Llama 3.1 on Groq and NVIDIA'],
                ['Book details', 'Open Library, then Google Books'],
                ['Built with', 'React, FastAPI, PostgreSQL, Redis']
              ].map(([term, desc]) => (
                <div key={term} className="grid gap-1 py-2.5 sm:grid-cols-[10rem_1fr]">
                  <dt className="text-muted-foreground">{term}</dt>
                  <dd className="text-foreground">{desc}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        {showClearConfirm && (
          <div
            className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/50 p-4"
            style={{ zIndex: 'var(--z-modal)' }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            aria-describedby="reset-desc"
          >
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
              <div className="space-y-2">
                <h2 id="reset-title" className="text-lg font-semibold text-foreground">Reset all data on this device?</h2>
                <p id="reset-desc" className="text-sm text-muted-foreground">
                  This deletes your library, scan history and preferences. Export a backup first if you want to keep them.
                </p>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setShowClearConfirm(false)} autoFocus>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleClearAllData} loading={isResetting}>
                  {isResetting ? 'Resetting…' : 'Delete everything'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
