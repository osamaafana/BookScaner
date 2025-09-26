import React from 'react'

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number[]> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // Measure function execution time
  measure(name: string, fn: () => void | Promise<void>): void {
    const start = performance.now()
    const result = fn()

    if (result instanceof Promise) {
      result.finally(() => {
        const end = performance.now()
        this.recordMetric(name, end - start)
      })
    } else {
      const end = performance.now()
      this.recordMetric(name, end - start)
    }
  }

  // Record a metric
  private recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(value)

    // Keep only last 100 measurements
    if (this.metrics.get(name)!.length > 100) {
      this.metrics.get(name)!.shift()
    }

    // Log slow operations in development
    if (import.meta.env.DEV && value > 100) {
      console.warn(`Slow operation: ${name} took ${value.toFixed(2)}ms`)
    }
  }

  // Get metrics for a specific operation
  getMetrics(name: string): { avg: number; min: number; max: number; count: number } | null {
    const values = this.metrics.get(name)
    if (!values || values.length === 0) return null

    return {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    }
  }

  // Get all metrics
  getAllMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {}

    for (const [name, values] of this.metrics.entries()) {
      if (values.length > 0) {
        result[name] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        }
      }
    }

    return result
  }

  // Reset metrics
  reset(): void {
    this.metrics.clear()
  }
}

// React hook for performance monitoring
export function usePerformanceMonitoring() {
  const monitor = PerformanceMonitor.getInstance()

  const measure = (name: string, fn: () => void | Promise<void>) => {
    monitor.measure(name, fn)
  }

  const getMetrics = (name: string) => monitor.getMetrics(name)
  const getAllMetrics = () => monitor.getAllMetrics()
  const reset = () => monitor.reset()

  return { measure, getMetrics, getAllMetrics, reset }
}

// Memory usage monitoring
export function getMemoryUsage(): { used: number; total: number; limit: number } | null {
  // @ts-ignore - performance.memory is not in all browsers
  const memory = performance.memory
  if (!memory) return null

  return {
    used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
    total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
    limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) // MB
  }
}

// Bundle size monitoring
export function getBundleSize(): { main: number; vendors: number; total: number } {
  // This would need to be populated by the build process
  // For now, return estimates
  return {
    main: 0,
    vendors: 0,
    total: 0
  }
}

// React component for performance display (development only)
export const PerformanceDisplay: React.FC = () => {
  const [isVisible, setIsVisible] = React.useState(false)
  const [metrics, setMetrics] = React.useState<Record<string, any>>({})
  const monitor = PerformanceMonitor.getInstance()

  React.useEffect(() => {
    const updateMetrics = () => {
      setMetrics(monitor.getAllMetrics())
    }

    if (isVisible) {
      updateMetrics()
      const interval = setInterval(updateMetrics, 1000)
      return () => clearInterval(interval)
    }
  }, [isVisible, monitor])

  if (!import.meta.env.DEV) return null

  const children = [
    <button
      key="perf-button"
      onClick={() => setIsVisible(!isVisible)}
      className="bg-black/80 text-white px-3 py-1 rounded text-sm"
    >
      {`Perf: ${Object.keys(metrics).length} metrics`}
    </button>
  ] as const

  if (isVisible) {
    const metricsElements = Object.entries(metrics).map(([name, data]) => (
      <div key={`${name}-container`} className="mb-2 text-sm">
        <div key={`${name}-name`} className="font-mono">{name}</div>
        <div key={`${name}-data`} className="text-gray-300">
          {`Avg: ${data.avg.toFixed(1)}ms | Max: ${data.max.toFixed(1)}ms | Count: ${data.count}`}
        </div>
      </div>
    ))

    const memoryElement = (
      <div className="mt-4 pt-2 border-t border-gray-600">
        <div className="text-sm">
          {`Memory: ${JSON.stringify(getMemoryUsage(), null, 2)}`}
        </div>
      </div>
    )

    children.push(
      <div key="metrics-panel" className="bg-black/90 text-white p-4 rounded mt-2 max-w-md max-h-96 overflow-auto">
        <h3 key="metrics-title" className="font-bold mb-2">Performance Metrics</h3>
        {metricsElements}
        {memoryElement}
      </div>
    )
  }

  return <div className="fixed bottom-4 right-4 z-50">{children}</div>
}
