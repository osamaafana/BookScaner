import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { Button } from './ui/Button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const getIcon = () => {
    return theme === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className="h-8 w-8"
      title={`Current theme: ${theme}`}
    >
      {getIcon()}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
