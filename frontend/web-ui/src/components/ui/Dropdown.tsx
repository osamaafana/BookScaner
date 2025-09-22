import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { Button } from './Button'
import { cn } from '../../lib/utils'

interface DropdownOption {
  value: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  description?: string
}

interface DropdownProps {
  options: DropdownOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function Dropdown({ options, value, onValueChange, placeholder = "Select option", className }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(option => option.value === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "justify-between gap-2 min-w-[140px]",
          isOpen && "ring-2 ring-primary/20"
        )}
      >
        <div className="flex items-center gap-2">
          {selectedOption?.icon && <selectedOption.icon className="h-4 w-4" />}
          <span className="text-sm font-medium">
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-card border border-border rounded-lg shadow-lg z-50">
          <div className="p-1">
            {options.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onValueChange(option.value)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                    "hover:bg-primary/10 focus:bg-primary/10 focus:outline-none",
                    value === option.value && "bg-primary/20 text-primary"
                  )}
                >
                  {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                  <div className="flex-1 text-left">
                    <div className="font-medium">{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    )}
                  </div>
                  {value === option.value && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
