import { X } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

export function ToastViewport() {
  const { toasts, dismiss } = useToast()

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] md:bottom-6 flex flex-col items-center gap-2 px-4"
      style={{ zIndex: 'var(--z-toast)' }}
      role="region"
      aria-live="polite"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className={`w-full max-w-sm pointer-events-auto rounded-xl border shadow-lg bg-popover text-popover-foreground px-4 py-3 flex items-start gap-3 ${
            t.variant === 'success' ? 'border-success' :
            t.variant === 'error' ? 'border-destructive' :
            t.variant === 'warning' ? 'border-warning' : 'border-border'
          }`}
        >
          <div className={`mt-1 h-2 w-2 rounded-full ${
            t.variant === 'success' ? 'bg-success' :
            t.variant === 'error' ? 'bg-destructive' :
            t.variant === 'warning' ? 'bg-warning' : 'bg-primary'
          }`} />
          <div className="flex-1 min-w-0">
            {t.title && <div className="font-semibold text-foreground truncate">{t.title}</div>}
            {t.description && <div className="text-sm text-muted-foreground break-words">{t.description}</div>}
          </div>
          <button
            aria-label="Dismiss"
            className="-m-1 p-2 rounded-md text-muted-foreground hover:bg-secondary"
            onClick={() => dismiss(t.id)}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}
