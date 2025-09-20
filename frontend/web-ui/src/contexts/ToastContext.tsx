import { createContext, useCallback, useContext, useMemo, useState } from 'react'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  durationMs?: number
}

interface ToastContextValue {
  toasts: ToastItem[]
  toast: (t: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const item: ToastItem = {
      id,
      variant: 'info',
      durationMs: 3500,
      ...t,
    }
    setToasts(prev => [...prev, item])
    const ttl = item.durationMs ?? 3500
    if (ttl > 0) {
      window.setTimeout(() => dismiss(id), ttl)
    }
  }, [dismiss])

  const value = useMemo(() => ({ toasts, toast, dismiss }), [toasts, toast, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')

  return {
    ...ctx,
    success: (message: string, title?: string) => ctx.toast({ variant: 'success', description: message, title }),
    error: (message: string, title?: string) => ctx.toast({ variant: 'error', description: message, title }),
    info: (message: string, title?: string) => ctx.toast({ variant: 'info', description: message, title }),
    warning: (message: string, title?: string) => ctx.toast({ variant: 'warning', description: message, title })
  }
}
