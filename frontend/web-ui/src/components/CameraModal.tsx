import React, { memo, useEffect, useRef } from 'react'
import { Camera, X } from 'lucide-react'
import { Button } from './ui/Button'
import { Card, CardContent } from './ui/Card'

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
      aria-describedby="camera-modal-description"
    >
      <div className="relative w-full max-w-4xl mx-4">
        <Card className="border border-primary/20 bg-gradient-to-br from-card/90 to-primary/10 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 id="camera-modal-title" className="text-xl font-bold text-foreground">Camera Capture</h3>
                <Button
                  ref={closeButtonRef}
                  variant="outline"
                  size="sm"
                  onClick={onStopCamera}
                  className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                  aria-label="Close camera modal"
                >
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>

              {/* Description for screen readers */}
              <div id="camera-modal-description" className="sr-only">
                Use your camera to capture an image of your bookshelf. Position your books within the frame and click capture when ready.
              </div>

              {/* Camera Preview */}
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto max-h-[60vh] rounded-lg bg-black"
                  style={{ minHeight: '300px' }}
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />

                {/* Loading overlay */}
                {cameraLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <div className="text-center text-white">
                      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <div className="text-sm">Loading camera...</div>
                    </div>
                  </div>
                )}

                {/* Error overlay */}
                {cameraError && !cameraLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <div className="text-center text-white p-4">
                      <div className="text-red-400 mb-2">⚠️</div>
                      <div className="text-sm mb-4">{cameraError}</div>
                      <Button
                        size="sm"
                        onClick={onStartCamera}
                        className="bg-primary hover:bg-primary/90"
                      >
                        Retry Camera
                      </Button>
                    </div>
                  </div>
                )}

                {/* Capture overlay */}
                {!cameraLoading && !cameraError && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-4 border-2 border-white/50 rounded-lg"></div>
                    <div className="absolute top-4 left-4 right-4 text-center">
                      <div className="inline-block px-3 py-1 bg-black/70 text-white text-sm rounded-full backdrop-blur-sm">
                        Position your bookshelf within the frame
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Capture Button */}
              <div className="flex justify-center">
                <Button
                  ref={captureButtonRef}
                  size="lg"
                  onClick={onCaptureFromCamera}
                  disabled={cameraLoading || !!cameraError}
                  className="gap-3 px-8 py-4 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg hover:shadow-xl disabled:opacity-50"
                  aria-label={cameraLoading ? 'Loading camera, please wait' : cameraError ? 'Camera error occurred' : 'Capture image from camera'}
                >
                  <Camera className="h-6 w-6" />
                  {cameraLoading ? 'Loading Camera...' : cameraError ? 'Camera Error' : 'Capture Image'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
})

CameraModal.displayName = 'CameraModal'
