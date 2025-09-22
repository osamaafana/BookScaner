import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { HomePage } from './pages/HomePage'
import { ResultsPage } from './pages/ResultsPage'
import { RecommendationsPage } from './pages/RecommendationsPage'
import { ReadingListPage } from './pages/ReadingListPage'
import { HistoryPage } from './pages/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { PreferencesPage } from './pages/PreferencesPage'
import { StorageProvider } from './contexts/StorageContext'
import { ToastProvider } from './contexts/ToastContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { RecommendationsProvider } from './contexts/RecommendationsContext'
import { ToastViewport } from './components/ToastViewport'
import './styles/globals.css'

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <StorageProvider>
          <RecommendationsProvider>
            <Router>
              <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/reading-list" element={<ReadingListPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/preferences" element={<PreferencesPage />} />
          </Routes>
              </AppShell>
              <ToastViewport />
            </Router>
          </RecommendationsProvider>
        </StorageProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
