import { memo } from 'react'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'

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
  optimize: { label: 'Preparing photo', description: 'Resizing on your device' },
  upload: { label: 'Reading spines', description: 'Finding every title on the shelf' },
  enrich: { label: 'Finding books', description: 'Matching covers and details' }
} as const

export const ProcessingSteps = memo<ProcessingStepsProps>(({ stepState, currentMessage, progress, imagePreview }) => {
  const keys = Object.keys(stepState) as StepKey[]
  const activeStep = keys.find(key => stepState[key] === 'active')
  const activeStepConfig = activeStep ? stepConfig[activeStep] : null
  const announcementText = currentMessage ||
    (activeStepConfig ? `${activeStepConfig.label}: ${activeStepConfig.description}` : 'Processing your photo…')

  return (
    <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcementText}
        {progress !== undefined && ` ${progress}%`}
      </div>

      {imagePreview && (
        <div className="relative h-40 sm:h-auto sm:w-40 shrink-0 overflow-hidden rounded-lg bg-muted">
          <img src={imagePreview} alt="Your shelf photo" className="h-full w-full object-cover" />
          <div className="scan-sweep absolute inset-x-0 h-1/3" aria-hidden="true" />
        </div>
      )}

      <div className="flex-1 space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Scanning your shelf</h2>
          <p className="text-sm text-muted-foreground">{currentMessage || activeStepConfig?.description || 'Starting…'}</p>
        </div>

        <ol className="space-y-2.5">
          {keys.map((key) => {
            const status = stepState[key]
            const config = stepConfig[key]
            return (
              <li key={key} className="flex items-center gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center" aria-hidden="true">
                  {status === 'done' && <CheckCircle2 className="h-5 w-5 text-success" />}
                  {status === 'active' && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
                  {status === 'pending' && <Circle className="h-5 w-5 text-border" />}
                </span>
                <span className={cn(status === 'pending' ? 'text-muted-foreground' : 'text-foreground', status === 'active' && 'font-medium')}>
                  {config.label}
                </span>
                <span className="sr-only">{status === 'done' ? '(done)' : status === 'active' ? '(in progress)' : '(waiting)'}</span>
              </li>
            )
          })}
        </ol>

        {progress !== undefined && (
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Scan progress"
          >
            <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </div>
  )
})

ProcessingSteps.displayName = 'ProcessingSteps'
