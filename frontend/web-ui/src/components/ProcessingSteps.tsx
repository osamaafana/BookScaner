import { memo, useState, useEffect } from 'react'
import { CheckCircle2, Layers, Cpu, Zap } from 'lucide-react'
import { cn } from '../lib/utils'

// Dominant Background Color Extractor for Image Preview
interface RGBColor {
  r: number
  g: number
  b: number
}

class DominantBackgroundColorExtractor {
  private static downscaleImage(img: HTMLImageElement, maxDimension: number): Promise<ImageData> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height))
    })
  }

  private static extractEdgePixels(imageData: ImageData, edgeFraction: number): RGBColor[] {
    const { width, height, data } = imageData
    const edgeWidth = Math.max(1, Math.round(width * edgeFraction))
    const edgeHeight = Math.max(1, Math.round(height * edgeFraction))
    const pixels: RGBColor[] = []

    // Sample from edges (top, bottom, left, right strips)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const isEdge = (
          x < edgeWidth || x >= width - edgeWidth ||
          y < edgeHeight || y >= height - edgeHeight
        )

        if (isEdge) {
          const i = (y * width + x) * 4
          const alpha = data[i + 3]
          if (alpha > 8) { // Not fully transparent
            pixels.push({
              r: data[i] / 255,
              g: data[i + 1] / 255,
              b: data[i + 2] / 255
            })
          }
        }
      }
    }

    return pixels
  }


  private static kMeansRefinement(colors: RGBColor[], k: number, iterations: number): RGBColor {
    const n = colors.length
    if (n === 0) return { r: 0.95, g: 0.95, b: 0.95 }

    k = Math.max(1, Math.min(k, Math.min(6, n)))

    // Initialize centroids by picking k evenly spaced points
    const centroids: RGBColor[] = []
    const stride = Math.max(1, Math.floor(n / k))

    for (let i = 0; i < k; i++) {
      const index = Math.min(i * stride, n - 1)
      centroids.push({ ...colors[index] })
    }

    for (let iter = 0; iter < iterations; iter++) {
      // Assign points to nearest centroid
      const assignments: number[] = []
      const sums: RGBColor[] = Array.from({ length: k }, () => ({ r: 0, g: 0, b: 0 }))
      const counts: number[] = Array(k).fill(0)

      for (const color of colors) {
        let bestCentroid = 0
        let bestDistance = this.colorDistanceSquared(color, centroids[0])

        for (let c = 1; c < k; c++) {
          const distance = this.colorDistanceSquared(color, centroids[c])
          if (distance < bestDistance) {
            bestDistance = distance
            bestCentroid = c
          }
        }

        assignments.push(bestCentroid)
        sums[bestCentroid].r += color.r
        sums[bestCentroid].g += color.g
        sums[bestCentroid].b += color.b
        counts[bestCentroid]++
      }

      // Update centroids
      for (let c = 0; c < k; c++) {
        if (counts[c] > 0) {
          centroids[c] = {
            r: sums[c].r / counts[c],
            g: sums[c].g / counts[c],
            b: sums[c].b / counts[c]
          }
        }
      }
    }

    // Find the largest cluster
    const clusterSizes = Array(k).fill(0)
    for (let i = 0; i < colors.length; i++) {
      let bestCentroid = 0
      let bestDistance = this.colorDistanceSquared(colors[i], centroids[0])

      for (let c = 1; c < k; c++) {
        const distance = this.colorDistanceSquared(colors[i], centroids[c])
        if (distance < bestDistance) {
          bestDistance = distance
          bestCentroid = c
        }
      }
      clusterSizes[bestCentroid]++
    }

    const largestCluster = clusterSizes.indexOf(Math.max(...clusterSizes))
    return centroids[largestCluster]
  }

  private static colorDistanceSquared(a: RGBColor, b: RGBColor): number {
    const dr = a.r - b.r
    const dg = a.g - b.g
    const db = a.b - b.b
    return dr * dr + dg * dg + db * db
  }

  static async extractDominantColor(imageSrc: string): Promise<RGBColor | null> {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      img.onload = async () => {
        try {
          const imageData = await this.downscaleImage(img, 128)
          const edgePixels = this.extractEdgePixels(imageData, 0.12)

          if (edgePixels.length === 0) {
            resolve(null)
            return
          }

          // Step 2: K-means refinement
          const refined = this.kMeansRefinement(edgePixels, 3, 10)

          resolve(refined)
        } catch (error) {
          console.error('Error extracting dominant color:', error)
          resolve(null)
        }
      }

      img.onerror = () => resolve(null)
      img.src = imageSrc
    })
  }
}

type StepKey = 'optimize' | 'upload' | 'enrich'
type StepState = Record<StepKey, 'pending' | 'active' | 'done'>

interface ProcessingStepsProps {
  stepState: StepState
  currentMessage?: string
  progress?: number
  imagePreview?: string | null
}

// Step configuration for rendering
const stepConfig = {
  optimize: { label: 'Optimizing', icon: Layers, description: 'Enhancing image quality' },
  upload: { label: 'Processing', icon: Zap, description: 'AI analysis in progress' },
  enrich: { label: 'Enriching', icon: Cpu, description: 'Matching book metadata' }
} as const

export const ProcessingSteps = memo<ProcessingStepsProps>(({ stepState, currentMessage, progress, imagePreview }) => {
  const [dominantColor, setDominantColor] = useState<RGBColor | null>(null)

  // Get the current active step for announcements
  const activeStep = (Object.keys(stepState) as StepKey[]).find(key => stepState[key] === 'active')
  const activeStepConfig = activeStep ? stepConfig[activeStep] : null

  // Create announcement text
  const announcementText = currentMessage ||
    (activeStepConfig ? `${activeStepConfig.label}: ${activeStepConfig.description}` : 'Processing your image...')

  const progressText = progress !== undefined ? `Progress: ${progress}%` : ''

  // Extract dominant color when image preview changes
  useEffect(() => {
    if (imagePreview) {
      DominantBackgroundColorExtractor.extractDominantColor(imagePreview)
        .then(color => {
          if (color) {
            setDominantColor(color)
          }
        })
        .catch(error => {
          console.warn('Failed to extract dominant color:', error)
          setDominantColor(null)
        })
    } else {
      setDominantColor(null)
    }
  }, [imagePreview])

  return (
    <div className="text-center space-y-10">
      {/* Screen reader announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        aria-label="Processing status"
      >
        {announcementText}
        {progressText && ` ${progressText}`}
      </div>
      {/* Enhanced AI Processing Steps with Image Preview */}
      <div className="max-w-7xl mx-auto">
        <div
          className="bg-gradient-to-r from-card/50 to-card/80 rounded-3xl p-8 backdrop-blur-sm border border-primary/20 relative overflow-hidden"
          style={{
            background: dominantColor
              ? `linear-gradient(135deg,
                  rgba(${Math.round(dominantColor.r * 255)}, ${Math.round(dominantColor.g * 255)}, ${Math.round(dominantColor.b * 255)}, 0.1) 0%,
                  rgba(${Math.round(dominantColor.r * 180)}, ${Math.round(dominantColor.g * 180)}, ${Math.round(dominantColor.b * 180)}, 0.05) 100%)`
              : undefined
          }}
        >
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 20% 80%, rgba(255,255,255,0.2) 0%, transparent 50%),
                               radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
              backgroundSize: '120px 120px, 140px 140px',
              backgroundPosition: '0 0, 80px 80px'
            }} />
          </div>

          <div className="relative z-10">
            {/* Header with image preview */}
            <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center mb-8">
              {/* Image Preview */}
              {imagePreview && (
                <div className="flex-shrink-0">
                  <div className="relative w-48 h-32 rounded-2xl overflow-hidden shadow-lg border border-white/20 backdrop-blur-sm">
                    {/* Dynamic background using dominant color */}
                    <div
                      className="absolute inset-0 opacity-15"
                      style={{
                        background: dominantColor
                          ? `linear-gradient(135deg,
                              rgb(${Math.round(dominantColor.r * 255)}, ${Math.round(dominantColor.g * 255)}, ${Math.round(dominantColor.b * 255)}) 0%,
                              rgb(${Math.round(dominantColor.r * 200)}, ${Math.round(dominantColor.g * 200)}, ${Math.round(dominantColor.b * 200)}) 100%)`
                          : 'linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(147, 51, 234) 100%)'
                      }}
                    />

                    <img
                      src={imagePreview}
                      alt="Processing image"
                      className="relative w-full h-full object-cover"
                    />

                  </div>
                </div>
              )}

              {/* Pipeline Steps */}
              <div className="flex-1 w-full">
                <h3 className="text-xl font-bold text-center lg:text-left mb-4 text-foreground">
                  {imagePreview ? 'AI Analysis Pipeline' : 'Books Detection Pipeline'}
                </h3>
                <div className="flex flex-wrap justify-center lg:justify-start gap-3">
            {(Object.keys(stepState) as StepKey[]).map((key) => {
              const status = stepState[key]
              const config = stepConfig[key]
              const Icon = config.icon
              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-xl transition-all duration-500 min-w-[140px]",
                          status === 'active' && "bg-gradient-to-r from-primary/20 to-blue-500/20 scale-105 shadow-md",
                    status === 'done' && "bg-gradient-to-r from-green-500/20 to-emerald-500/20",
                    status === 'pending' && "bg-muted/30"
                  )}
                >
                  <div className="flex-shrink-0">
                    {status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {status === 'active' && <Icon className="h-4 w-4 text-primary animate-pulse" />}
                    {status === 'pending' && <Icon className="h-4 w-4 text-muted-foreground opacity-50" />}
                  </div>
                        <div className="flex-1 text-center lg:text-left">
                    <div className={cn(
                            "font-medium text-sm",
                      status === 'pending' ? 'text-muted-foreground' : 'text-foreground'
                    )}>
                      {config.label}
                    </div>
                  </div>
                </div>
              )
            })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Processing Animation */}
      <div className="relative">
        <div className="w-24 h-24 mx-auto">
          {/* Multiple rotating rings */}
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-2 border-blue-500/20 border-r-blue-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '3s' }}></div>
          <div className="absolute inset-4 rounded-full border-2 border-purple-500/20 border-b-purple-500 animate-spin" style={{ animationDuration: '4s' }}></div>

          {/* Central AI icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-500 rounded-full flex items-center justify-center shadow-2xl">
              <Zap className="h-5 w-5 text-white animate-pulse" />
            </div>
          </div>
        </div>

        {/* Floating processing indicators */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
          </div>
        </div>
      </div>
    </div>
  )
})

ProcessingSteps.displayName = 'ProcessingSteps'
