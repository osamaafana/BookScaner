import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { HomePage } from './pages/HomePage'
import { RecommendationsPage } from './pages/RecommendationsPage'
import { ReadingListPage } from './pages/ReadingListPage'
import { HistoryPage } from './pages/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { PreferencesPage } from './pages/PreferencesPage'
import { PreferencesModal } from './components/PreferencesModal'
import { StorageProvider, useStorage } from './contexts/StorageContext'
import { ToastProvider } from './contexts/ToastContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { RecommendationsProvider } from './contexts/RecommendationsContext'
import { ToastViewport } from './components/ToastViewport'
import './styles/globals.css'

function AppContent() {
  const [showPreferencesModal, setShowPreferencesModal] = useState(false)
  const { preferences, updatePreferences } = useStorage()

  return (
    <>
      <Router>
        <AppShell onPreferencesClick={() => setShowPreferencesModal(true)}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/reading-list" element={<ReadingListPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/preferences" element={<PreferencesPage />} />
          </Routes>
        </AppShell>
        <ToastViewport />
      </Router>
      <PreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
        preferences={preferences}
        updatePreferences={updatePreferences}
      />
    </>
  )
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <StorageProvider>
          <RecommendationsProvider>
            <AppContent />
          </RecommendationsProvider>
        </StorageProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
