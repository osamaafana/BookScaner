import React, { memo } from 'react'
import { Upload, Brain, Zap, Camera } from 'lucide-react'
import { Button } from './ui/Button'
import { Card, CardContent } from './ui/Card'
import { cn } from '../lib/utils'

interface UploadCardProps {
  dragOver: boolean
  isUploading: boolean
  onFileSelect: () => void
  onStartCamera: () => void
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  cameraButtonRef?: React.RefObject<HTMLButtonElement | null>
}

const MAX_FILE_MB = 10

export const UploadCard = memo<UploadCardProps>(({
  dragOver,
  isUploading,
  onFileSelect,
  onStartCamera,
  onDrop,
  onDragOver,
  onDragLeave,
  onKeyDown,
  cameraButtonRef
}) => {
  // Don't render anything when uploading
  if (isUploading) return null

  return (
    <div className="w-full mx-auto">
      <Card className={cn(
        "relative overflow-hidden transition-all duration-700",
        "bg-gradient-to-br from-card/90 via-card to-primary/10",
        "border-2 backdrop-blur-sm",
        dragOver
          ? "border-primary bg-gradient-to-br from-primary/20 to-blue-500/20 scale-[1.02] shadow-2xl shadow-primary/25"
          : "border-border/50 hover:border-primary/60 hover:shadow-xl",
        isUploading && "border-primary shadow-2xl shadow-primary/30"
      )}>
        {/* Animated border effect */}
        {(dragOver || isUploading) && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary via-blue-500 to-purple-500 p-[2px]">
            <div className="w-full h-full rounded-lg bg-card"></div>
          </div>
        )}

        <CardContent className="p-8 relative z-10">
          <div
            className="text-center cursor-pointer group"
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={onFileSelect}
            role="button"
            tabIndex={0}
            onKeyDown={onKeyDown}
          >
            <div className="space-y-6">
              {/* Enhanced Upload Icon */}
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-blue-500/20 animate-pulse"></div>
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/10 to-transparent"></div>
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center border-2 border-primary/30 group-hover:scale-110 transition-all duration-500">
                  <div className="relative">
                    <Upload className="h-12 w-12 text-primary group-hover:text-blue-400 transition-colors" />
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center opacity-80">
                      <Brain className="h-2.5 w-2.5 text-white animate-pulse" />
                    </div>
                  </div>
                </div>
                {/* Floating particles */}
                <div className="absolute top-8 right-4 w-2 h-2 bg-blue-400/60 rounded-full animate-bounce"></div>
                <div className="absolute bottom-8 left-4 w-1.5 h-1.5 bg-purple-400/60 rounded-full animate-ping"></div>
              </div>

              {/* Enhanced Text */}
              <div className="space-y-4">
                <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                  Upload Your Bookshelf Image
                </h2>
              </div>

              {/* Enhanced Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="gap-3 px-8 py-4 text-base font-semibold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                  onClick={(e) => { e.stopPropagation(); onFileSelect() }}
                >
                  <Upload className="h-5 w-5" />
                  AI Scanner
                </Button>
                <Button
                  ref={cameraButtonRef}
                  variant="outline"
                  size="lg"
                  className="gap-3 px-8 py-4 text-base font-semibold border-2 border-primary/40 hover:border-primary hover:bg-primary/10 hover:scale-105 transition-all duration-300"
                  onClick={(e) => { e.stopPropagation(); onStartCamera() }}
                >
                  <Camera className="h-5 w-5" />
                  Live Capture
                </Button>
              </div>

              {/* Enhanced File Info */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>JPG, PNG, WebP, HEIC</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-2">
                    <Zap className="h-3 w-3 text-blue-400" />
                    <span>Auto-optimize to {MAX_FILE_MB}MB</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-2">
                    <Brain className="h-3 w-3 text-purple-400" />
                    <span>Dual AI providers</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

UploadCard.displayName = 'UploadCard'
