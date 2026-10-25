import { ScanLine, Sparkles, BookOpen, History, Settings } from 'lucide-react'

// Single list of app sections, shared by the top bar (desktop) and bottom bar (phone)
export const navItems = [
  { path: '/', label: 'Scan', icon: ScanLine },
  { path: '/recommendations', label: 'For you', icon: Sparkles },
  { path: '/reading-list', label: 'Library', icon: BookOpen },
  { path: '/history', label: 'History', icon: History },
  { path: '/settings', label: 'Settings', icon: Settings }
]
