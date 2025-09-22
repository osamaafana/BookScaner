// AI Testing Section - Lazy-loaded component for sample image testing
import { Zap } from 'lucide-react'
import { Button } from './ui/Button'
import { Card, CardContent } from './ui/Card'

interface AITestingSectionProps {
  onSampleSelect: (sample: { name: string; image: string; index: number }) => Promise<void>
}

export function AITestingSection({ onSampleSelect }: AITestingSectionProps) {
  const samples = [
    { name: 'Small Shelf', desc: 'Compact collection test', image: '/static/img/small_shelf.jpg' },
    { name: 'Jungle Book', desc: 'Single book detection', image: '/static/img/jungle_book.jpg' },
    { name: 'Mixed Images', desc: 'Various book formats', image: '/static/img/images (1).jpeg' },
    { name: 'High Res WebP', desc: 'Modern format test', image: '/static/img/2560.webp' },
    { name: 'Large WebP', desc: 'High resolution test', image: '/static/img/81uBUxgLS1L_2048x2048.webp' }
  ]

  return (
    <div className="mt-20 max-w-6xl mx-auto text-center">
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-primary/30">
            <Zap className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-semibold text-primary">AI Testing Suite</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
            Experience AI Vision Intelligence
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            No bookshelf ready? Test our models with a sample datasets.
            Each sample showcases different AI recognition capabilities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 pt-8">
          {samples.map((sample, index) => (
            <Card key={sample.name} className="group relative overflow-hidden border border-primary/20 bg-gradient-to-br from-card/80 to-primary/5 hover:border-primary/40 hover:scale-105 transition-all duration-300 cursor-pointer">
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Image Preview */}
                  <div className="relative">
                    <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted/30">
                      <img
                        src={sample.image}
                        alt={sample.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/placeholder-book.svg'
                        }}
                      />
                    </div>
                    {/* Overlay gradient for better text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg"></div>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{sample.name}</h3>
                    <p className="text-sm text-muted-foreground">{sample.desc}</p>
                  </div>
                  <Button
                    className="w-full gap-2 bg-gradient-to-r from-primary/80 to-blue-600/80 hover:from-primary hover:to-blue-600 transition-all duration-300"
                    onClick={() => onSampleSelect({ ...sample, index })}
                  >
                    <Zap className="h-4 w-4" />
                    Deploy AI Test
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
