import { memo } from 'react'
import { CheckCircle2, Brain, Eye, Layers, Cpu, Zap } from 'lucide-react'
import { cn } from '../lib/utils'

type StepKey = 'optimize' | 'upload' | 'analyze' | 'extract' | 'enrich'
type StepState = Record<StepKey, 'pending' | 'active' | 'done'>

interface ProcessingStepsProps {
  stepState: StepState
  currentMessage?: string
  progress?: number
}

// Step configuration for rendering
const stepConfig = {
  optimize: { label: 'Optimizing', icon: Layers, description: 'Enhancing image quality' },
  upload: { label: 'Uploading', icon: Zap, description: 'Secure transfer to AI servers' },
  analyze: { label: 'Vision AI', icon: Eye, description: 'Computer vision analysis' },
  extract: { label: 'Text OCR', icon: Brain, description: 'Extracting readable text' },
  enrich: { label: 'Enriching', icon: Cpu, description: 'Matching book metadata' }
} as const

export const ProcessingSteps = memo<ProcessingStepsProps>(({ stepState, currentMessage, progress }) => {
  // Get the current active step for announcements
  const activeStep = (Object.keys(stepState) as StepKey[]).find(key => stepState[key] === 'active')
  const activeStepConfig = activeStep ? stepConfig[activeStep] : null

  // Create announcement text
  const announcementText = currentMessage ||
    (activeStepConfig ? `${activeStepConfig.label}: ${activeStepConfig.description}` : 'Processing your image...')

  const progressText = progress !== undefined ? `Progress: ${progress}%` : ''

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
      {/* Enhanced AI Processing Steps */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-r from-card/50 to-card/80 rounded-2xl p-6 backdrop-blur-sm border border-primary/20">
          <h3 className="text-lg font-semibold text-center mb-6 text-foreground">Books Detection Pipeline</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {(Object.keys(stepState) as StepKey[]).map((key) => {
              const status = stepState[key]
              const config = stepConfig[key]
              const Icon = config.icon
              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-xl transition-all duration-500 min-w-[140px]",
                    status === 'active' && "bg-gradient-to-r from-primary/20 to-blue-500/20 scale-105",
                    status === 'done' && "bg-gradient-to-r from-green-500/20 to-emerald-500/20",
                    status === 'pending' && "bg-muted/30"
                  )}
                >
                  <div className="flex-shrink-0">
                    {status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {status === 'active' && <Icon className="h-4 w-4 text-primary animate-pulse" />}
                    {status === 'pending' && <Icon className="h-4 w-4 text-muted-foreground opacity-50" />}
                  </div>
                  <div className="flex-1 text-center">
                    <div className={cn(
                      "font-medium text-xs",
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
              <Brain className="h-5 w-5 text-white animate-pulse" />
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
