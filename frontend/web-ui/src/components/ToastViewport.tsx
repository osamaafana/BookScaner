import { X } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

export function ToastViewport() {
  const { toasts, dismiss } = useToast()

  return (
    <div
      className="fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      role="region"
      aria-live="polite"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className={`w-full max-w-sm rounded-xl border shadow-md backdrop-blur bg-white/90 px-4 py-3 flex items-start gap-3 ${
            t.variant === 'success' ? 'border-green-200' :
            t.variant === 'error' ? 'border-red-200' :
            t.variant === 'warning' ? 'border-yellow-200' : 'border-slate-200'
          }`}
        >
          <div className={`mt-1 h-2 w-2 rounded-full ${
            t.variant === 'success' ? 'bg-green-500' :
            t.variant === 'error' ? 'bg-red-500' :
            t.variant === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
          }`} />
          <div className="flex-1 min-w-0">
            {t.title && <div className="font-semibold text-slate-800 truncate">{t.title}</div>}
            {t.description && <div className="text-sm text-slate-600 break-words">{t.description}</div>}
          </div>
          <button
            aria-label="Dismiss"
            className="p-1 rounded-md text-slate-500 hover:bg-slate-100"
            onClick={() => dismiss(t.id)}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
