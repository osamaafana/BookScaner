import { useRef, useEffect, useState } from 'react'

interface SpineCropProps {
  imageUrl: string
  bbox: { x: number; y: number; w: number; h: number }
  alt: string
  className?: string
}

export function SpineCrop({ imageUrl, bbox, alt, className = '' }: SpineCropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsLoading(true)
    setError(null)

    const img = new Image()
    img.crossOrigin = 'anonymous' // Enable CORS for cross-origin images

    img.onload = () => {
      try {
        // Set canvas dimensions to match the bounding box
        canvas.width = bbox.w
        canvas.height = bbox.h

        // Draw the cropped portion of the image
        ctx.drawImage(
          img,
          bbox.x, bbox.y, bbox.w, bbox.h, // Source rectangle (crop area)
          0, 0, bbox.w, bbox.h             // Destination rectangle (full canvas)
        )

        setIsLoading(false)
      } catch (err) {
        console.error('Failed to draw spine crop:', err)
        setError('Failed to render spine crop')
        setIsLoading(false)
      }
    }

    img.onerror = () => {
      console.error('Failed to load image for spine crop:', imageUrl)
      setError('Failed to load image')
      setIsLoading(false)
    }

    img.src = imageUrl
  }, [imageUrl, bbox])

  if (error) {
    return (
      <div className={`spine-crop ${className} flex items-center justify-center bg-gray-200 text-gray-500 text-xs`}>
        <span>Failed to load</span>
      </div>
    )
  }

  return (
    <div className={`spine-crop ${className} relative w-full h-full`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 text-muted-foreground text-xs rounded">
          <span>Loading...</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-contain rounded transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        aria-label={alt}
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  )
}

// Fallback component for when no bbox is available
export function SpinePlaceholder({ index, className = '' }: { index: number; className?: string }) {
  return (
    <div className={`spine-crop ${className} w-full h-full flex items-center justify-center bg-muted/50 text-muted-foreground text-xs rounded`}>
      <span>Spine {index + 1}</span>
    </div>
  )
}
