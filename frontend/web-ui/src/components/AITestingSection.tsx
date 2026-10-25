// Sample photos for people without a shelf nearby (lazy-loaded)
import { Card } from './ui/Card'

interface AITestingSectionProps {
  onSampleSelect: (sample: { name: string; image: string; index: number }) => Promise<void>
}

export function AITestingSection({ onSampleSelect }: AITestingSectionProps) {
  const samples = [
    { name: 'Small shelf', desc: 'A dozen mixed spines', image: '/static/img/small_shelf.jpg' },
    { name: 'Single book', desc: 'One cover, close up', image: '/static/img/jungle_book.jpg' },
    { name: 'Mixed stack', desc: 'Different sizes and angles', image: '/static/img/images (1).jpeg' },
    { name: 'Bookcase', desc: 'High-resolution photo', image: '/static/img/2560.webp' },
    { name: 'Full wall', desc: 'Many books at once', image: '/static/img/81uBUxgLS1L_2048x2048.webp' }
  ]

  return (
    <section aria-labelledby="samples-heading" className="space-y-4">
      <div className="space-y-1">
        <h2 id="samples-heading" className="text-lg font-semibold text-foreground">Sample photos</h2>
        <p className="text-sm text-muted-foreground">Pick one to run a real scan on it.</p>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {samples.map((sample, index) => (
          <li key={sample.name}>
            <Card className="overflow-hidden">
              <button
                type="button"
                onClick={() => onSampleSelect({ ...sample, index })}
                className="block w-full text-left transition-colors hover:bg-secondary"
              >
                <div className="aspect-[4/3] w-full bg-muted">
                  <img
                    src={sample.image}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/placeholder-book.svg'
                    }}
                  />
                </div>
                <div className="p-3">
                  <span className="block text-sm font-medium text-foreground">{sample.name}</span>
                  <span className="block text-xs text-muted-foreground">{sample.desc}</span>
                </div>
              </button>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}
