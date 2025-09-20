import { Camera, BookOpen, Sparkles } from 'lucide-react'

export function FeaturesGrid() {
  return (
    <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
      <div className="text-center group">
        <div className="relative mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300 shadow-lg">
            <Camera className="h-8 w-8 text-white" />
          </div>
          <div className="absolute -inset-4 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
        </div>
        <h3 className="text-xl font-bold text-foreground mb-3">AI-Powered Recognition</h3>
        <p className="text-muted-foreground leading-relaxed">
          Our advanced computer vision technology accurately identifies book spines, even with challenging lighting or angles.
        </p>
      </div>

      <div className="text-center group">
        <div className="relative mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300 shadow-lg">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <div className="absolute -inset-4 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
        </div>
        <h3 className="text-xl font-bold text-foreground mb-3">Instant Metadata</h3>
        <p className="text-muted-foreground leading-relaxed">
          Automatically enriches your books with covers, descriptions, ratings, and detailed information from trusted sources.
        </p>
      </div>

      <div className="text-center group">
        <div className="relative mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300 shadow-lg">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <div className="absolute -inset-4 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
        </div>
        <h3 className="text-xl font-bold text-foreground mb-3">Smart Recommendations</h3>
        <p className="text-muted-foreground leading-relaxed">
          Discover your next favorite read with personalized recommendations based on your unique collection and reading preferences.
        </p>
      </div>
    </div>
  )
}
