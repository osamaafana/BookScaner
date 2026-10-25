import React, { memo, useEffect, useRef } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from './ui/Button'

interface CameraModalProps {
  showCamera: boolean
  cameraLoading: boolean
  cameraError: string | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onStopCamera: () => void
  onCaptureFromCamera: () => void
  onStartCamera: () => void
  triggerRef?: React.RefObject<HTMLElement | null>
}

export const CameraModal = memo<CameraModalProps>(({
  showCamera,
  cameraLoading,
  cameraError,
  videoRef,
  canvasRef,
  onStopCamera,
  onCaptureFromCamera,
  onStartCamera,
  triggerRef
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const captureButtonRef = useRef<HTMLButtonElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // Focus management and trap
  useEffect(() => {
    if (showCamera) {
      // Store the previously focused element
      previousActiveElement.current = document.activeElement as HTMLElement

      // Focus the close button initially
      setTimeout(() => {
        closeButtonRef.current?.focus()
      }, 100)
    } else {
      // Return focus to the trigger element when modal closes
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      } else if (triggerRef?.current) {
        triggerRef.current.focus()
      }
    }
  }, [showCamera, triggerRef])

  // Focus trap
  useEffect(() => {
    if (!showCamera) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as NodeListOf<HTMLElement>

        if (!focusableElements.length) return

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      } else if (e.key === 'Escape') {
        onStopCamera()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showCamera, onStopCamera])

  if (!showCamera) return null

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 flex items-center justify-center bg-black sm:bg-black/80 sm:p-4"
      style={{ zIndex: 'var(--z-modal)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
      aria-describedby="camera-modal-description"
    >
      <div className="relative flex h-full w-full max-w-3xl flex-col bg-black sm:h-auto sm:overflow-hidden sm:rounded-2xl">
        <div className="flex items-center justify-between px-4 py-3 text-white safe-area-inset-top">
          <h2 id="camera-modal-title" className="text-base font-semibold">Take a photo</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onStopCamera}
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"
            aria-label="Close camera"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <p id="camera-modal-description" className="sr-only">
          Point your camera at the bookshelf so the spines fill the frame, then press the shutter button.
        </p>

        <div className="relative flex-1 sm:flex-none">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover sm:h-auto sm:max-h-[65vh]"
            style={{ minHeight: '300px' }}
          />
          <canvas ref={canvasRef} className="hidden" />

          {cameraLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
              <span className="text-sm">Starting camera…</span>
            </div>
          )}

          {cameraError && !cameraLoading && (
            <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-white">
              <p className="text-sm max-w-[36ch]">{cameraError}</p>
              <Button size="md" onClick={onStartCamera}>Try again</Button>
            </div>
          )}

          {!cameraLoading && !cameraError && (
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-5 rounded-xl border-2 border-white/60" />
              <p className="absolute inset-x-0 bottom-8 text-center">
                <span className="rounded-full bg-black/60 px-3 py-1 text-sm text-white">Fit the spines inside the frame</span>
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-center py-5 safe-area-inset-bottom">
          <button
            ref={captureButtonRef}
            type="button"
            onClick={onCaptureFromCamera}
            disabled={cameraLoading || !!cameraError}
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white transition-transform active:scale-95 disabled:opacity-40"
            aria-label={cameraLoading ? 'Camera is starting' : 'Take photo'}
          >
            <span className="h-[56px] w-[56px] rounded-full bg-white" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
})

CameraModal.displayName = 'CameraModal'
